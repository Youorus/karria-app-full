/**
 * Les dossiers de candidature — calqués sur `karria_api_v2`
 * (`docs/contrat-api-candidatures.md`, module `applications`).
 *
 * ═══ Un dossier, c'est quoi ═══
 *
 * Une offre **figée** (telle qu'elle était quand on l'a ouverte, même si
 * elle a disparu de l'index depuis), la **copie** du CV que Karria adapte
 * et que la personne retouche, les propositions de Karria avec leur état,
 * la lettre, et « j'ai candidaté » avec sa date. Le CV de base n'est
 * jamais touché : il reste dans `GET /cv/me`.
 *
 * ═══ Deux formes, comme partout ═══
 *
 * `…Brut` reproduit **exactement** ce que l'API envoie et ne quitte jamais
 * `api/`. Le CV du dossier est au format de `GET /cv/me` sans `id` ni
 * `image_url` : on réutilise les types bruts et la traduction du domaine
 * `cv` — une seule définition du CV dans l'app.
 */

import type {
  Competence,
  CompetenceBrute,
  ContactBrut,
  Cv,
  Experience,
  ExperienceBrute,
  FormationBrute,
  IdentiteBrute,
  InteretBrut,
  LangueBrute,
} from "@/features/cv/types/cv.types";

// ─────────────────────────────────────────────────────────────────────
// Ce que l'API envoie
// ─────────────────────────────────────────────────────────────────────

/** `brouillon` tant que l'adaptation court ou qu'une proposition attend ;
 *  `pret` ensuite ; `candidate` dès `applied_at`. Déduit par le serveur. */
import type { StyleLettre } from "../services/style-lettre";

export type StatutBrut = "brouillon" | "pret" | "candidate";
export type AdaptationBrute = "en_cours" | "faite" | "echouee";
export type ErreurAdaptationBrute =
  "ai_unavailable" | "ai_output_invalid" | "queue_unavailable";
export type EtatPropositionBrut = "proposee" | "acceptee" | "refusee";
export type DecisionBrute = "accepter" | "refuser" | "revenir";
export type SorteParagrapheBrute =
  "interet_entreprise" | "interet_poste" | "competences" | "pourquoi_moi" | "libre";

/** L'offre telle que le dossier l'a figée — dans la liste, les champs
 *  longs (`description`, `keywords`, `excerpt`…) ne sont pas servis. */
export interface OffreFigeeBrute {
  offer_id: string;
  title: string;
  company: string | null;
  /** Stable (condensat), ou `null` → initiales. */
  logo_url: string | null;
  website?: string | null;
  city: string | null;
  contract?: string | null;
  contract_label: string | null;
  /** Où postuler. */
  source_url: string | null;
  excerpt?: string | null;
  /** Le texte complet, figé. */
  description?: string | null;
  keywords?: string[];
  published_at?: string | null;
}

/** Le CV d'un dossier : `GET /cv/me` sans `id` ni `image_url`. */
export interface CvDeDossierBrut {
  summary: string | null;
  identity?: IdentiteBrute | null;
  contact?: ContactBrut | null;
  experiences: ExperienceBrute[];
  educations: FormationBrute[];
  skills: CompetenceBrute[];
  languages: LangueBrute[];
  interests: InteretBrut[];
  /** Toléré par le serveur, ignoré par l'app. */
  projects?: unknown[];
}

/** `before`/`after` : un texte pour un chemin simple, la liste réordonnée
 *  pour `skills` ou `experiences`. Karria n'ajoute jamais un élément. */
export type ValeurProposeeBrute = string | CompetenceBrute[] | ExperienceBrute[];

export interface PropositionBrute {
  id: string;
  /** `identity.headline`, `summary`, `experiences.<i>.position`,
   *  `experiences.<i>.missions.<j>`, `skills`, `experiences`. */
  path: string;
  before: ValeurProposeeBrute;
  after: ValeurProposeeBrute;
  reason: string;
  state: EtatPropositionBrut;
}

export interface ParagrapheBrut {
  kind: SorteParagrapheBrute;
  text: string;
}

export interface LettreBrute {
  recipient: string;
  subject: string;
  paragraphs: ParagrapheBrut[];
  closing: string;
}

export interface CouvertureBrute {
  present: string[];
  missing: string[];
  ratio: number;
}

