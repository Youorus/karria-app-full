/**
 * Les types de la conversation avec Karria — `docs/contrat-api-recherche.md`.
 *
 * `…Brut` décrit ce que le serveur envoie ; le reste, ce que l'application
 * manipule. La traduction se fait dans `api/`.
 */

export type Auteur = "utilisateur" | "assistant";

export interface Message {
  id: string;
  auteur: Auteur;
  texte: string;
  /** Pour un message de l'assistant en cours de révélation : la part
   *  déjà affichée. Égal à `texte.length` une fois la révélation finie. */
  visible: number;
}

/** Ce que le tour a produit : une recherche lancée, une question, ou
 *  une simple réponse. */
export type StatutReponse = "recherche" | "question" | "discussion";

/** Un élargissement que Karria propose, avec un gain réellement compté. */
export interface Elargissement {
  id: string;
  libelle: string;
  /** Offres en plus dans le fil si on accepte. */
  gain: number;
  /** Le texte à envoyer pour accepter. */
  message: string;
}

export interface Criteres {
  /** La recherche en une ligne (« cuisinier · Lyon (30 km) · CDI »). */
  resume: string;
  metiers: string[];
  lieu: string | null;
  rayonKm: number | null;
  touteLaFrance: boolean;
  contrats: string[];
  alertes: boolean;
}

export interface Reponse {
  conversationId: string;
  message: { id: string; texte: string };
  statut: StatutReponse;
  /** Offres placées dans le fil, si une recherche a tourné. */
  resultats: number | null;
  criteres: Criteres | null;
  /** 0 à 4 réponses rapides ; un toucher envoie le texte tel quel. */
  suggestions: string[];
  elargissements: Elargissement[];
}

// ─────────────────────────────────────────────────────────────────────
// La forme réseau
// ─────────────────────────────────────────────────────────────────────

export interface MessageBrut {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CriteresBruts {
  query: string;
  summary: string;
  job_titles: string[];
  keywords: string[];
  location: {
    label: string;
    latitude: number | null;
    longitude: number | null;
    radius_km: number;
    department_codes: string[];
  } | null;
  whole_france: boolean;
  contract_types: string[];
  remote: string[];
  schedule: string | null;
  max_experience: string | null;
  salary_min_monthly: number | null;
  alerts_enabled: boolean;
  updated_at: string;
}

/** Le corps de `PUT /search/criteria` : les critères tels que le serveur
 *  les a rendus, sans ce qu'il calcule lui-même (`query`, `summary`,
 *  `alerts_enabled`, `updated_at`) — il refuse tout champ en trop. */
export type CorpsDeRecherche = Pick<
  CriteresBruts,
  | "job_titles"
  | "keywords"
  | "location"
  | "whole_france"
  | "contract_types"
  | "remote"
  | "schedule"
  | "max_experience"
  | "salary_min_monthly"
>;

export interface ElargissementBrut {
  id: string;
  kind: string;
  label: string;
  gain: number;
  message: string;
}

export interface ReponseBrute {
  conversation_id: string;
  message: MessageBrut;
  status: "search" | "clarify" | "chat";
  intent: string;
  results_count: number | null;
  criteria: CriteresBruts | null;
  suggestions: string[];
  /** En cours de livraison côté API : absent tant qu'il n'est pas servi. */
  widenings?: ElargissementBrut[];
}
