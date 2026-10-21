/**
 * La palette du mode courant, en une ligne.
 *
 * ═══ Pourquoi ce hook existe ═══
 *
 * Une icône `react-native-svg` prend sa couleur dans un attribut `stroke`,
 * pas dans une classe utilitaire. Elle échappe donc entièrement au thème
 * de NativeWind, et la tentation est d'y écrire la valeur hexadécimale.
 *
 * C'est ce qui s'est produit : quarante-huit couleurs d'icônes écrites en
 * dur dans le projet, toutes prises dans le **mode clair**. Sur fond
 * sombre, elles gardaient donc la teinte du mode clair — et l'une d'elles,
 * l'ambre des avertissements, n'existait même pas dans le thème.
 *
 * ═══ Pourquoi une palette entière et non un jeton à la fois ═══
 *
 * Parce que le coût d'entrée décide de l'usage. Importer `useColorScheme`,
 * calculer le mode, puis importer quatre jetons, c'est six lignes avant
 * d'écrire la première icône — et l'on recopie la valeur en dur. Ici c'est
 * un import et une ligne.
 */

import {
  AVERTISSEMENT,
  CONTOUR,
  DESTRUCTIF,
  ESTOMPE,
  FOND,
  type ModeTheme,
  PRIMAIRE,
  SECONDAIRE,
  SUCCES,
  SUR_PRIMAIRE,
  SUR_VOILE,
  SURFACE,
  TEXTE,
} from "@/theme";
import { useTheme } from "@/theme/preference";

export interface Couleurs {
  mode: ModeTheme;
  /** Le bleu d'action : ce sur quoi on peut appuyer. */
  primaire: string;
  /** Le violet de l'aura : l'analyse de Karria. */
  secondaire: string;
  /** Ce qui se pose **sur** le bleu. */
  surPrimaire: string;
  /** Présent mais pas sélectionné, ou secondaire. */
  estompe: string;
  texte: string;
  fond: string;
  surface: string;
  contour: string;
  /** Les mises en garde. Jamais sur une action — voir le thème. */
  avertissement: string;
  /** Ce qui est constaté, jamais ce qui est proposé. */
  succes: string;
  /** Les gestes qui retirent, et les contre-exemples. */
  destructif: string;
  /** Sur un voile (`bg-scrim`) : le même dans les deux modes. */
  surVoile: string;
}

export function useCouleurs(): Couleurs {
  // La **préférence**, et non `useColorScheme` : ce dernier rend le
  // réglage du système, que le sélecteur des réglages ne change pas. Les
  // classes utilitaires suivaient déjà le choix par Uniwind ; les couleurs
  // passées aux SVG restaient au thème du téléphone, ce qui donnait des
  // pictogrammes clairs sur des cartes sombres.
  const { mode } = useTheme();
  return {
    mode,
    primaire: PRIMAIRE[mode],
    secondaire: SECONDAIRE[mode],
    surPrimaire: SUR_PRIMAIRE[mode],
    estompe: ESTOMPE[mode],
    texte: TEXTE[mode],
    fond: FOND[mode],
    surface: SURFACE[mode],
    contour: CONTOUR[mode],
    avertissement: AVERTISSEMENT[mode],
    succes: SUCCES[mode],
    destructif: DESTRUCTIF[mode],
    surVoile: SUR_VOILE,
  };
}
