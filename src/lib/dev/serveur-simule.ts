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
import { estUneRouteOffres, repondreOffres } from "./offres-simule";

/** Ce que `karria_api_v2` sert déjà — en production depuis 2026-10-23 :
 *  la session, les appareils, le CV, la voix, le fil d'offres, Karria et
 *  la recherche. Seuls les modèles de CV (`/templates/`,
 *  `/user-templates/`) restent au faux serveur, en développement, tant
 *  que leur module n'existe pas : on retire la dernière ligne quand il
 *  sera livré. */
const SERVI_PAR_LA_V2 = [
  "/auth/",
  "/devices/",
  "/cv/",
  "/voice/",
  "/job-matches/",
  "/assistant/",
  "/search/",
];

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

  // Le fil, Karria et la recherche : le contrat du module `offers`.
  if (estUneRouteOffres(chemin)) return repondreOffres(methode, chemin, corps);

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

    default:
      console.warn(`[karria] simulation : aucune route pour « ${route} »`);
      return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
  }
}
