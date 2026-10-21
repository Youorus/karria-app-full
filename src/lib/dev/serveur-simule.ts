/**
 * Le faux serveur : il répond à la place du backend pendant sa
 * reconstruction.
 *
 * ═══ Ce qu'il est, et ce qu'il n'est pas ═══
 *
 * C'est le **contrat** du futur backend, écrit en exécutable : chaque
 * route ici est une route que le nouveau `karria_api` devra exposer, avec
 * la même forme de requête, la même forme de réponse et les mêmes codes
 * d'erreur. Quand le backend existera, on passe `EXPO_PUBLIC_API_MODE` à
 * `reel` et rien d'autre ne change : la couche `api/` de chaque domaine
 * parle déjà ce langage.
 *
 * Ce n'est **pas** une imitation de l'intelligence de Karria. Les réponses
 * de l'assistant sont des textes préparés, choisis par mots-clés, pour
 * concevoir l'expérience de conversation — pas pour en juger la qualité.
 *
 * ═══ Pourquoi il ne peut pas partir en production ═══
 *
 * Deux verrous indépendants. `SIMULATION` (lib/config.ts) exige `__DEV__`.
 * Et `metro.config.js` remplace tout module de `lib/dev/` par
 * `absent-en-production.ts` dans un paquet de production : même appelé
 * par erreur, ce fichier n'y est pas.
 *
 * ═══ Les conventions qu'il fige pour le backend ═══
 *
 * - Les erreurs suivent `{ error: { code, message, details: { reason, field } } }`,
 *   comme celles de `zoumani_api`, que `lib/http.ts` sait déjà lire.
 * - Le code de connexion est toujours `000000` en simulation.
 * - Aucune route ne demande ni ne renvoie de nom, de prénom ou de
 *   téléphone : l'inscription ne collecte plus que l'adresse e-mail.
 */

import { CIBLE_V2 } from "@/lib/config";

import { estUneRouteAppareil, repondreAppareils } from "./appareils-simule";
import { estUneRouteCv, repondreCv } from "./cv-simule";

/** Ce que `karria_api_v2` sert déjà. Le reste (offres, modèles,
 *  assistant) reste au faux serveur tant que ses modules n'existent pas :
 *  on retire une ligne de `enAvanceSurLeBackend` à chaque module livré. */
const SERVI_PAR_LA_V2 = ["/auth/", "/devices/", "/cv/", "/voice/"];

/** Les routes que le contrat définit avant que le backend visé ne les
 *  serve : `lib/http.ts` les confie au faux serveur même en mode réel (en
 *  développement seulement). Avec la v1, c'est le CV ; avec la v2, tout
 *  ce qu'elle ne sert pas encore. */
export function enAvanceSurLeBackend(chemin: string): boolean {
  if (CIBLE_V2) return !SERVI_PAR_LA_V2.some((p) => chemin.startsWith(p));
  return estUneRouteCv(chemin);
}

interface RequeteSimulee {
  chemin: string;
  methode: string;
  corps: unknown;
  jeton: string | null;
}

/** Le code qui ouvre toujours la session en simulation. */
export const CODE_SIMULATION = "000000";

/** Les raisons de départ que `DELETE /auth/me` accepte, et la longueur
 *  maximale du détail libre — `docs/contrat-api-compte.md`. Recopiées ici
 *  et non importées du domaine : le faux serveur est le contrat, il ne
 *  dépend pas de l'application qu'il sert. */
const RAISONS_DE_DEPART: readonly string[] = [
  "found_job",
  "no_matching_offers",
  "not_useful",
  "too_many_notifications",
  "privacy",
  "other",
];
const DETAILS_MAX = 1_000;

/** Le délai réseau imité. Sans lui, aucun état d'attente ne se verrait
 *  jamais à l'écran, et on livrerait des écrans jamais vus « en cours ». */
const LATENCE_MS = 650;
const LATENCE_ASSISTANT_MS = 1_400;

/** L'état du faux serveur. En mémoire : il repart à zéro à chaque
 *  rechargement de l'application, ce qui suffit à concevoir. */
