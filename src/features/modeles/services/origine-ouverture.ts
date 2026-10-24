/**
 * D'où part l'ouverture d'un modèle : le cadre de sa vignette à l'écran,
 * au moment du toucher.
 *
 * ═══ Pourquoi un relais en mémoire ═══
 *
 * Sur Android, il n'y a pas de zoom natif carte → détail (le
 * `Link.AppleZoom` d'iOS 18). On le refait à la main : la carte mesure sa
 * vignette quand on la touche, le détail lit ce cadre et fait grandir son
 * carrousel **depuis** lui. Les deux écrans ne se voient pas ; ce relais
 * est le seul lien entre eux. Une mesure ne se lit qu'une fois et
 * n'a plus de sens au-delà d'une seconde : un détail ouvert par un lien
 * profond, ou bien plus tard, monte sans zoom.
 */

export interface Cadre {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

const FRAICHEUR_MS = 1_000;

let derniere: { id: string; cadre: Cadre; a: number } | null = null;

export function retenirOrigine(id: string, cadre: Cadre, maintenant = Date.now()): void {
  derniere = { id, cadre, a: maintenant };
}

/** Le cadre de départ de ce modèle, s'il vient d'être touché ; consommé. */
export function prendreOrigine(id: string, maintenant = Date.now()): Cadre | null {
  const lue = derniere;
  derniere = null;
  if (lue === null || lue.id !== id || maintenant - lue.a > FRAICHEUR_MS) return null;
  return lue.cadre;
}

/**
 * La transformation qui pose une cible (le carrousel) exactement sur le
 * cadre d'origine (la vignette) : on l'anime ensuite vers l'identité.
 * Échelle uniforme sur la largeur — vignette et page ont le même format,
 * à quelques points près.
 */
export function transformationDepuis(
  origine: Cadre,
  cible: Cadre,
): { dx: number; dy: number; echelle: number } {
  const echelle = origine.largeur / cible.largeur;
  return {
    dx: origine.x + origine.largeur / 2 - (cible.x + cible.largeur / 2),
    dy: origine.y + origine.hauteur / 2 - (cible.y + cible.hauteur / 2),
    echelle,
  };
}
