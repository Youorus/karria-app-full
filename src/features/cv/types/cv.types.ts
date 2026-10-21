/**
 * Le CV, et le brouillon qu'on écrit avec Karria pour y arriver.
 *
 * ═══ Deux formes, comme partout ═══
 *
 * Les types `…Brut` sont la forme réseau, calquée champ pour champ sur
 * les schémas CV de la V1 (`app/cv/schemas.py`) et sur
 * `docs/contrat-api-cv.md`. Ils ne quittent jamais `api/`. Le reste de
 * l'application ne voit que les types en français.
 *
 * ═══ Les chapitres ═══
 *
 * Toujours les mêmes, toujours dans le même ordre : c'est ce qui rend le
 * parcours simple pour n'importe qui. Les clés sont celles du contrat.
 */

export const CHAPITRES = [
  "identity",
  "contact",
  "summary",
  "experiences",
  "educations",
  "skills",
  "interests",
  "photo",
] as const;

export type CleChapitre = (typeof CHAPITRES)[number];

export type StatutChapitre = "a-faire" | "en-cours" | "valide" | "passe";

// ─────────────────────────────────────────────────────────────────────
// Le domaine
// ─────────────────────────────────────────────────────────────────────

export interface Identite {
  prenom: string;
  nom: string;
  titre: string | null;
}

export interface Lien {
  libelle: string;
  url: string;
}

export interface Contact {
  email: string | null;
  telephone: string | null;
  ville: string | null;
  liens: Lien[];
}

export interface Presentation {
  texte: string;
}

export interface Experience {
  poste: string;
  entreprise: string;
  lieu: string | null;
  debut: string | null;
  fin: string | null;
  enCours: boolean;
  missions: string[];
}

export interface Formation {
  diplome: string;
  ecole: string;
  lieu: string | null;
  debut: string | null;
  fin: string | null;
  enCours: boolean;
}

export type NiveauCompetence = "Débutant" | "Intermédiaire" | "Avancé" | "Expert";
export type NiveauLangue = "Natif" | "C2" | "C1" | "B2" | "B1" | "A2" | "A1";

export interface Competence {
  nom: string;
  niveau: NiveauCompetence;
}

export interface Langue {
  langue: string;
  niveau: NiveauLangue;
}

export interface Competences {
  competences: Competence[];
  langues: Langue[];
}

export interface Interet {
  nom: string;
  categorie: string | null;
}

export interface Interets {
  interets: Interet[];
}

export interface Photo {
  /** L'adresse à afficher. Signée, elle expire : on ne la garde pas. */
  image: string | null;
  /** Ce que le serveur retient — jamais l'URL (ADR-0008 de l'API). */
  imageId: string | null;
}

/** Ce que chaque chapitre produit — un élément pour les chapitres en
 *  boucle (expériences, formations). */
export interface DonneesDeChapitre {
  identity: Identite;
  contact: Contact;
  summary: Presentation;
  experiences: Experience;
  educations: Formation;
  skills: Competences;
  interests: Interets;
  photo: Photo;
}

export type Jet = {
  [C in CleChapitre]: { chapitre: C; donnees: DonneesDeChapitre[C] };
}[CleChapitre];

export interface EtatDeChapitre {
  statut: StatutChapitre;
  /** Les chapitres simples : leur unique valeur validée. */
  donnees: Jet | null;
  /** Les chapitres en boucle : chaque élément validé. */
  elements: Jet[];
}

export interface Brouillon {
  id: string;
  chapitreCourant: CleChapitre;
  chapitres: Record<CleChapitre, EtatDeChapitre>;
}

export interface Interpretation {
  jet: Jet | null;
  manquants: string[];
  relance: string | null;
  horsSujet: boolean;
}

export interface Cv {
  identite: Identite | null;
  contact: Contact | null;
  presentation: string | null;
  photo: string | null;
  experiences: Experience[];
  formations: Formation[];
  competences: Competence[];
  langues: Langue[];
  interets: Interet[];
  /** Vrai quand aucune section n'est remplie : le CV reste à créer. */
  vide: boolean;
}

// ─────────────────────────────────────────────────────────────────────
// La forme réseau
// ─────────────────────────────────────────────────────────────────────

export interface IdentiteBrute {
  first_name: string;
  last_name: string;
  headline: string | null;
}

export interface ContactBrut {
  email: string | null;
  phone: string | null;
  city: string | null;
  links: { label: string; url: string }[];
}

export interface ExperienceBrute {
  position: string;
  company: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  missions: string[] | null;
  description?: string | null;
}

export interface FormationBrute {
  degree: string;
  school: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_in_progress: boolean;
  description?: string | null;
}

export interface CompetenceBrute {
  name: string;
  level: NiveauCompetence;
  category?: string | null;
}

export interface LangueBrute {
  language: string;
  level: NiveauLangue;
}

export interface InteretBrut {
  name: string;
  category: string | null;
  description?: string | null;
}

export interface DonneesBrutes {
  identity: IdentiteBrute;
  contact: ContactBrut;
  summary: { summary: string };
  experiences: ExperienceBrute;
  educations: FormationBrute;
  skills: { skills: CompetenceBrute[]; languages: LangueBrute[] };
  interests: { interests: InteretBrut[] };
  photo: { image_id: string | null; image_url?: string | null };
}

export interface ChapitreBrut {
  status: "pending" | "in_progress" | "validated" | "skipped";
  data?: unknown;
  items?: unknown[];
}

export interface BrouillonBrut {
  id: string;
  current_chapter: CleChapitre;
  chapters: Partial<Record<CleChapitre, ChapitreBrut>>;
  updated_at: string;
}

export interface InterpretationBrute {
  proposal: unknown;
  missing: string[];
  follow_up: string | null;
  off_topic: boolean;
}

export interface CvBrut {
  id: string;
  summary: string | null;
  image_url: string | null;
  identity?: IdentiteBrute | null;
  contact?: ContactBrut | null;
  experiences: ExperienceBrute[];
  educations: FormationBrute[];
  skills: CompetenceBrute[];
  languages: LangueBrute[];
  interests: InteretBrut[];
}
