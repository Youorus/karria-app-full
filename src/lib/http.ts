/**
 * Le client HTTP, et le mécanisme qui garde l'utilisateur connecté.
 *
 * ═══ Ce qu'il fait à chaque appel ═══
 *
 * Préfixer l'URL, joindre le jeton d'accès, traduire une erreur en objet
 * exploitable. Et, si le jeton a expiré : le renouveler et rejouer la
 * requête — sans que l'écran appelant en sache rien.
 *
 * ═══ Le verrou de rafraîchissement, et pourquoi il est vital ═══
 *
 * Le serveur fait **tourner** le jeton de rafraîchissement : à chaque
 * usage il en émet un nouveau et invalide l'ancien. Réutiliser un jeton
 * déjà consommé est la signature d'un vol, et le serveur coupe alors
 * toutes les sessions.
 *
 * Or un écran qui charge trois listes lance trois requêtes à la fois. Si
 * les trois expirent ensemble, trois rafraîchissements partent avec le
 * **même** jeton : le premier passe, les deux autres sont vus comme une
 * réutilisation — et l'utilisateur est déconnecté de partout, précisément
 * ce qu'on veut rendre impossible.
 *
 * D'où `enCours` : le premier appel qui découvre l'expiration lance le
 * rafraîchissement, les autres attendent la même promesse. Un seul jeton
 * est consommé.
 *
 * ═══ Une seule reprise, jamais deux ═══
 *
 * Si la requête rejouée échoue encore en 401, on abandonne. Boucler
 * masquerait une panne serveur derrière un écran qui tourne indéfiniment.
 */

import { API_URL, SIMULATION } from "@/lib/config";
import { enAvanceSurLeBackend, repondreEnSimulation } from "@/lib/dev/serveur-simule";
import { ecrireJetons, lireJetons, oublierSession, type Jetons } from "@/lib/session";

/** Au-delà, l'utilisateur croit que l'application est bloquée. */
const DELAI_MS = 12_000;

/**
 * Une erreur venue de l'API, avec de quoi décider quoi afficher.
 *
 * `raison` est le code stable du serveur — `auth_login_code_resend_too_soon`,
 * `auth_code_invalid`. C'est lui qui permet de dire à l'utilisateur quoi
 * faire ; le message, lui, est déjà rédigé pour être lu.
 *
 * `champ` désigne l'entrée fautive quand il y en a une : c'est ce qui
 * permet d'afficher l'erreur **sous le champ concerné** plutôt qu'en haut
 * de l'écran, où elle oblige à deviner.
 */
export class ErreurApi extends Error {
  constructor(
    message: string,
    readonly statut: number,
    readonly raison?: string,
    readonly champ?: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ErreurApi";
  }

  /** Vrai si rien n'est parti : l'action se retente à l'identique. */
  get estReseau(): boolean {
    return this.statut === 0;
  }
}

interface CorpsErreur {
  error?: {
    code?: string;
    message?: string;
    details?: { reason?: string; field?: string } & Record<string, unknown>;
  };
}

/** Ce que le serveur renvoie quand une session s'ouvre ou se renouvelle. */
export interface SessionBrute {
  access_token: string;
  refresh_token: string;
}

export function versJetons(brute: SessionBrute): Jetons {
  return { acces: brute.access_token, rafraichissement: brute.refresh_token };
}

// ─────────────────────────────────────────────────────────────────────
// Le rafraîchissement
// ─────────────────────────────────────────────────────────────────────

/** Le rafraîchissement en cours, s'il y en a un. Voir l'en-tête. */
let enCours: Promise<Jetons | null> | null = null;

/** Prévenu quand la session tombe pour de bon, pour renvoyer à l'accueil. */
let surDeconnexion: (() => void) | null = null;

export function auMomentDeLaDeconnexion(rappel: () => void): void {
  surDeconnexion = rappel;
}

