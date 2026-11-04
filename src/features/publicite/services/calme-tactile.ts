/**
 * « Jamais une annonce dans les deux secondes qui suivent un toucher. »
 *
 * ═══ Pourquoi ═══
 *
 * Une annonce qui apparaît sous le doigt au moment où l'on touche est le
 * premier mécanisme du clic accidentel — celui que Google sanctionne
 * (trafic invalide) et celui qui rend une application détestable. La
 * règle est simple : une annonce chargée ne se **montre** qu'après deux
 * secondes de calme tactile. Elle se charge, elle attend, elle paraît.
 *
 * ═══ Un seul instant pour toute l'application ═══
 *
 * La racine note chaque toucher (`onTouchStart` sur le fond, qui reçoit
 * tous les touchers de l'arbre). Les emplacements lisent ici le délai
 * qu'il leur reste à attendre. Un état au niveau du module, comme
 * `lib/sans-pub.ts` : il n'y a qu'un doigt.
 */

export const CALME_MS = 2_000;

let dernierToucher: number | null = null;

export function noterToucher(instant: number = Date.now()): void {
  dernierToucher = instant;
}

/** Combien de temps attendre avant de pouvoir montrer une annonce : 0 si calme. */
export function delaiAvantCalme(maintenant: number = Date.now()): number {
  if (dernierToucher === null) return 0;
  return Math.max(0, CALME_MS - (maintenant - dernierToucher));
}

/** Pour les tests seulement. */
export function oublierLesTouchersPourLesTests(): void {
  dernierToucher = null;
}
