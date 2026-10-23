/**
 * La matière de l'orbe vivante : les particules, leur mouvement, leurs
 * couleurs — en mathématiques pures, sans Skia ni React.
 *
 * ═══ Pourquoi un fichier à part ═══
 *
 * Tout ce qui se calcule ici tourne sur le fil d'interface, à chaque
 * image, pour quelques milliers de points. On veut pouvoir l'éprouver
 * sans moteur de rendu : le nombre de particules par taille, la roue
 * chromatique complète, une déformation qui reste bornée. Jest n'exécute
 * pas Skia ; il exécute ceci.
 *
 * `"worklet"` : la fonction de déplacement est appelée depuis un
 * modificateur Reanimated, donc sur le fil d'interface. Sans la
 * directive, l'appel traverserait le pont à chaque particule.
 *
 * ═══ Le plafond par appareil ═══
 *
 * La surface d'une sphère grandit au carré de son diamètre : le nombre de
 * particules aussi, pour que la densité reste la même du petit témoin de
 * réflexion (16 pt) à l'orbe d'accueil (120 pt). Android reçoit moins :
 * son compositeur et ses écrans d'entrée de gamme tiennent 60 images par
 * seconde avec moins de marge, et un écran peu dense (ratio < 2,5)
 * trahit un appareil modeste. Entre 120 et 2 600 : en dessous, la sphère
 * se lit comme une poignée de points ; au-dessus, le gain ne se voit plus.
 */

export const PARTICULES_MIN = 120;
export const PARTICULES_MAX = 2_600;

/** La part des particules qui gravitent **autour** de la sphère, comme
 *  les grains épars de la référence, plutôt qu'à sa surface. */
export const PART_SATELLITES = 0.12;

export function nombreDeParticules(
  taille: number,
  plateforme: "ios" | "android" | string,
  densite: number,
): number {
  const base = taille * taille * 0.25;
  const facteur = plateforme === "android" ? (densite < 2.5 ? 0.45 : 0.7) : 1;
  return Math.round(Math.min(PARTICULES_MAX, Math.max(PARTICULES_MIN, base * facteur)));
}

/** La graine d'une particule : sa direction sur la sphère unité, sa phase
 *  propre et, pour un satellite, son rayon d'orbite (> 1). Des tableaux
 *  plats de nombres : c'est ce qui se copie le mieux vers le fil
 *  d'interface. */
export interface Graine {
  x: number[];
  y: number[];
  z: number[];
  phase: number[];
  rayon: number[];
}

/**
 * Répartit `n` points sur la sphère par la spirale de Fibonacci : des
 * points à peu près équidistants, sans amas aux pôles — ce qu'une
 * répartition aléatoire ne donne jamais. Le générateur pseudo-aléatoire
 * est déterministe (graine fixe) : deux orbes de même taille sont
 * jumelles, et un instantané de test est stable.
 */
export function semerLesParticules(n: number): Graine {
  const graine: Graine = { x: [], y: [], z: [], phase: [], rayon: [] };
  const satellites = Math.round(n * PART_SATELLITES);
  const surface = n - satellites;
  let alea = 1_234_567;
  const suivant = () => {
    // Un générateur linéaire congruentiel suffit : on veut de la variété,
    // pas de la cryptographie.
    alea = (alea * 1_103_515_245 + 12_345) % 2_147_483_648;
    return alea / 2_147_483_648;
  };
  const dore = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i += 1) {
    const enSurface = i < surface;
    const total = enSurface ? surface : satellites;
    const rang = enSurface ? i : i - surface;
    const y = 1 - (2 * (rang + 0.5)) / total;
    const r = Math.sqrt(1 - y * y);
    const theta = dore * rang;
    graine.x.push(Math.cos(theta) * r);
    graine.y.push(y);
    graine.z.push(Math.sin(theta) * r);
    graine.phase.push(suivant() * Math.PI * 2);
    graine.rayon.push(enSurface ? 1 : 1.12 + suivant() * 0.4);
  }
  return graine;
}

/** Ce que le déplacement produit pour une particule : sa position à
 *  l'écran (normalisée, de -1 à 1 autour du centre) et sa profondeur
 *  (1 vers le regard, -1 derrière). */
export interface Position {
  x: number;
  y: number;
  profondeur: number;
}

/** L'inclinaison fixe de l'axe de rotation : la sphère ne tourne pas
 *  comme un globe posé droit, on en voit le pôle. */
const INCLINAISON = 0.42;

/**
 * Où est la particule `i` à l'instant `t` (secondes).
 *
 * Trois mouvements superposés :
 * 1. la sphère tourne lentement sur un axe incliné ;
 * 2. chaque particule dérive le long de la surface, à son rythme
 *    (`phase`) — la matière coule, elle ne tourne pas d'un bloc ;
 * 3. le rayon ondule par trois sinusoïdes de fréquences non multiples,
 *    sur l'amplitude donnée : c'est la déformation « substance en
 *    mouvement » de la référence, et elle reste dans
 *    [1 - 1,6 · amplitude ; 1 + 1,6 · amplitude].
 *
 * Les satellites orbitent plus loin et plus lentement, à peine déformés.
 */
export function deplacer(g: Graine, i: number, t: number, amplitude: number): Position {
  "worklet";
  const phase = g.phase[i] ?? 0;
  const orbite = g.rayon[i] ?? 1;
  const satellite = orbite > 1;
  const x0 = g.x[i] ?? 0;
  const y0 = g.y[i] ?? 0;
  const z0 = g.z[i] ?? 0;

  // 1 + 2 : rotation globale, plus une dérive propre à la particule.
  const a = t * (satellite ? 0.12 : 0.22) + Math.sin(t * 0.31 + phase) * 0.18;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const x1 = x0 * ca + z0 * sa;
  const z1 = -x0 * sa + z0 * ca;
  const y1 = y0 + (satellite ? 0 : Math.sin(t * 0.47 + phase * 1.3) * 0.05);

  // 3 : l'ondulation du rayon.
  const onde =
    Math.sin(3.1 * x1 + t * 1.1 + phase) * Math.sin(2.3 * y1 - t * 0.9) +
    0.6 * Math.sin(4.2 * z1 + t * 0.7 + 1.7 * phase);
  const r = orbite * (1 + (satellite ? amplitude * 0.3 : amplitude) * onde);

  // L'inclinaison, puis la projection orthographique : on garde x et y,
  // z devient la profondeur.
  const ci = Math.cos(INCLINAISON);
  const si = Math.sin(INCLINAISON);
  const y2 = y1 * ci - z1 * si;
  const z2 = y1 * si + z1 * ci;
  return { x: x1 * r, y: y2 * r, profondeur: z2 };
}

/**
 * La roue chromatique complète, en `n` teintes réparties sur 360°, la
 * première répétée à la fin pour que le dégradé balayé se referme sans
 * couture. Saturation et luminosité fixes, vives : c'est le tourbillon
 * derrière la sphère, pas une couleur de charte — c'est le spectre
 * entier, par définition hors du thème.
 */
export function roueChromatique(n: number): string[] {
  const teintes: string[] = [];
  for (let i = 0; i < n; i += 1) {
    teintes.push(`hsl(${Math.round((360 * i) / n)}, 100%, 62%)`);
  }
  teintes.push(teintes[0] ?? "hsl(0, 100%, 62%)");
  return teintes;
}

/** `#1e90ff` → `[0.118, 0.565, 1]` : les composantes qu'un tampon de
 *  couleurs Skia attend, calculées une fois, hors du fil d'interface. */
export function versComposantes(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
