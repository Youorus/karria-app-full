/**
 * Quelles annonces prêtes peuvent entrer dans la liste **sans la faire
 * bouger** sous le doigt.
 *
 * ═══ Le défaut ═══
 *
 * Une annonce n'existe dans le fil qu'une fois chargée (aucun trou). Elles
 * arrivent une à une, quelques secondes après l'affichage — donc souvent
 * pendant que la personne défile. Chacune s'insérait aussitôt à sa place :
 * les cartes d'en dessous descendaient d'un coup, et toute la liste se
 * redessinait en plein mouvement. Marc : « les cartes vibrent » — et pas au
 * premier lancement, où le consentement retarde les annonces, mais aux
 * suivants, où elles arrivent tout de suite.
 *
 * ═══ La règle ═══
 *
 * Une annonce n'entre qu'à une place située **sous** ce qui est à l'écran
 * (avec une carte de marge) : personne ne la voit arriver, rien ne bouge.
 * Celle dont la place est déjà à l'écran ou au-dessus attend ; elle entrera
 * quand la personne sera remontée. L'appelant ne pose rien pendant le
 * mouvement (`use-annonces-posees.ts`).
 *
 * Une annonce déjà posée garde sa place ; si la réserve la remplace (durée
 * de vie dépassée), la nouvelle prend la même place sans rien décaler.
 */

import type { RegleDeListe } from "./regles-publicite";

/** Marge sous le dernier élément vu : une carte à moitié visible n'est pas « vue ». */
const MARGE = 1;

/** L'indice, dans la liste entrelacée, de l'annonce de cet emplacement. */
function indiceDe(
  emplacement: number,
  posees: ReadonlyMap<number, unknown>,
  regle: RegleDeListe,
): number {
  let avant = 0;
  for (const autre of posees.keys()) if (autre < emplacement) avant += 1;
  return (emplacement + 1) * regle.intervalle + avant;
}

/**
 * Rend les annonces à montrer. La **même** table qu'en entrée si rien ne
 * change : l'appelant ne redessine alors rien.
 */
export function poserLesAnnonces<T>(
  posees: ReadonlyMap<number, T>,
  pretes: ReadonlyMap<number, T>,
  regle: RegleDeListe,
  dernierIndiceVisible: number,
): ReadonlyMap<number, T> {
  const suite = new Map<number, T>();
  let change = false;
  for (const [emplacement, annonce] of posees) {
    const actuelle = pretes.get(emplacement);
    if (actuelle === undefined) {
      change = true; // retirée par la réserve (sans pub, durée de vie)
      continue;
    }
    if (actuelle !== annonce) change = true;
    suite.set(emplacement, actuelle);
  }
  const nouvelles = [...pretes.keys()]
    .filter((emplacement) => !posees.has(emplacement))
    .sort((a, b) => a - b);
  for (const emplacement of nouvelles) {
    if (indiceDe(emplacement, suite, regle) <= dernierIndiceVisible + MARGE) continue;
    suite.set(emplacement, pretes.get(emplacement) as T);
    change = true;
  }
  return change ? suite : posees;
}