async function rafraichir(): Promise<Jetons | null> {
  enCours ??= (async () => {
    try {
      const jetons = await lireJetons();
      if (jetons === null) {
        return null;
      }

      // Par `envoyer` et non par un `fetch` direct : le rafraîchissement
      // doit, lui aussi, passer par le faux serveur en simulation.
      const reponse = await envoyer(
        "/auth/refresh",
        { method: "POST", body: { refresh_token: jetons.rafraichissement } },
        null,
      );

      if (!reponse.ok) {
        // Le serveur a refusé le jeton : révoqué, périmé, ou réutilisation
        // détectée. Dans les trois cas la session est finie ; garder des
        // jetons morts ferait échouer chaque requête suivante en silence.
        await oublierSession();
        surDeconnexion?.();
        return null;
      }

      const nouveaux = versJetons((await reponse.json()) as SessionBrute);
      await ecrireJetons(nouveaux);
      return nouveaux;
    } catch {
      // Panne réseau : surtout **ne pas** effacer la session. L'utilisateur
      // est dans le métro, pas déconnecté — l'appel échouera, il réessaiera
      // plus tard avec ses jetons intacts.
      return null;
    } finally {
      enCours = null;
    }
  })();

  return enCours;
}

// ─────────────────────────────────────────────────────────────────────
// L'appel
// ─────────────────────────────────────────────────────────────────────

interface Options {
  method?: string;
  body?: unknown;
  /** Faux pour les routes de connexion : elles n'ont pas de session. */
  authentifie?: boolean;
  /**
   * Vrai quand `body` est un `FormData`.
   *
   * ⚠️ Il ne suffit pas de passer un `FormData` : il faut aussi **ne pas
   * poser `Content-Type`**. L'en-tête multipart contient une frontière
   * (`boundary=…`) générée à l'envoi, que seul le moteur connaît. Un
   * `Content-Type: multipart/form-data` écrit à la main est donc toujours
   * incomplet, et le serveur rejette le corps sans pouvoir dire pourquoi.
   */
  formulaire?: boolean;
}

async function envoyer(chemin: string, options: Options, jeton: string | null) {
  // Le faux serveur s'interpose **ici**, au plus bas : tout ce qui est
  // au-dessus — reprise après expiration, lecture des erreurs, couche
  // `api/` — s'exécute à l'identique en simulation et en réel. Basculer
  // vers le vrai backend ne change donc aucune ligne hors de `.env`.
  // Même en mode réel, les routes que le contrat définit **avant** que le
  // backend ne les serve (le brouillon de CV) passent par lui, en
  // développement seulement — `lib/dev/` est absent des paquets de
  // production.
  if (SIMULATION || (__DEV__ && enAvanceSurLeBackend(chemin))) {
    return repondreEnSimulation({
      chemin,
      methode: options.method ?? "GET",
      // Le formulaire est fabriqué pour lui aussi : la simulation de la
      // photo de CV lit l'image choisie.
      corps:
        options.formulaire === true ? (options.body as () => FormData)() : options.body,
      jeton,
    });
  }
  const entetes = {
    ...(options.formulaire === true ? {} : { "Content-Type": "application/json" }),
    ...(jeton === null ? {} : { Authorization: `Bearer ${jeton}` }),
  };
  if (options.formulaire === true) {
    return envoyerMultipart(
      `${API_URL}${chemin}`,
      options.method ?? "POST",
      entetes,
      (options.body as () => FormData)(),
    );
  }
  const controleur = new AbortController();
  const echeance = setTimeout(() => controleur.abort(), DELAI_MS);
  try {
    return await fetch(`${API_URL}${chemin}`, {
      method: options.method ?? "GET",
      headers: entetes,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controleur.signal,
      // `no-store` explicite. Le serveur ne pose aucun en-tête de cache
      // sur ces routes, et URLSession applique alors une heuristique
      // maison : sur simulateur, une liste de résultats est restée
      // affichée avec d'anciens libellés alors que l'API rendait les
      // nouveaux — vérifié en confrontant l'écran à un appel direct.
      //
      // Une recherche n'a de toute façon rien à mettre en cache : sa
      // réponse dépend de qui demande, d'où il est, et de ce qui a été
      // publié dans la minute.
      cache: "no-store",
    });
  } finally {
    clearTimeout(echeance);
  }
}

