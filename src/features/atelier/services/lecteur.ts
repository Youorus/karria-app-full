/**
 * Le lecteur de documents : ce qu'il affiche en tête, ce qu'il refuse, et
 * ce qu'il dit quand il ne peut rien montrer.
 *
 * ═══ Un nom neutre, jamais l'adresse du stockage ═══
 *
 * Avant, « Ouvrir » un CV exporté passait par le navigateur intégré, dont
 * l'en-tête affichait `storage.karria.fr` — l'adresse d'un seau de
 * fichiers, pas un nom pour une personne. Le lecteur porte le titre du
 * document : « CV · Awa Diallo », « Lettre · Maison Kayser », ou « Mon CV »
 * quand le nom manque.
 *
 * ═══ Rien ne vient des paramètres de route ═══
 *
 * La route `/lecture-document` ne reçoit qu'un identifiant. Le document
 * lui-même (lien signé, genre, nom) est **mémorisé ici** par l'écran qui
 * l'ouvre (`memoriserDocument`), le temps de la session ; un identifiant
 * inconnu — un lien externe forgé, une reprise après redémarrage — ne
 * télécharge rien. Le lien doit être `https` vers l'hôte du stockage de
 * Karria, et seulement lui ; le nom de fichier est recalculé par
 * `nomDeFichier` et refusé s'il sort du répertoire des exports.
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
  erreurContenu:
    "Ce fichier n'est pas un PDF lisible. Reviens à la liste et rouvre le document.",
  reessayer: "Réessayer",
  partageIndisponible: "Le partage n'est pas disponible sur cet appareil.",
} as const;

// ─────────────────────────────────────────────────────────────────────
// Ce qu'on affiche
// ─────────────────────────────────────────────────────────────────────

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
// Ce qu'on refuse
// ─────────────────────────────────────────────────────────────────────

/** L'hôte du stockage de Karria (`STORAGE__PUBLIC_ENDPOINT_URL`), le seul
 *  d'où un document se télécharge — en production comme en simulation. */
export const HOTES_DE_STOCKAGE = ["storage.karria.fr"] as const;

/** `https` vers l'hôte du stockage, rien d'autre : ni `http`, ni un autre
 *  domaine, ni un port, ni des identifiants dans l'URL. */
export function lienDeStockageSur(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return (
    u.protocol === "https:" &&
    u.username === "" &&
    u.password === "" &&
    u.port === "" &&
    (HOTES_DE_STOCKAGE as readonly string[]).includes(u.hostname.toLowerCase())
  );
}

/** Un nom de fichier qui reste dans le répertoire des exports : pas de
 *  séparateur, pas de `..`, pas de nom caché, et l'extension du format. */
export function nomDeFichierSur(nom: string, format: FormatDocument): boolean {
  if (nom.length === 0 || nom.length > 180) return false;
  if (/[/\\]/.test(nom) || nom.includes("..") || nom.startsWith(".")) return false;
  if (/[\x00-\x1f]/.test(nom)) return false;
  return nom.toLowerCase().endsWith(`.${format}`);
}

/** Les cinq premiers octets d'un PDF : `%PDF-`. */
export function estUnPdf(octets: Uint8Array): boolean {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d];
  return octets.length >= 5 && signature.every((o, i) => octets[i] === o);
}

// ─────────────────────────────────────────────────────────────────────
// Les documents à lire, mémorisés par l'écran qui les ouvre
// ─────────────────────────────────────────────────────────────────────

export interface DocumentALire {
  /** L'identifiant de l'export (`GeneratedCv.id`). */
  id: string;
  /** Le lien signé du PDF, sinon du Word. */
  url: string;
  genre: GenreDocument;
  /** « Awa Diallo » pour un CV, l'entreprise pour une lettre. */
  complement: string | null;
  modele: string | null;
  /** Le nom de l'écran d'où l'on vient (« Mes CV », « Dossier »). */
  retour: string;
}

/** Ce que le lecteur montre — dérivé du document, jamais d'un paramètre. */
export interface PresentationDeLecture {
  format: FormatDocument;
  titre: string;
  sousTitre: string;
  fichier: string;
  retour: string;
}

export function presentationDeLecture(d: DocumentALire): PresentationDeLecture {
  const format = formatDuLien(d.url);
  return {
    format,
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

const memoire = new Map<string, DocumentALire>();

/** Retient le document sous son identifiant ; rend l'identifiant si le
 *  lien est sûr, `null` sinon (rien n'est retenu). */
export function memoriserDocument(d: DocumentALire): string | null {
  if (d.id === "" || !lienDeStockageSur(d.url)) return null;
  memoire.set(d.id, d);
  return d.id;
}

export function documentMemorise(id: unknown): DocumentALire | null {
  return typeof id === "string" ? (memoire.get(id) ?? null) : null;
}

/** Un export effacé n'a plus de lien à retenir. */
export function oublierDocument(id: string): void {
  memoire.delete(id);
}

/** À la déconnexion : plus rien à lire. */
export function oublierLesDocuments(): void {
  memoire.clear();
}
