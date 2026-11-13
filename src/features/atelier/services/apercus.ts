/**
 * L'aperçu plein écran d'un export : ses pages en image, retenues en
 * mémoire sous un identifiant — comme le lecteur (`services/lecteur.ts`),
 * l'écran ne reçoit qu'un identifiant, jamais des liens en paramètre.
 */

import type { GenreDocument } from "./lecteur";

export interface ApercuAVoir {
  /** L'identifiant de l'export (`GeneratedCv.id`). */
  id: string;
  genre: GenreDocument;
  /** « Mon CV », « Ma lettre pour Zara ». */
  titre: string;
  /** Les pages en image, dans l'ordre. */
  pages: string[];
  /** Le lien signé du PDF, pour « Ouvrir le PDF » ; `null` sans PDF. */
  pdf: string | null;
  modele: string | null;
  /** « Awa Diallo » pour un CV, l'entreprise pour une lettre : le lecteur en a besoin. */
  complement: string | null;
  /** Le nom de l'écran d'où l'on vient. */
  retour: string;
}

const memoire = new Map<string, ApercuAVoir>();

/** Retient l'aperçu ; rend l'identifiant, ou `null` s'il n'y a rien à montrer. */
export function memoriserApercu(a: ApercuAVoir): string | null {
  if (a.id === "" || a.pages.length === 0) return null;
  memoire.set(a.id, a);
  return a.id;
}

export function lireApercu(id: string | undefined): ApercuAVoir | null {
  return id === undefined ? null : (memoire.get(id) ?? null);
}

/** « Page 2 sur 3 ». */
export function libellePage(index: number, total: number): string {
  return `Page ${index + 1} sur ${total}`;
}