/**
 * Envoie un formulaire multipart par `XMLHttpRequest`, pas par `fetch`.
 *
 * Constaté le 2026-11-04 sur le simulateur : depuis le SDK 57, le `fetch`
 * global est celui d'Expo (« winter »), et son encodeur de `FormData`
 * n'accepte que des chaînes, des `Blob` et des `File` — la forme
 * `{ uri, name, type }` qui désigne un fichier local lève
 * « Unsupported FormDataPart implementation ». Tous les envois de fichiers
 * de l'app (photo du CV, import, médias de l'équipe) passaient par là et
 * échouaient avant de partir. Le `XMLHttpRequest` de React Native, lui,
 * lit cette forme nativement et diffuse le fichier sans le charger en
 * mémoire. On rend une `Response` pour que la suite — lecture des erreurs,
 * reprise après session expirée — ne change pas.
 *
 * Le formulaire est **refabriqué** à chaque envoi (d'où la fonction) : un
 * corps ne se consomme qu'une fois, et la reprise après expiration de la
 * session repartirait sinon avec un fichier vide.
 */
function envoyerMultipart(
  url: string,
  methode: string,
  entetes: Record<string, string>,
  formulaire: FormData,
): Promise<Response> {
  return new Promise((resoudre, rejeter) => {
    const requete = new XMLHttpRequest();
    requete.open(methode, url);
    requete.timeout = DELAI_MS;
    for (const [nom, valeur] of Object.entries(entetes))
      requete.setRequestHeader(nom, valeur);
    requete.onload = () => {
      const lignes = requete
        .getAllResponseHeaders()
        .split("\r\n")
        .filter((l) => l.includes(":"));
      const headers = new Headers();
      for (const ligne of lignes) {
        const i = ligne.indexOf(":");
        headers.append(ligne.slice(0, i).trim(), ligne.slice(i + 1).trim());
      }
      // Un 204 n'a pas de corps : `Response` refuse un corps non nul avec ce statut.
      const corps =
        requete.status === 204 || requete.responseText === ""
          ? null
          : requete.responseText;
      resoudre(new Response(corps, { status: requete.status, headers }));
    };
    requete.onerror = () => rejeter(new TypeError("Network request failed"));
    requete.ontimeout = () => rejeter(new DOMException("Délai dépassé", "AbortError"));
    requete.send(formulaire);
  });
}

/**
 * Transforme une panne de transport en erreur lisible, sans perdre la cause.
 *
 * Le message reste le même pour l'utilisateur — il n'a que faire d'un
 * `TypeError` — mais la cause part dans les journaux avec l'URL visée.
 * C'est ce qui distingue « le téléphone est hors ligne » de « l'adresse
 * de l'API est fausse », deux pannes qui se ressemblent à l'écran et
 * n'ont rien à voir.
 */
function erreurReseau(chemin: string, cause: unknown): ErreurApi {
  const detail =
    cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
  console.warn(`[karria] échec réseau sur ${API_URL}${chemin} — ${detail}`);
  return new ErreurApi(
    "Connexion impossible. Vérifiez votre réseau, puis réessayez.",
    0,
    "reseau_injoignable",
  );
}

async function lireErreur(reponse: Response): Promise<ErreurApi> {
  const corps = (await reponse.json().catch(() => null)) as CorpsErreur | null;
  const erreur = corps?.error;
  return new ErreurApi(
    // Le message du serveur d'abord : il est déjà rédigé pour être lu par
    // quelqu'un. En recomposer un ici le ferait diverger au premier
    // ajustement de ton, et c'est l'utilisateur qui lirait la version
    // périmée.
    erreur?.message ?? "Le service est momentanément indisponible.",
    reponse.status,
    erreur?.details?.reason,
    erreur?.details?.field,
    erreur?.details ?? {},
  );
}

