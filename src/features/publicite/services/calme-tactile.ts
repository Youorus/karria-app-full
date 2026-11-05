/**
 * « Jamais une annonce sous un doigt, ni juste après. »
 *
 * ═══ Pourquoi ═══
 *
 * Une annonce qui apparaît sous le doigt au moment où l'on touche est le
 * premier mécanisme du clic accidentel — celui que Google sanctionne
 * (trafic invalide) et celui qui rend une application détestable. La
 * règle : une annonce chargée ne se **montre** qu'après un temps de calme
 * tactile. Elle se charge, elle attend, elle paraît.
 *
 * ═══ Deux secondes par défaut, moins pour certains emplacements ═══
 *
 * `CALME_MS` (2 s) est la règle générale. Mais l'arrivée sur une fiche
 * d'offre **est** un toucher : avec deux secondes, l'annonce du détail
 * n'apparaît qu'après que la personne a commencé à lire ou à défiler, et
 * souvent jamais. Un emplacement peut donc demander un délai plus court
 * (`delaiAvantCalme(maintenant, calmeMs)`) — la garantie qui compte reste
 * entière : voir ci-dessous.
 *
 * ═══ Un doigt posé n'est jamais calme ═══
 *
 * Le délai seul ne suffit pas : un défilement long garde le doigt sur
 * l'écran bien plus de 700 ms sans nouveau `touchStart`. La racine note
 * donc aussi la **fin** de chaque toucher (`noterFinDeToucher`) ; tant
 * qu'un doigt est posé, `delaiAvantCalme` répond « attends encore » — et
 * le compte à rebours ne part qu'au lever du doigt. Une annonce ne paraît
 * jamais sous un doigt en mouvement, quel que soit le délai de l'emplacement.
 * Garde-fou : une fin de toucher jamais reçue (geste natif avalé sans
 * `touchCancel`) ne bloque pas la publicité pour toujours — au-delà de
 * `DOIGT_OUBLIE_MS`, le doigt est tenu pour levé.
 *
 * ═══ Un seul instant pour toute l'application ═══
 *
 * La racine note chaque toucher (`onTouchStart` / `onTouchEnd` sur le
 * fond, qui reçoit tous les touchers de l'arbre). Les emplacements lisent
 * ici le délai qu'il leur reste à attendre. Un état au niveau du module,
 * comme `lib/sans-pub.ts` : il n'y a qu'un doigt.
 */

export const CALME_MS = 2_000;
/** Un doigt « posé » depuis plus longtemps est une fin de toucher perdue. */
export const DOIGT_OUBLIE_MS = 10_000;

let dernierToucher: number | null = null;
let doigtPose = false;

export function noterToucher(instant: number = Date.now()): void {
  dernierToucher = instant;
  doigtPose = true;
}

/** Le doigt se lève : le compte à rebours du calme part d'ici. */
export function noterFinDeToucher(instant: number = Date.now()): void {
  dernierToucher = instant;
  doigtPose = false;
}

/**
 * Combien de temps attendre avant de pouvoir montrer une annonce : 0 si
 * calme. Doigt posé : tout le délai, à revérifier ensuite.
 */
export function delaiAvantCalme(
  maintenant: number = Date.now(),
  calmeMs: number = CALME_MS,
): number {
  if (dernierToucher === null) return 0;
  if (doigtPose && maintenant - dernierToucher < DOIGT_OUBLIE_MS) return calmeMs;
  return Math.max(0, calmeMs - (maintenant - dernierToucher));
}

/** Pour les tests seulement. */
export function oublierLesTouchersPourLesTests(): void {
  dernierToucher = null;
  doigtPose = false;
}
