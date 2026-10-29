/**
 * Les règles d'affichage de la galerie — celles de la V1.
 *
 * Source : `Karria-Frontend`, `templates-gallery-filter-chips.tsx` et
 * `template-card.tsx`. Pures et testées, hors des écrans.
 */

import { centimesDepuisTexte, euros } from "@/lib/monnaie";

import type { FiltreGalerie, Modele } from "../types/modeles.types";

/** « elegant » → « Elegant ». */
export function capitaliser(texte: string): string {
  return texte.length === 0 ? texte : texte.charAt(0).toUpperCase() + texte.slice(1);
}

export interface Puce {
  cle: string;
  libelle: string;
  filtre: FiltreGalerie;
}

/** Les puces de la V1 : « Tous », « Premium » s'il existe un modèle payant,
 *  puis une puce par catégorie, dans l'ordre alphabétique. */
export function pucesDeLaGalerie(modeles: Modele[]): Puce[] {
  const puces: Puce[] = [{ cle: "tous", libelle: "Tous", filtre: { type: "tous" } }];
  if (modeles.some((m) => m.premium)) {
    puces.push({ cle: "premium", libelle: "Premium", filtre: { type: "premium" } });
  }
  const categories = [...new Set(modeles.map((m) => m.categorie))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  for (const c of categories) {
    puces.push({
      cle: `cat-${c}`,
      libelle: capitaliser(c),
      filtre: { type: "categorie", valeur: c },
    });
  }
  return puces;
}

export function memeFiltre(a: FiltreGalerie, b: FiltreGalerie): boolean {
  if (a.type !== b.type) return false;
  return a.type !== "categorie" || a.valeur === (b as { valeur: string }).valeur;
}

export function filtrer(modeles: Modele[], filtre: FiltreGalerie): Modele[] {
  if (filtre.type === "tous") return modeles;
  if (filtre.type === "premium") return modeles.filter((m) => m.premium);
  return modeles.filter((m) => m.categorie === filtre.valeur);
}

/** « 1 234 » → « 1.2k », comme les compteurs d'utilisation de la V1. */
export function compteCompact(n: number): string {
  if (n < 1_000) return String(n);
  if (n < 1_000_000)
    return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

/** « 3 modèles — les tiens sont cochés ✓ » (V1, tutoyée). */
export function sousTitreGalerie(total: number): string {
  if (total === 0) return "Aucun modèle pour le moment";
  return `${total} modèle${total > 1 ? "s" : ""} — les tiens sont cochés ✓`;
}

/** La note affichée : « 4,6 » ou « Pas encore noté ». */
export function noteLisible(note: number, nombre: number): string {
  if (nombre === 0) return "Pas encore noté";
  return note.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** « 4.99 » (le prix du serveur) → « 4,99 € » ; illisible → `null`. */
export function prixLisible(prix: string | null): string | null {
  if (prix === null) return null;
  const centimes = centimesDepuisTexte(prix);
  return centimes === null ? null : euros(centimes);
}
