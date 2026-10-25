/**
 * Les types des offres — calqués sur `karria_api_v2`
 * (`docs/contrat-api-offres.md`).
 *
 * ═══ La source ═══
 *
 * `…Brut` reproduit **exactement** ce que renvoie l'API : `JobMatch` et
 * son `job_offer`. Tout ce qui s'affiche est un champ typé — il n'y a
 * plus de `raw_data` à fouiller comme dans la V1, et les identifiants
 * sont des **UUID**. Un champ que l'API ne fournit pas n'apparaît pas à
 * l'écran.
 *
 * Seuls les champs que l'application lit sont déclarés : l'API peut en
 * envoyer davantage, qu'on ignore.
 */

// ─────────────────────────────────────────────────────────────────────
// Ce que l'API envoie
// ─────────────────────────────────────────────────────────────────────

export type ContratBrut =
  | "cdi"
  | "cdd"
  | "interim"
  | "alternance"
  | "stage"
  | "freelance"
  | "saisonnier"
  | "autre";
export type TeletravailBrut = "sur_site" | "hybride" | "teletravail";
export type HorairesBrut = "temps_plein" | "temps_partiel";
export type ExperienceBrute = "debutant" | "junior" | "confirme" | "senior";

export interface OffreBrute {
  id: string;
  title: string;
  /** Réservé à l'analyse de Karria, pas encore servie : toujours `null`. */
  summary: null;
  /** Les premières lignes de l'annonce, sur une ligne. */
  excerpt: string;
  /** Le texte de l'annonce (Markdown léger) — détail seulement. */
  description: string | null;
  company: {
    name: string;
    /** Logo carré 128 px (WebP) servi par `storage.karria.fr`, ou `null`. */
    logo: string | null;
    /** Le même en 256 px, pour le détail, ou `null`. */
    logo_large: string | null;
    website: string | null;
  } | null;
  city: { name: string; postal_code: string | null } | null;
  /** À afficher tel quel : « Lyon 3e », « Nanterre (92) ». */
  location_label: string | null;
  department_code: string | null;
  latitude: number | null;
  longitude: number | null;
  contract_type: { code: ContratBrut; label: string } | null;
  remote: TeletravailBrut | null;
  schedule: HorairesBrut | null;
  experience: ExperienceBrute | null;
  salary_raw: string | null;
  salary_min_monthly: number | null;
  salary_max_monthly: number | null;
  published_at: string;
  is_alternance: boolean;
  apply_url: string | null;
  origin_url: string | null;
  source: string;
  is_active: boolean;
}

/** `high` (« Très alignée »), `medium`, `low` (« À explorer », replié) ;
 *  `null` hors recherche. */
export type QualiteBrute = "high" | "medium" | "low";

export interface MatchBrut {
  /** L'identifiant de l'**offre** : une personne la voit une fois. */
  id: string;
  job_offer_id: string;
  score_normalized: number | null;
  match_quality: QualiteBrute | null;
  /** Ce que l'offre confirme de la demande : « CDI », « Lyon · 4 km ». */
  reasons: string[];
  origin: "search" | "alert" | null;
  /** Publiée il y a moins de 48 h et jamais vue. */
  is_new: boolean;
  feed_seen: boolean;
  detail_opened: boolean;
  saved: boolean;
  applied: boolean;
  dismissed: boolean;
  job_offer: OffreBrute;
}

export type ModeDuFilBrut = "all_offers" | "search";

export interface FilBrut {
  items: MatchBrut[];
  count: number;
  limit: number;
  offset: number;
  has_next: boolean;
  mode: ModeDuFilBrut;
  criteria_summary: string | null;
}

export interface OptionBrute {
  value: string;
  label: string;
  count: number;
}

export interface OptionsDeFiltreBrutes {
  contract_types?: OptionBrute[];
  cities?: OptionBrute[];
}

// ─────────────────────────────────────────────────────────────────────
// Ce que l'application manipule
// ─────────────────────────────────────────────────────────────────────

export type Teletravail = "sur site" | "hybride" | "télétravail";

/** Une offre du fil : un match et son offre, aplatis. */
export interface Offre {
  /** L'identifiant de l'offre (UUID) : c'est lui qu'on ouvre et qu'on garde. */
  id: string;
  titre: string;
  entreprise: string | null;
  /** Logo 128 px (cartes), `null` → initiales. */
  logo: string | null;
  /** Logo 256 px (détail), `null` → on retombe sur `logo`. */
  logoGrand: string | null;
  /** Le lieu prêt à afficher (`location_label`), sinon la ville. */
  lieu: string | null;
  ville: string | null;
  codePostal: string | null;
  /** ISO 8601 — la mise en forme relative se fait à l'affichage. */
  publieeLe: string;
  /** Le libellé du contrat (« CDI », « Alternance »), s'il est connu. */
  contrat: string | null;
  teletravail: Teletravail | null;
  horaires: "temps plein" | "temps partiel" | null;
  experience: "débutant" | "junior" | "confirmé" | "senior" | null;
  salaire: string | null;
  /** L'extrait de l'annonce, pour la carte. */
  extrait: string;
  /** Le texte de l'annonce, nettoyé — connu après lecture du détail. */
  description: string | null;
  /** De 0 à 100, ou `null` hors recherche. */
  compatibilite: number | null;
  /** « CDI », « Lyon · 4 km » : ce que l'offre confirme de la demande. */
  raisons: string[];
  lienCandidature: string | null;
  latitude: number | null;
  longitude: number | null;
  enregistree: boolean;
  postulee: boolean;
  qualite: "haute" | "moyenne" | "basse" | null;
  nouvelle: boolean;
  /** Le détail n'a jamais été ouvert : liseré bleu et point, comme la V1. */
  nonOuverte: boolean;
  siteEntreprise: string | null;
  source: string;
  active: boolean;
}

export type ModeDuFil = "toutes" | "recherche";

export interface Fil {
  offres: Offre[];
  total: number;
  suivantes: boolean;
  mode: ModeDuFil;
  /** La recherche en cours en une ligne, en mode recherche. */
  resumeRecherche: string | null;
}

export interface Option {
  valeur: string;
  libelle: string;
  /** L'effectif de la valeur dans le fil courant. */
  nombre: number;
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
