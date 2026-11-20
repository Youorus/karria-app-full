/**
 * Quand a-t-on le droit de demander une note sur le magasin ? — les règles,
 * pures : ni horloge, ni stockage, ni module natif.
 *
 * ═══ Le principe ═══
 *
 * L'invite du système (`SKStoreReviewController`, In-App Review de Google)
 * est rare et précieuse : Apple n'en montre que trois par an, et la refuse
 * sans le dire. On ne la demande donc qu'à quelqu'un qui **vient de réussir
 * quelque chose**, qui connaît déjà l'app, et dont la session s'est passée
 * sans accroc. Jamais de pré-question (« tu aimes Karria ? ») ni de bouton
 * qui conditionne l'invite : Apple l'interdit (règle 5.6.1 / 1.1.7), et la
 * note ne vaudrait rien.
 *
 * ═══ Les conditions, toutes à la fois ═══
 *
 * - au moins trois sessions, sur deux jours distincts au moins ;
 * - au moins deux succès cumulés (export partagé, e-mail accepté,
 *   candidature marquée, CV importé, offre gardée à partir de la deuxième) ;
 * - aucune erreur d'API gênante ni quota `429` dans la session en cours ;
 * - pas d'écran de mise à jour bloquant ;
 * - pas dans la session où le consentement publicitaire (UMP, ATT) vient
 *   d'être montré ;
 * - pas juste après une proposition d'abonnement (une sollicitation à la
 *   fois) : dix minutes d'écart.
 *
 * ═══ Les plafonds ═══
 *
 * Une demande par version de l'app ; soixante jours au moins entre deux
 * demandes ; trois par 365 jours glissants. « Demande » : l'appel fait au
 * système — qu'il ait montré l'invite ou non, on ne le sait pas.
 *
 * ═══ L'état retenu ═══
 *
 * Quelques compteurs et, au plus, trois dates : il tient largement dans le
 * magasin local (`lib/magasin-local.ts`, qui tolère mal plus de 2 Ko).
 */

export const SESSIONS_MINIMALES = 3;
export const JOURS_MINIMAUX = 2;
export const SUCCES_MINIMAUX = 2;
export const UN_JOUR_MS = 24 * 60 * 60 * 1000;
export const ECART_ENTRE_DEMANDES_MS = 60 * UN_JOUR_MS;
export const FENETRE_ANNUELLE_MS = 365 * UN_JOUR_MS;
export const DEMANDES_PAR_AN = 3;
/** Revenir après ce temps hors de l'app compte comme une nouvelle session. */
export const PAUSE_DE_SESSION_MS = 30 * 60 * 1000;
/** « Juste après » une proposition d'abonnement. */
export const ECART_APRES_PROPOSITION_MS = 10 * 60 * 1000;
/** L'attente entre le succès et la demande : 1,5 à 2 secondes. */
export const DELAI_DEMANDE_MS = 1_800;

/** Ce que l'app retient d'un lancement à l'autre. */
export interface EtatAvis {
  /** Les sessions comptées depuis l'installation. */
  sessions: number;
  /** Les deux derniers jours distincts (AAAA-MM-JJ, heure locale) où une session a compté. */
  jours: string[];
  /** Les succès confirmés, cumulés. */
  succes: number;
  /** Les offres gardées (signets confirmés par le serveur), cumulées. */
  offresGardees: number;
  /** Les instants (ms) des demandes des 365 derniers jours, du plus ancien au plus récent. */
  demandes: number[];
  /** La version de l'app lors de la dernière demande. */
  versionDemandee: string | null;
}

export const ETAT_VIDE: EtatAvis = {
  sessions: 0,
  jours: [],
  succes: 0,
  offresGardees: 0,
  demandes: [],
  versionDemandee: null,
};

function estUnCompteur(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0;
}

/** Le validateur du magasin local : un état abîmé vaut un état vide. */
export function estUnEtatAvis(v: unknown): v is EtatAvis {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Partial<EtatAvis>;
  return (
    estUnCompteur(e.sessions) &&
    estUnCompteur(e.succes) &&
    estUnCompteur(e.offresGardees) &&
    Array.isArray(e.jours) &&
    e.jours.every((j) => typeof j === "string") &&
    Array.isArray(e.demandes) &&
    e.demandes.every((d) => typeof d === "number" && Number.isFinite(d)) &&
    (e.versionDemandee === null || typeof e.versionDemandee === "string")
  );
}