const etat = {
  parcours: new Map<string, { email: string; essais: number }>(),
  sessions: new Map<string, { id: string; email: string }>(),
  conversations: new Map<string, number>(),
  signets: new Set<string>(),
  demandesDeResume: new Map<number, number>(),
  resumes: new Map<number, "pret">(),
};

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function identifiant(prefixe: string): string {
  return `${prefixe}_${Math.random().toString(36).slice(2, 10)}`;
}

function json(statut: number, corps: unknown): Response {
  return new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(
  statut: number,
  raison: string,
  message: string,
  details: Record<string, unknown> = {},
): Response {
  return json(statut, {
    error: { code: raison, message, details: { reason: raison, ...details } },
  });
}

function champ(corps: unknown, nom: string): unknown {
  return typeof corps === "object" && corps !== null
    ? (corps as Record<string, unknown>)[nom]
    : undefined;
}

/** Ouvre une session et rend sa forme réseau. */
function ouvrirSession(email: string, creee: boolean) {
  const acces = identifiant("acces");
  const compte = { id: identifiant("usr"), email };
  etat.sessions.set(acces, compte);
  return {
    session: { access_token: acces, refresh_token: identifiant("rafraichissement") },
    user: compte,
    created_account: creee,
  };
}

function parcoursOuvert(email: string) {
  const id = identifiant("chl");
  etat.parcours.set(id, { email, essais: 0 });
  return {
    challenge_id: id,
    sent_to: email,
    expires_in: 600,
    seconds_before_resend: 30,
  };
}

// ─────────────────────────────────────────────────────────────────────
// L'assistant
// ─────────────────────────────────────────────────────────────────────

/**
 * Des réponses préparées, de la première qui correspond à la dernière.
 * La dernière n'a pas de mot-clé : elle répond à tout le reste.
 */
const REPONSES: { motsCles: string[]; texte: string }[] = [
  {
    motsCles: ["alternance", "apprentissage", "apprenti"],
    texte:
      "Parfait, une alternance. Pour te proposer les bonnes offres chaque matin, dis-moi le métier visé, la ville, et ton rythme d'école si tu le connais déjà. Je m'occupe du reste.",
  },
  {
    motsCles: ["cdi", "cdd", "stage", "freelance", "intérim", "interim"],
    texte:
      "Noté pour le type de contrat. Quel métier, et dans quelle ville ou région ? Je ne te montrerai que des offres qui correspondent vraiment.",
  },
  {
    motsCles: ["cv"],
    texte:
      "Je peux partir de ton CV actuel pour comprendre ton parcours. Bientôt, tu pourras me l'envoyer directement ici, et je l'adapterai à chaque offre.",
  },
  {
    motsCles: ["paris", "lyon", "marseille", "toulouse", "lille", "bordeaux", "nantes"],
    texte:
      "Bonne zone. Tu acceptes jusqu'à quelle distance, et le télétravail partiel t'intéresse-t-il ? Ça change beaucoup le nombre d'offres que je trouve.",
  },
  {
    motsCles: [],
    texte:
      "Je t'écoute. Raconte-moi ce que tu cherches comme si tu le disais à un ami : le poste, l'endroit, ce qui compte pour toi. Je transforme ça en recherche, et je reviens vers toi chaque jour avec ce qui te correspond.",
  },
];

function reponseA(message: string): string {
  const texte = message.toLowerCase();
  const trouvee = REPONSES.find(
    (r) => r.motsCles.length === 0 || r.motsCles.some((mot) => texte.includes(mot)),
  );
  // `REPONSES` se termine par une entrée sans mot-clé : `find` trouve
  // toujours. Le repli ne sert qu'au typage.
  return trouvee?.texte ?? "";
}

// ─────────────────────────────────────────────────────────────────────
// Les offres — au format exact de `karria_api` (/job-matches)
// ─────────────────────────────────────────────────────────────────────

/** Il y a `heures` heures, en ISO — les dates relatives des cartes
 *  (« Aujourd'hui », « Hier »…) restent ainsi vraies quel que soit le jour. */
function ilYa(heures: number): string {
  return new Date(Date.now() - heures * 3_600_000).toISOString();
}

interface OffreSimulee {
  id: number;
  title: string;
  company: string;
  logo: string | null;
  city: string;
  postal_code: string;
  contract: string;
  is_alternance: boolean;
  salary_raw: string | null;
  heures: number;
  score: number;
  summary: string | null;
  analysis: string;
}

/** Des offres d'exemple. `summary` à `null` : l'analyse n'existe pas
 *  encore et sera « générée » à l'ouverture, comme en production. */
const OFFRES: OffreSimulee[] = [
  {
    id: 101,
    title: "Data Engineer en alternance",
    company: "BNP Paribas",
    logo: null,
    city: "Paris",
    postal_code: "75009",
    contract: "Contrat d'apprentissage",
    is_alternance: true,
    salary_raw: "1 450 € par mois",
    heures: 2,
    score: 0.94,
    summary:
      "Construire les pipelines Airflow qui alimentent la gestion des risques, au sein d'une équipe qui forme quatre alternants par an.",
    analysis:
      "Une vraie alternance d'ingénierie, pas un poste d'analyste déguisé : tu construiras les pipelines Airflow qui alimentent la gestion des risques. L'équipe accueille quatre alternants chaque année et en embauche la moitié. Point d'attention : ils attendent du SQL solide dès l'entretien technique.",
  },
  {
    id: 102,
    title: "Alternant·e Machine Learning Engineer",
    company: "Doctolib",
    logo: null,
    city: "Levallois-Perret",
    postal_code: "92300",
    contract: "Contrat d'apprentissage",
    is_alternance: true,
    salary_raw: "1 600 € par mois",
    heures: 26,
    score: 0.86,
    summary: null,
    analysis:
      "Tu rejoindrais l'équipe qui entraîne les modèles de tri des rendez-vous. Le poste est très orienté production : déploiement, suivi de la dérive des modèles, pas seulement des notebooks. Le recrutement est sélectif : prépare un projet personnel à montrer.",
  },
  {
    id: 103,
    title: "Data Analyst junior",
    company: "Back Market",
    logo: null,
    city: "Paris",
    postal_code: "75010",
    contract: "CDI",
    is_alternance: false,
    salary_raw: null,
    heures: 72,
    score: 0.74,
    summary:
      "Tableaux de bord et analyses pour l'équipe produit, avec une formation interne à la data engineering.",
    analysis:
      "Moins technique que ce que tu vises : l'essentiel est du tableau de bord et de l'analyse. L'équipe forme en revanche ses recrues à la data engineering. Une bonne porte d'entrée si les postes d'ingénieur ne répondent pas.",
  },
  {
    id: 104,
    title: "Ingénieur·e IA générative",
    company: "Mistral AI",
    logo: null,
    city: "Paris",
    postal_code: "75015",
    contract: "CDD",
    is_alternance: false,
    salary_raw: "48 000 – 55 000 € par an",
    heures: 200,
    score: 0.68,
    summary: null,
    analysis:
      "Le poste le plus exigeant de ta sélection, et le plus demandé. Ils attendent des bases solides en PyTorch et un intérêt pour les grands modèles de langage. Si tu postules, fais-le vite.",
  },
];

function versMatch(o: OffreSimulee) {
  return {
    id: o.id,
    job_offer_id: o.id + 1000,
    score: o.score,
    score_normalized: o.score,
    match_quality: o.score >= 0.8 ? "excellent" : "good",
    saved: etat.signets.has(String(o.id)),
    applied: false,
    job_offer: {
      id: o.id + 1000,
      title: o.title,
      summary: etat.resumes.get(o.id) === "pret" ? o.analysis : o.summary,
      company: { id: o.id, name: o.company, logo: o.logo },
      city: { id: o.id, name: o.city, postal_code: o.postal_code },
      contract_type: {
        id: o.id,
        code: o.contract.slice(0, 3).toUpperCase(),
        label: o.contract,
      },
      published_at: ilYa(o.heures),
      is_alternance: o.is_alternance,
      salary_raw: o.salary_raw,
      apply_url: `https://karria.fr/offres/${o.id}`,
      origin_url: null,
      latitude: null,
      longitude: null,
    },
  };
}

function filDesMatchs(chemin: string): Response {
  const p = new URLSearchParams(chemin.split("?")[1] ?? "");
  const contrats = p.get("contract_types")?.split(",") ?? [];
  const villes = p.get("cities")?.split(",") ?? [];
  const depuis = p.get("published_after");
  let liste = OFFRES.filter(
    (o) =>
      (contrats.length === 0 || contrats.includes(o.contract)) &&
      (villes.length === 0 || villes.includes(o.city)) &&
      (depuis === null || ilYa(o.heures) >= depuis),
  );
  if (p.get("sort") === "recent") {
    liste = [...liste].sort((a, b) => a.heures - b.heures);
  }
  const offset = Number(p.get("offset") ?? 0);
  const limit = Number(p.get("limit") ?? 20);
  const page = liste.slice(offset, offset + limit);
  return json(200, {
    items: page.map(versMatch),
    count: liste.length,
    limit,
    offset,
    has_next: offset + page.length < liste.length,
  });
}

function optionsDeFiltre(): Response {
  const unique = (valeurs: string[]) =>
    [...new Set(valeurs)].map((v, i) => ({ id: i + 1, value: v, label: v }));
  return json(200, {
    contract_types: unique(OFFRES.map((o) => o.contract)),
    cities: unique(OFFRES.map((o) => o.city)),
  });
}

/** `summary-status` : le résumé déjà connu est prêt ; sinon « missing »
 *  jusqu'à la demande, puis « pending » quatre secondes — le temps de
 *  voir le chargeur de l'analyse. */
function statutDuResume(o: OffreSimulee): Response {
  if (o.summary !== null || etat.resumes.get(o.id) === "pret") {
    return json(200, { status: "ready", summary: o.summary ?? o.analysis });
  }
  const demande = etat.demandesDeResume.get(o.id);
  if (demande === undefined) return json(200, { status: "missing", summary: null });
  if (Date.now() - demande < 4_000)
    return json(200, { status: "pending", summary: null });
  etat.resumes.set(o.id, "pret");
  return json(200, { status: "ready", summary: o.analysis });
}

function routeDeMatch(methode: string, chemin: string, corps: unknown): Response | null {
  const m = /^\/job-matches\/(\d+)(\/[a-z-]+)?$/.exec(chemin);
  if (m === null) return null;
  const offre = OFFRES.find((o) => o.id === Number(m[1]));
  if (offre === undefined) return erreur(404, "match_not_found", "Offre introuvable.");
  const suite = m[2] ?? "";
  if (methode === "GET" && suite === "") return json(200, versMatch(offre));
  if (methode === "GET" && suite === "/summary-status") return statutDuResume(offre);
  if (methode === "POST" && suite === "/summary") {
    if (!etat.demandesDeResume.has(offre.id))
      etat.demandesDeResume.set(offre.id, Date.now());
    return json(200, { status: "pending", summary: null });
  }
  if (methode === "PATCH" && suite === "/interaction") {
    const garder = champ(corps, "saved");
    if (garder === true) etat.signets.add(String(offre.id));
    if (garder === false) etat.signets.delete(String(offre.id));
    return json(200, versMatch(offre));
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Le routage
// ─────────────────────────────────────────────────────────────────────

export async function repondreEnSimulation(requete: RequeteSimulee): Promise<Response> {
  const { chemin, methode, corps, jeton } = requete;
  const route = `${methode} ${chemin.split("?")[0]}`;

  await attendre(
    route === "POST /assistant/messages" ||
      route === "POST /cv/draft/interpret" ||
      route === "POST /voice/transcribe"
      ? LATENCE_ASSISTANT_MS
      : LATENCE_MS,
  );

  if (estUneRouteCv(chemin)) return repondreCv(methode, chemin, corps);
  // Les appareils ne sont **pas** « en avance sur le backend » : le vrai
  // serveur les sert en même temps que l'application les appelle. Ici,
  // seulement en simulation.
  if (estUneRouteAppareil(chemin)) return repondreAppareils(methode, chemin, corps);

  // Les routes à paramètre ou à requête, avant le `switch` qui ne
  // connaît que les chemins exacts.
  if (methode === "GET" && chemin.split("?")[0] === "/job-matches/me") {
    return filDesMatchs(chemin);
  }
  if (route === "GET /job-matches/me/filter-options") return optionsDeFiltre();
  const match = routeDeMatch(methode, chemin.split("?")[0], corps);
  if (match !== null) return match;

  switch (route) {
    case "POST /auth/email/start": {
      const email = champ(corps, "email");
      if (typeof email !== "string" || !email.includes("@")) {
        return erreur(422, "user_email_invalid", "Adresse e-mail invalide.", {
          field: "email",
        });
      }
      return json(200, parcoursOuvert(email));
    }

    case "POST /auth/email/resend": {
      const parcours = etat.parcours.get(String(champ(corps, "challenge_id")));
      if (parcours === undefined) {
        return erreur(410, "auth_login_challenge_expired", "Parcours expiré.");
      }
      return json(200, parcoursOuvert(parcours.email));
    }

    case "POST /auth/email/verify": {
      const id = String(champ(corps, "challenge_id"));
      const parcours = etat.parcours.get(id);
      if (parcours === undefined) {
        return erreur(410, "auth_login_challenge_expired", "Parcours expiré.");
      }
      if (champ(corps, "code") !== CODE_SIMULATION) {
        parcours.essais += 1;
        return parcours.essais >= 5
          ? erreur(429, "auth_code_exhausted", "Trop d'essais.", { field: "code" })
          : erreur(400, "auth_code_invalid", "Code incorrect.", { field: "code" });
      }
      etat.parcours.delete(id);
      return json(200, ouvrirSession(parcours.email, true));
    }

    case "POST /auth/social/google":
      return json(200, ouvrirSession("toi@gmail.com", true));

    case "POST /auth/social/apple":
      return json(200, ouvrirSession("toi@privaterelay.appleid.com", true));

    case "POST /auth/refresh":
      return json(200, {
        access_token: identifiant("acces"),
        refresh_token: identifiant("rafraichissement"),
      });

    case "POST /auth/logout":
      return json(204, undefined);

    case "GET /auth/me": {
      // Une session ouverte avant un rechargement n'est plus en mémoire :
      // on répond quand même, sinon chaque rechargement à chaud
      // déconnecterait — ce qui n'apprend rien sur l'application.
      const compte = jeton === null ? undefined : etat.sessions.get(jeton);
      return json(200, compte ?? { id: "usr_simule", email: "toi@exemple.fr" });
    }

    case "DELETE /auth/me": {
      // `docs/contrat-api-compte.md` : la raison est obligatoire et prise
      // dans une liste close ; le détail est libre, borné à 1 000.
      const raison = champ(corps, "reason");
      if (typeof raison !== "string" || !RAISONS_DE_DEPART.includes(raison)) {
        return erreur(422, "account_deletion_reason_invalid", "Raison inconnue.", {
          field: "reason",
        });
      }
      const details = champ(corps, "details");
      if (details !== null && details !== undefined && typeof details !== "string") {
        return erreur(422, "account_deletion_details_invalid", "Détail invalide.", {
          field: "details",
        });
      }
      if (typeof details === "string" && details.length > DETAILS_MAX) {
        return erreur(422, "account_deletion_details_too_long", "Détail trop long.", {
          field: "details",
          max_length: DETAILS_MAX,
        });
      }
      // Toutes les sessions du compte tombent avec lui, pas seulement celle
      // qui a demandé.
      const compte = jeton === null ? undefined : etat.sessions.get(jeton);
      for (const [acces, session] of etat.sessions) {
        if (compte === undefined || session.id === compte.id) etat.sessions.delete(acces);
      }
      return json(204, undefined);
    }

    case "POST /assistant/messages": {
      const contenu = champ(corps, "content");
      if (typeof contenu !== "string" || contenu.trim() === "") {
        return erreur(422, "assistant_message_empty", "Message vide.", {
          field: "content",
        });
      }
      const fournie = champ(corps, "conversation_id");
      const conversation = typeof fournie === "string" ? fournie : identifiant("cnv");
      etat.conversations.set(
        conversation,
        (etat.conversations.get(conversation) ?? 0) + 1,
      );
      return json(200, {
        conversation_id: conversation,
        message: {
          id: identifiant("msg"),
          role: "assistant",
          content: reponseA(contenu),
          created_at: new Date().toISOString(),
        },
      });
    }

    default:
      console.warn(`[karria] simulation : aucune route pour « ${route} »`);
      return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
  }
}
