/**
 * Les types des modèles de CV — calqués sur `docs/contrat-api-modeles.md`.
 *
 * `…Brut` reproduit ce que renvoie l'API (le modèle, ses lettres de
 * motivation assorties, ses pages, ses avis) ; seuls les champs que
 * l'application lit sont déclarés. Les identifiants sont des UUID. Les URL d'images sont **signées** et expirent au bout
 * d'une heure : on ne les garde pas d'une session à l'autre.
 */

export interface LettreBrute {
  id: number | string;
  label: string;
  signed_thumbnail_url: string | null;
  signed_preview_url: string | null;
  signed_full_url: string | null;
}

/** Une page du carrousel du détail (`GET /templates/{id}`). */
export interface PageBrute {
  kind: "cv" | "letter";
  label: string;
  signed_thumbnail_url: string | null;
  signed_full_url: string | null;
}

export interface ModeleBrut {
  id: string;
  name: string;
  label: string;
  category: string | null;
  description: string | null;
  is_premium: boolean;
  price: string | number | null;
  tags: string[] | null;
  signed_thumbnail_url: string | null;
  signed_preview_url: string | null;
  signed_full_url: string | null;
  /** Proposé au contrat par l'app : le flou affiché avant la vignette. */
  thumbnail_blurhash?: string | null;
  views_count: number;
  uses_count: number;
  rating_avg: number;
  rating_count: number;
  primary_color: string | null;
  font_family: string | null;
  has_photo: boolean;
  cover_letters?: LettreBrute[];
  /** Seulement dans le détail. */
  pages?: PageBrute[] | null;
  version?: number;
}

export interface AvisBrut {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  author_name: string;
  author_initials: string;
}

export interface AvisListeBrute {
  items: AvisBrut[];
  total: number;
  rating_avg: number;
  rating_count: number;
}

export interface PossessionBrute {
  id: string;
  template: { id: string };
  is_active: boolean;
}

// ─────────────────────────────────────────────────────────────────────

/** Une page du carrousel du détail : le CV ou une lettre assortie. */
export interface Apercu {
  cle: string;
  type: "cv" | "lettre";
  libelle: string;
  miniature: string | null;
  image: string | null;
}

export interface Modele {
  id: string;
  libelle: string;
  /** « elegant » → affiché « Elegant » ; vide → « Professionnel » (V1). */
  categorie: string;
  description: string | null;
  premium: boolean;
  /** Prix affichable (« 4.99 »), ou `null` pour un modèle gratuit. */
  prix: string | null;
  etiquettes: string[];
  miniature: string | null;
  /** Le flou qui précède la vignette, s'il est connu. */
  flou: string | null;
  /** La version du dessin : la clé du cache des images. */
  version: number;
  vues: number;
  utilisations: number;
  note: number;
  nombreDAvis: number;
  couleur: string | null;
  police: string | null;
  avecPhoto: boolean;
  /** Les pages du carrousel : le CV d'abord, puis ses lettres. */
  apercus: Apercu[];
  avecLettre: boolean;
}

export interface Avis {
  id: number;
  note: number;
  titre: string | null;
  texte: string | null;
  date: string;
  auteur: string;
  initiales: string;
}

export interface AvisDuModele {
  avis: Avis[];
  moyenne: number;
  total: number;
}

/** Le filtre des puces de la galerie : « Tous », « Premium » ou une catégorie. */
export type FiltreGalerie =
  { type: "tous" } | { type: "premium" } | { type: "categorie"; valeur: string };
