/**
 * « Une nouvelle version existe-t-elle ? » — la réponse du serveur, gardée
 * pour toute l'application.
 *
 * ═══ Pourquoi un état au niveau du module ═══
 *
 * La porte de mise à jour (`use-porte-de-version.ts`) vit à la racine,
 * avant la navigation ; le badge « Nouvelle version » vit dans l'onglet
 * Profil, cinq écrans plus bas. Un contexte React obligerait à traverser
 * chaque couche ; un store minuscule et abonnable, comme `lib/sans-pub.ts`,
 * suffit — et il se lit sans monter de composant.
 */

import type { Version } from "./version";

let version: Version | null = null;
const abonnes = new Set<() => void>();

export function lireVersionConnue(): Version | null {
  return version;
}

export function poserVersionConnue(valeur: Version | null): void {
  version = valeur;
  abonnes.forEach((rappel) => rappel());
}

export function abonnerVersion(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}
