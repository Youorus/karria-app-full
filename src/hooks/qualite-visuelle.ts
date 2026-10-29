/**
 * Le palier de qualité visuelle d'un appareil : ce que l'aura et l'orbe
 * peuvent se permettre sans faire tomber la fluidité.
 *
 * ═══ Pourquoi un palier, et non un réglage par effet ═══
 *
 * L'aura (trois nappes plein écran qui dérivent, composées avec une
 * opacité) et l'orbe (jusqu'à 2 600 grains et un flou gaussien) coûtent
 * surtout au GPU, à chaque image. Sur un iPhone récent ou un Android haut
 * de gamme, c'est invisible ; sur un Android d'entrée de gamme (Helio,
 * Snapdragon 4xx, 2 à 3 Go), un flou plein cadre et un calque composé
 * suffisent à perdre la moitié des images. Une seule décision, prise une
 * fois au démarrage, et chaque effet sait ce qu'il a le droit de faire :
 * c'est plus lisible que des seuils dispersés dans trois composants, et ça
 * se teste sans appareil.
 *
 * ═══ Les indices ═══
 *
 * - l'année de classe de l'appareil (`expo-device`, Android seulement :
 *   dérivée du processeur et de la mémoire, à la façon de Facebook) ;
 * - la mémoire totale ;
 * - la densité de l'écran : un ratio sous 2,5 trahit un appareil modeste ;
 * - la plateforme : iOS tient 60 images par seconde avec beaucoup plus de
 *   marge que l'Android moyen, à puissance égale.
 *
 * Une donnée absente ne pénalise jamais : on part du palier haut sur iOS
 * et du palier moyen sur Android, et seuls des indices concrets descendent.
 */

export type PalierVisuel = "haut" | "moyen" | "bas";

export interface IndicesAppareil {
  plateforme: "ios" | "android" | string;
  /** `Device.deviceYearClass` : l'année d'un appareil haut de gamme équivalent. */
  anneeAppareil: number | null;
  /** `Device.totalMemory`, en octets. */
  memoireOctets: number | null;
  /** `PixelRatio.get()`. */
  densite: number;
}

const GO = 1024 * 1024 * 1024;

/** En dessous : un appareil qui souffre déjà d'une liste qui défile. */
const ANNEE_BASSE = 2017;
/** En dessous : un appareil correct, mais sans marge pour un flou plein cadre. */
const ANNEE_MOYENNE = 2020;

export function palierVisuel(indices: IndicesAppareil): PalierVisuel {
  const { plateforme, anneeAppareil, memoireOctets, densite } = indices;
  const memoireGo = memoireOctets === null ? null : memoireOctets / GO;

  if (plateforme === "ios") {
    // Un iPhone encore à jour tient tout ; seul un appareil très ancien ou
    // à 2 Go (iPhone 7 et avant) descend d'un palier.
    if (
      (memoireGo !== null && memoireGo < 2.5) ||
      (anneeAppareil !== null && anneeAppareil < ANNEE_BASSE)
    ) {
      return "moyen";
    }
    return "haut";
  }

  // Android : prudent par défaut, et deux signaux concordants pour le bas.
  const ancien = anneeAppareil !== null && anneeAppareil < ANNEE_BASSE;
  const peuDeMemoire = memoireGo !== null && memoireGo < 3.5;
  const ecranPeuDense = densite < 2.5;
  if (ancien || (peuDeMemoire && ecranPeuDense)) return "bas";
  if (
    peuDeMemoire ||
    ecranPeuDense ||
    (anneeAppareil !== null && anneeAppareil < ANNEE_MOYENNE)
  ) {
    return "moyen";
  }
  if (anneeAppareil !== null && memoireGo !== null && memoireGo >= 6) return "haut";
  return "moyen";
}