export interface DossierBrut {
  id: string;
  offer: OffreFigeeBrute;
  template_id: string | null;
  /** La couleur principale posée par la personne (`#RRGGBB`), ou `null` (ADR-0034). */
  primary_color?: string | null;
  /** Le style de lettre retenu : `template` (assortie) ou `plain` (sobre) ; `null` : par défaut (ADR-0036). */
  letter_style?: "template" | "plain" | null;
  cv: CvDeDossierBrut;
  cv_base_hash: string;
  /** Le CV de base a changé (ou disparu) depuis la copie. */
  base_changed: boolean;
  propositions: PropositionBrute[];
  letter: LettreBrute | null;
  coverage: CouvertureBrute;
  status: StatutBrut;
  adaptation: AdaptationBrute;
  adaptation_error: ErreurAdaptationBrute | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

/** La carte de la liste (`GET /applications`). */
export interface CarteDossierBrute {
  id: string;
  offer: OffreFigeeBrute;
  template_id: string | null;
  primary_color?: string | null;
  letter_style?: "template" | "plain" | null;
  status: StatutBrut;
  adaptation: AdaptationBrute;
  coverage_ratio: number;
  pending_propositions: number;
  has_letter: boolean;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListeDossiersBrute {
  items: CarteDossierBrute[];
}

/** Un export de `documents` rattaché à un dossier
 *  (`GET /cv/me/generated-cvs?dossier_id=…`, `docs/contrat-api-documents.md`).
 *  Seuls les champs que l'espace Candidatures lit. */
export interface ExportBrut {
  id: string;
  kind?: "cv" | "letter";
  dossier_id?: string | null;
  company_name?: string | null;
  template?: { id: string; label: string; version: number } | null;
  created_at: string;
  pdf_url?: string | null;
  docx_url?: string | null;
}

export interface ListeExportsBrute {
  items: ExportBrut[];
  total: number;
}

// ─────────────────────────────────────────────────────────────────────
// Ce que l'application manipule
// ─────────────────────────────────────────────────────────────────────

export type StatutDossier = "brouillon" | "pret" | "candidate";
export type EtatAdaptation = "en_cours" | "faite" | "echouee";
export type ErreurAdaptation =
  "ia_indisponible" | "sortie_invalide" | "file_indisponible";
export type EtatProposition = "proposee" | "acceptee" | "refusee";
export type Decision = "accepter" | "refuser" | "revenir";
export type SorteParagraphe =
  "interet_entreprise" | "interet_poste" | "competences" | "pourquoi_moi" | "libre";

export interface OffreFigee {
  /** L'identifiant de l'offre dans l'index : c'est lui qu'on ouvre. */
  id: string;
  titre: string;
  entreprise: string | null;
  logo: string | null;
  siteEntreprise: string | null;
  ville: string | null;
  contrat: string | null;
  /** Où postuler, si l'annonce le dit. */
  lienCandidature: string | null;
  extrait: string | null;
  /** Le texte complet, figé — dans le détail seulement. */
  description: string | null;
  motsCles: string[];
  publieeLe: string | null;
}

export type ValeurProposee = string | Competence[] | Experience[];

export interface Proposition {
  id: string;
  chemin: string;
  avant: ValeurProposee;
  apres: ValeurProposee;
  raison: string;
  etat: EtatProposition;
}

export interface Paragraphe {
  sorte: SorteParagraphe;
  texte: string;
}

export interface Lettre {
  destinataire: string;
  objet: string;
  paragraphes: Paragraphe[];
  formule: string;
}

export interface Couverture {
  presents: string[];
  manquants: string[];
  /** De 0 à 1. */
  ratio: number;
}

export interface Dossier {
  id: string;
  offre: OffreFigee;
  modeleId: string | null;
  /** La couleur principale posée sur le modèle du dossier ; `null` : celle du modèle. */
  couleur: string | null;
  /** Le style de lettre retenu (« modèle » ou « sobre ») ; `null` : par défaut. */
  styleLettre: StyleLettre | null;
  /** La copie adaptée — sans photo : celle du CV de base sert à l'aperçu. */
  cv: Cv;
  empreinteCvDeBase: string;
  baseChangee: boolean;
  propositions: Proposition[];
  lettre: Lettre | null;
  couverture: Couverture;
  statut: StatutDossier;
  adaptation: EtatAdaptation;
  erreurAdaptation: ErreurAdaptation | null;
  candidateLe: string | null;
  creeLe: string;
  modifieLe: string;
}

export interface CarteDossier {
  id: string;
  offre: OffreFigee;
  modeleId: string | null;
  couleur: string | null;
  styleLettre: StyleLettre | null;
  statut: StatutDossier;
  adaptation: EtatAdaptation;
  /** De 0 à 1. */
  couverture: number;
  propositionsEnAttente: number;
  aUneLettre: boolean;
  candidateLe: string | null;
  creeLe: string;
  modifieLe: string;
}

export interface ExportDossier {
  id: string;
  genre: "cv" | "lettre";
  modele: string | null;
  creeLe: string;
  /** URL signée (1 h), ou `null` si le format n'a pas été demandé. */
  pdf: string | null;
  docx: string | null;
}