async function appeler<T>(chemin: string, options: Options = {}): Promise<T> {
  const authentifie = options.authentifie ?? true;

  let jeton: string | null = null;
  if (authentifie) {
    jeton = (await lireJetons())?.acces ?? null;
  }

  let reponse: Response;
  try {
    reponse = await envoyer(chemin, options, jeton);
  } catch (cause) {
    // Réseau coupé, délai dépassé, DNS : rien n'est parti. C'est une
    // information *différente* d'un refus du serveur, et l'interface doit
    // pouvoir les distinguer — « réessayez » n'est utile que dans ce cas.
    //
    // Mais la **cause** ne se jette pas. Sans elle, « connexion
    // impossible » couvre indistinctement un avion en mode avion, un
    // certificat refusé, un délai dépassé et une URL malformée — et l'on
    // cherche pendant une heure ce qu'une ligne de journal aurait dit.
    throw erreurReseau(chemin, cause);
  }

  // Une seule reprise, et seulement pour une session expirée.
  if (reponse.status === 401 && authentifie && jeton !== null) {
    const renouveles = await rafraichir();
    if (renouveles !== null) {
      try {
        reponse = await envoyer(chemin, options, renouveles.acces);
      } catch (cause) {
        throw erreurReseau(chemin, cause);
      }
    }
  }

  if (reponse.status === 204) {
    return undefined as T;
  }
  if (!reponse.ok) {
    throw await lireErreur(reponse);
  }
  return (await reponse.json()) as T;
}

export const http = {
  // `options` sur le `get` aussi : certaines lectures sont publiques — le
  // référentiel des aéroports, la recherche d'un visiteur. Y joindre un
  // jeton périmé provoquerait un 401 puis une tentative de
  // rafraîchissement, sur un appel qui n'en a nul besoin.
  get: <T>(chemin: string, options: Omit<Options, "method" | "body"> = {}) =>
    appeler<T>(chemin, options),
  post: <T>(
    chemin: string,
    body?: unknown,
    options: Omit<Options, "method" | "body"> = {},
  ) => appeler<T>(chemin, { ...options, method: "POST", body }),
  patch: <T>(chemin: string, body?: unknown) =>
    appeler<T>(chemin, { method: "PATCH", body }),
  /** `PUT` remplace la ressource entière, là où `PATCH` en corrige un
   *  morceau. Les préférences de notification s'écrivent d'un bloc : ce
   *  qui n'est pas dans la liste est refusé, et un `PATCH` laisserait
   *  croire qu'on peut n'en changer qu'une. */
  put: <T>(chemin: string, body?: unknown) => appeler<T>(chemin, { method: "PUT", body }),
  /**
   * Envoie un formulaire multipart — la seule façon de déposer un fichier.
   *
   * `fabriquer` est une **fonction**, pas un objet : voir le commentaire
   * dans `envoyer`. Un corps déjà consommé ne peut pas être renvoyé.
   */
  postFormulaire: <T>(chemin: string, fabriquer: () => FormData) =>
    appeler<T>(chemin, { method: "POST", body: fabriquer, formulaire: true }),
  /**
   * Remplace un fichier déjà déposé.
   *
   * `PUT` et non `POST` : on ne crée pas une seconde pièce, on pose une
   * nouvelle **version** de celle qui existe. Le serveur garde
   * l'ancienne, marquée « remplacée » — c'est elle qui explique la
   * décision d'un opérateur en cas de contestation.
   */
  putFormulaire: <T>(chemin: string, fabriquer: () => FormData) =>
    appeler<T>(chemin, { method: "PUT", body: fabriquer, formulaire: true }),
  /**
   * Supprime une ressource.
   *
   * Sans retour par défaut : les routes de suppression du projet répondent
   * presque toutes `204`, et attendre un JSON là où il n'y en a pas ferait
   * échouer un appel qui a réussi. Le retrait du consentement à l'IA, lui,
   * rend l'état qui en résulte : on nomme alors le type attendu.
   *
   * Le corps est facultatif. Une seule route s'en sert — la suppression du
   * compte, qui emporte la raison du départ (`docs/contrat-api-compte.md`).
   * Un `DELETE` avec corps est licite en HTTP et `fetch` l'envoie ; c'est
   * plus juste qu'un `POST /auth/me/delete` qui cacherait le verbe.
   */
  delete: <T = void>(chemin: string, body?: unknown) =>
    appeler<T>(chemin, { method: "DELETE", body }),
};
