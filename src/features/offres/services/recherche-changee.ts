/**
 * Le signal « la recherche en cours a changé ailleurs que dans le fil ».
 *
 * ═══ Pourquoi ═══
 *
 * Le fil reste monté sous les écrans empilés (détail, paramètres). Quand
 * la personne supprime sa recherche en cours depuis « Mes recherches », le
 * serveur rend le fil à « toutes les offres » — mais le fil affiché, lui,
 * montrerait encore l'ancienne recherche et son sélecteur de vue jusqu'au
 * prochain « tirer pour actualiser ».
 *
 * ═══ Pourquoi un compteur et non un rappel ═══
 *
 * Celui qui change la recherche ne connaît pas le fil, et le fil peut ne
 * pas être monté (lien profond vers les paramètres). Un compteur lu par
 * `useSyncExternalStore` — la mécanique de `retour-discret.ts` — ne
 * suppose ni l'un ni l'autre : le fil compare la version à celle qu'il a
 * servie, et se relit si elle a bougé. L'application ne déduit rien de ce
 * qui a changé : elle redemande au serveur.
 */

import { useSyncExternalStore } from "react";

let version = 0;
const abonnes = new Set<() => void>();

/** À appeler quand la recherche en cours vient d'être modifiée ou retirée
 *  hors du fil : le fil se relira, en laissant le serveur choisir le mode. */
export function signalerRechercheChangee(): void {
  version += 1;
  abonnes.forEach((rappel) => rappel());
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

const lire = () => version;

/** Le numéro du dernier changement ; ne sert qu'à être comparé. */
export function useVersionRecherche(): number {
  return useSyncExternalStore(abonner, lire, lire);
}
