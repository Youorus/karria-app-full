/**
 * Les types de l'authentification.
 *
 * `…Brut` décrit ce que le serveur envoie ; le reste décrit ce que
 * l'application manipule. La traduction se fait dans `api/`, à un seul
 * endroit — sans quoi un renommage côté serveur se propage dans tous les
 * écrans.
 *
 * ═══ Ce qui a disparu par rapport à la V1, et pourquoi ═══
 *
 * Plus de nom, de prénom, de date de naissance ni de téléphone, et plus
 * de « profil complet ». Karria n'en a pas besoin pour faire son travail,
 * et chaque champ demandé à l'inscription faisait partir une partie des
 * gens qui voulaient seulement essayer. Un compte, c'est une adresse
 * e-mail prouvée — par un code, par Apple ou par Google.
 */

/** Le parcours e-mail ouvert : un code est parti, on attend sa saisie. */
export interface ParcoursBrut {
  challenge_id: string;
  sent_to: string;
  expires_in: number;
  seconds_before_resend: number;
}

export interface Parcours {
  id: string;
  /** L'adresse telle que le serveur l'a retenue, pour « code envoyé à … ». */
  envoyeA: string;
  /** Secondes de validité du code. */
  valableSecondes: number;
  /** Secondes avant de pouvoir en redemander un. Vient du serveur : le
   *  client ne connaît jamais le délai, il le lit. */
  avantRenvoi: number;
}

/** Une session ouverte, quel que soit le chemin : code, Apple ou Google. */
export interface ConnexionBrute {
  session: { access_token: string; refresh_token: string };
  user: { id: string; email: string };
  created_account: boolean;
}

export interface Connexion {
  jetons: { acces: string; rafraichissement: string };
  compte: Compte;
  /** Vrai à la toute première connexion : l'assistant se présente. */
  compteCree: boolean;
}

/** Les outils d'IA, tels que le serveur les nomme (`purposes`). */
export type UsageIa =
  | "assistant"
  | "transcription"
  | "cv_creation"
  | "cv_import"
  | "photo_enhancement"
  | "template_analysis";

/** `GET /auth/me/ai-consent` — `docs/contrat-api-consentement-ia.md`. */
export interface ConsentementIaBrut {
  required: boolean;
  disclosure: {
    version: string;
    providers: { id: string; name: string }[];
    purposes: UsageIa[];
  };
  accepted_version: string | null;
  accepted_at: string | null;
  revoked_at: string | null;
}

export interface ConsentementIa {
  /** Vrai : montrer la feuille avant tout outil d'IA. */
  requis: boolean;
  /** La version à renvoyer à l'acceptation — celle qu'on a montrée. */
  version: string;
  fournisseurs: { id: string; nom: string }[];
  usages: UsageIa[];
  versionAcceptee: string | null;
  accepteLe: string | null;
  retireLe: string | null;
}

export interface MoiBrut {
  id: string;
  email: string;
  ai_consent: ConsentementIaBrut;
}

/** Le compte tel que la connexion le rend : l'identifiant et l'adresse. */
export interface Compte {
  id: string;
  email: string;
}

/** `GET /auth/me` : le compte, et où en est son consentement à l'IA. */
export interface Moi extends Compte {
  consentementIa: ConsentementIa;
}

/**
 * Pourquoi quelqu'un supprime son compte — les codes du contrat
 * (`docs/contrat-api-compte.md`). Ce sont les seuls que le serveur
 * accepte ; les libellés qu'on affiche vivent dans le domaine du profil.
 */
export const RAISONS_DE_DEPART = [
  "found_job",
  "no_matching_offers",
  "not_useful",
  "too_many_notifications",
  "privacy",
  "other",
] as const;

export type RaisonDeDepart = (typeof RAISONS_DE_DEPART)[number];

/** Ce qui part avec `DELETE /auth/me`. */
export interface SuppressionCompte {
  raison: RaisonDeDepart;
  /** Un mot libre, facultatif — 1 000 caractères au plus. */
  details: string | null;
}

export interface SuppressionCompteBrute {
  reason: RaisonDeDepart;
  details: string | null;
}