/** « 2026-11-20 », à l'heure du téléphone : deux jours distincts pour la personne. */
export function jourLocal(instant: number): string {
  const d = new Date(instant);
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/**
 * Faut-il compter une nouvelle session ? Au lancement (`derniere` vaut
 * `null`), ou en revenant après une vraie pause.
 */
export function estUneNouvelleSession(
  derniere: number | null,
  maintenant: number,
): boolean {
  return derniere === null || maintenant - derniere >= PAUSE_DE_SESSION_MS;
}

export function compterSession(etat: EtatAvis, maintenant: number): EtatAvis {
  const jour = jourLocal(maintenant);
  const jours = etat.jours.includes(jour) ? etat.jours : [...etat.jours, jour].slice(-2);
  return { ...etat, sessions: etat.sessions + 1, jours };
}

/** Les succès qui peuvent précéder une demande. */
export type Succes =
  /** Un export partagé ou enregistré, confirmé par le système. */
  | "export"
  /** Un envoi par e-mail accepté par le serveur. */
  | "envoi"
  /** Une candidature marquée « envoyée ». */
  | "candidature"
  /** Un CV importé. */
  | "import"
  /** Une offre gardée — seulement à partir de la deuxième. */
  | "offre";

/**
 * Compte un succès. `compte` dit s'il peut déclencher une demande : la
 * première offre gardée est retenue, mais ce n'est pas encore un déclencheur.
 */
export function compterSucces(
  etat: EtatAvis,
  succes: Succes,
): { etat: EtatAvis; compte: boolean } {
  if (succes !== "offre") {
    return { etat: { ...etat, succes: etat.succes + 1 }, compte: true };
  }
  const offresGardees = etat.offresGardees + 1;
  if (offresGardees < 2) return { etat: { ...etat, offresGardees }, compte: false };
  return { etat: { ...etat, offresGardees, succes: etat.succes + 1 }, compte: true };
}

/** Retient une demande faite au système, et oublie celles de plus d'un an. */
export function noterDemande(
  etat: EtatAvis,
  version: string,
  maintenant: number,
): EtatAvis {
  return {
    ...etat,
    demandes: [
      ...etat.demandes.filter((d) => maintenant - d < FENETRE_ANNUELLE_MS),
      maintenant,
    ],
    versionDemandee: version,
  };
}

/**
 * Une erreur d'API qui a pu gâcher la session : panne de transport, panne
 * du serveur, plafond atteint, refus. Ne comptent pas les réponses qui font
 * partie du fonctionnement normal : la session expirée que le client
 * renouvelle (`401`), l'accord sur l'IA demandé avant une action (`403
 * ai_consent_required`), et « il n'y en a pas » (`404` : pas de brouillon,
 * route absente d'un serveur plus ancien).
 */
export function estUneErreurGenante(statut: number, raison?: string): boolean {
  if (statut === 0 || statut >= 500 || statut === 429) return true;
  if (statut === 401 || statut === 404) return false;
  if (statut === 403 && raison === "ai_consent_required") return false;
  return statut >= 400;
}

/** Ce qui s'est passé pendant la session en cours — en mémoire seulement. */
export interface ContexteAvis {
  /** La version de l'app (`app.json`). */
  version: string;
  /** Une erreur gênante ou un `429` depuis le début de la session. */
  erreurDansLaSession: boolean;
  /** L'écran de mise à jour obligatoire est affiché. */
  miseAJourBloquante: boolean;
  /** Le consentement publicitaire (UMP, ATT) a été montré ce lancement-ci. */
  consentementPubMontre: boolean;
  /** L'instant de la dernière proposition d'abonnement, ou `null`. */
  derniereProposition: number | null;
}

export type RefusAvis =
  | "sessions"
  | "jours"
  | "succes"
  | "erreur"
  | "mise-a-jour"
  | "consentement"
  | "proposition"
  | "version"
  | "ecart"
  | "plafond-annuel";

/** `null` : on peut demander. Sinon, la première raison de s'abstenir. */
export function refusDeDemander(
  etat: EtatAvis,
  contexte: ContexteAvis,
  maintenant: number,
): RefusAvis | null {
  if (etat.sessions < SESSIONS_MINIMALES) return "sessions";
  if (etat.jours.length < JOURS_MINIMAUX) return "jours";
  if (etat.succes < SUCCES_MINIMAUX) return "succes";
  if (contexte.erreurDansLaSession) return "erreur";
  if (contexte.miseAJourBloquante) return "mise-a-jour";
  if (contexte.consentementPubMontre) return "consentement";
  if (
    contexte.derniereProposition !== null &&
    maintenant - contexte.derniereProposition < ECART_APRES_PROPOSITION_MS
  )
    return "proposition";
  if (etat.versionDemandee === contexte.version) return "version";
  const derniere = etat.demandes[etat.demandes.length - 1];
  if (derniere !== undefined && maintenant - derniere < ECART_ENTRE_DEMANDES_MS)
    return "ecart";
  const dansLAnnee = etat.demandes.filter((d) => maintenant - d < FENETRE_ANNUELLE_MS);
  if (dansLAnnee.length >= DEMANDES_PAR_AN) return "plafond-annuel";
  return null;
}

export function peutDemander(
  etat: EtatAvis,
  contexte: ContexteAvis,
  maintenant: number,
): boolean {
  return refusDeDemander(etat, contexte, maintenant) === null;
}

/** Où noter Karria, quand la personne le demande elle-même (profil). */
export const FICHE_IOS = "https://apps.apple.com/app/id6776608930?action=write-review";
export const FICHE_ANDROID = "market://details?id=com.karria.app";
export const FICHE_ANDROID_REPLI =
  "https://play.google.com/store/apps/details?id=com.karria.app";

/** Les adresses à essayer, dans l'ordre, pour « Noter Karria ». */
export function adressesPourNoter(plateforme: string): string[] {
  return plateforme === "ios" ? [FICHE_IOS] : [FICHE_ANDROID, FICHE_ANDROID_REPLI];
}
