/**
 * Les types des offres — calqués sur l'API Karria existante.
 *
 * ═══ La source ═══
 *
 * `…Brut` reproduit **exactement** ce que renvoie `karria_api` :
 * `JobOfferMatchFeedResponse` (app/job_offer_matches/schemas.py) et son
 * `job_offer` imbriqué (`JobOfferResponse`, app/job_offers/schemas.py).
 * La V1 affichait ces mêmes informations ; la refonte les garde toutes et
 * n'en invente aucune — un champ que l'API ne fournit pas n'apparaît pas
 * à l'écran.
 *
 * Seuls les champs que l'application lit sont déclarés : l'API en envoie
 * davantage (interactions, version d'algorithme…), qu'on ignore.
 */

// ─────────────────────────────────────────────────────────────────────
// Ce que l'API envoie
// ─────────────────────────────────────────────────────────────────────

export interface OffreBrute {
  id: number;
  title: string;
  /** Le résumé de l'offre, quand il a déjà été généré. */
  summary: string | null;
  company: {
    id: number;
    name: string;
    logo: string | null;
    website?: string | null;
  } | null;
  city: { id: number; name: string; postal_code: string | null } | null;
  contract_type: { id: number; code: string; label: string } | null;
  published_at: string;
  is_alternance: boolean;
  salary_raw: string | null;
  apply_url: string | null;
  origin_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active?: boolean;
  /** La donnée source (France Travail, Indeed…) : la V1 y lit le lieu, le
   *  contrat et la description quand les champs normalisés manquent. */
  raw_data?: Record<string, unknown> | null;
}

/** La qualité d'un match, telle que la V1 l'affiche : « Très alignée »
 *  (high), rien (medium), « À explorer » (low, replié par défaut). */
export type QualiteBrute = "high" | "medium" | "low" | string;

export interface MatchBrut {
  id: number;
  job_offer_id: number;
  score: number;
  /** De 0 à 1 ; `null` pour les anciens matchs. */
  score_normalized: number | null;
  match_quality: QualiteBrute | null;
  /** Fraîcheur (0–1) : au-delà de 0,9, la V1 affiche « Nouvelle ». */
  score_recency?: number | null;
  feed_seen?: boolean;
  detail_opened?: boolean;
  saved: boolean;
  applied: boolean;
  job_offer: OffreBrute | null;
}

export interface FilBrut {
  items: MatchBrut[];
  count: number;
  limit: number;
  offset: number;
  has_next: boolean;
}

export interface OptionBrute {
  id: number;
  value: string;
  label: string;
}

export interface OptionsDeFiltreBrutes {
  contract_types?: OptionBrute[];
  cities?: OptionBrute[];
}

export type StatutResume = "ready" | "pending" | "missing" | "not_available";

export interface ResumeBrut {
  status: StatutResume;
  summary: string | null;
}

// ─────────────────────────────────────────────────────────────────────
// Ce que l'application manipule
// ─────────────────────────────────────────────────────────────────────

/** Une offre du fil : un match et son offre, aplatis. */
export interface Offre {
  /** L'identifiant **du match** : c'est lui qu'on ouvre, garde, résume. */
  id: number;
  titre: string;
  entreprise: string | null;
  logo: string | null;
  ville: string | null;
  codePostal: string | null;
  /** ISO 8601 — la mise en forme relative se fait à l'affichage. */
  publieeLe: string;
  contrats: string[];
  salaire: string | null;
  resume: string | null;
  /** De 0 à 100, ou `null` si l'API n'a pas de score normalisé. */
  compatibilite: number | null;
  lienCandidature: string | null;
  latitude: number | null;
  longitude: number | null;
  enregistree: boolean;
  /** `high`, `medium`, `low` ou `null` — voir `QualiteBrute`. */
  qualite: "haute" | "moyenne" | "basse" | null;
  nouvelle: boolean;
  /** Le détail n'a jamais été ouvert : liseré bleu et point, comme la V1. */
  nonOuverte: boolean;
  /** La description de l'annonce, pour le détail. */
  description: string | null;
  siteEntreprise: string | null;
  active: boolean;
}

export interface Fil {
  offres: Offre[];
  total: number;
  suivantes: boolean;
}

export interface Option {
  valeur: string;
  libelle: string;
}

export interface OptionsDeFiltre {
  contrats: Option[];
  villes: Option[];
}

/** La fraîcheur de la V1 : 24 h, 3, 7 ou 30 jours. Traduite en
 *  `published_after` par la couche `api/`. */
export type Periode = 1 | 3 | 7 | 30 | null;

/** Les filtres de la V1 (`feed-filter-sheet.tsx`). */
export interface Filtres {
  sauvegardees: boolean;
  nonVues: boolean;
  nonPostulees: boolean;
  periode: Periode;
  contrats: string[];
  villes: string[];
}

export const FILTRES_PAR_DEFAUT: Filtres = {
  sauvegardees: false,
  nonVues: false,
  nonPostulees: false,
  periode: null,
  contrats: [],
  villes: [],
};
