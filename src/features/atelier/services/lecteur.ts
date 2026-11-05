/**
 * Le lecteur de documents : ce qu'il affiche en tête, et ce qu'il dit
 * quand il ne peut rien montrer.
 *
 * ═══ Un nom neutre, jamais l'adresse du stockage ═══
 *
 * Avant, « Ouvrir » un CV exporté passait par le navigateur intégré, dont
 * l'en-tête affichait `storage.karria.fr` — l'adresse d'un seau de
 * fichiers, pas un nom pour une personne. Le lecteur porte le titre du
 * document : « CV · Awa Diallo », « Lettre · Maison Kayser », ou « Mon CV »
 * quand le nom manque.
 *
 * Pur, testé.
 */

import { nomDeFichier } from "./presentation";

export type GenreDocument = "cv" | "lettre";
export type FormatDocument = "pdf" | "docx";

export const TEXTES_LECTEUR = {
  monCv: "Mon CV",
  maLettre: "Ma lettre",
  pdf: "PDF",
  word: "Word",
  telecharger: "Télécharger",
  partager: "Partager",
  ouvrirAilleurs: "Ouvrir dans un lecteur",
  chargement: "Karria prépare ton document…",
  /** Android : la WebView ne rend pas les PDF ; le lecteur du téléphone s'en charge. */
  ouvertAilleursTitre: "Ouvert dans ton lecteur PDF",
  ouvertAilleursPhrase:
    "Ton document s'est ouvert dans le lecteur du téléphone. Tu peux le rouvrir, le télécharger ou le partager d'ici.",
  sansLecteurTitre: "Aucun lecteur PDF sur ce téléphone",
  sansLecteurPhrase:
    "Télécharge ou partage le document : il s'ouvrira là où tu l'envoies.",
  wordTitre: "Un document Word",
  wordPhrase:
    "Karria n'affiche pas l'aperçu d'un fichier Word. Télécharge-le ou partage-le : il s'ouvrira dans Word, Pages ou Google Docs.",
  erreurTitre: "Le document n'a pas pu être chargé",
  erreurReseau: "Vérifie ta connexion, puis réessaie.",
  erreurLien: "Le lien a expiré. Reviens à la liste et rouvre le document.",
  reessayer: "Réessayer",
  partageIndisponible: "Le partage n'est pas disponible sur cet appareil.",
} as const;

/** « CV · Awa Diallo », « Lettre · Maison Kayser » ; sans nom, « Mon CV » / « Ma lettre ». */
export function titreDeLecture(genre: GenreDocument, complement: string | null): string {
  const propre = (complement ?? "").replace(/\s+/g, " ").trim();
  if (genre === "cv") return propre === "" ? TEXTES_LECTEUR.monCv : `CV · ${propre}`;
  return propre === "" ? TEXTES_LECTEUR.maLettre : `Lettre · ${propre}`;
}

/** « PDF · Meridian », « Word », selon ce qu'on sait du modèle. */
export function sousTitreDeLecture(
  format: FormatDocument,
  modele: string | null,
): string {
  const f = format === "pdf" ? TEXTES_LECTEUR.pdf : TEXTES_LECTEUR.word;
  const m = (modele ?? "").trim();
  return m === "" ? f : `${f} · ${m}`;
}

/** Le format d'un lien d'export : `.docx` → Word, tout le reste → PDF. */
export function formatDuLien(url: string): FormatDocument {
  return /\.docx(\?|#|$)/i.test(url) ? "docx" : "pdf";
}

/** Ce qu'on affiche selon l'appareil et le format — la seule décision du lecteur. */
export function modeDAffichage(
  plateforme: "ios" | "android" | string,
  format: FormatDocument,
): "apercu" | "lecteur-systeme" | "sans-apercu" {
  if (format === "docx") return "sans-apercu";
  return plateforme === "ios" ? "apercu" : "lecteur-systeme";
}

// ─────────────────────────────────────────────────────────────────────
// Ce que la route `/lecture-document` reçoit
// ─────────────────────────────────────────────────────────────────────

export interface DocumentALire {
  /** Le lien signé du PDF, sinon du Word. */
  url: string;
  genre: GenreDocument;
  /** « Awa Diallo » pour un CV, l'entreprise pour une lettre. */
  complement: string | null;
  modele: string | null;
  /** Le nom de l'écran d'où l'on vient (« Mes CV », « Dossier »). */
  retour: string;
}

/** Un type (pas une interface) : expo-router veut une signature d'index. */
export type ParametresLecture = {
  url: string;
  genre: GenreDocument;
  titre: string;
  sousTitre: string;
  fichier: string;
  retour: string;
};

/** Pur : ce que la route reçoit. */
export function parametresDeLecture(d: DocumentALire): ParametresLecture {
  const format = formatDuLien(d.url);
  return {
    url: d.url,
    genre: d.genre,
    titre: titreDeLecture(d.genre, d.complement),
    sousTitre: sousTitreDeLecture(format, d.modele),
    fichier: nomDeFichier(
      d.genre,
      d.genre === "cv" ? (d.complement ?? "") : "",
      d.genre === "lettre" ? d.complement : null,
      format,
    ),
    retour: d.retour,
  };
}
