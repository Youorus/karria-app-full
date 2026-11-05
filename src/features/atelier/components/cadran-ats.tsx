/**
 * Le cadran du score ATS : un arc, un nombre, une phrase qui motive.
 *
 * Un arc de 270° en SVG, rempli à la mesure du score, dans la couleur de
 * l'état (vert bon, ambre moyen, rouge faible) sur le rail de la charte ;
 * le score au centre, « sur 100 » en dessous. Ni jauge à segments, ni
 * dégradé : une mesure, lisible en un regard. Le lecteur d'écran reçoit le
 * score et la phrase en une fois.
 */

import Svg, { Circle } from "react-native-svg";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { AVERTISSEMENT, CONTOUR, DESTRUCTIF, SUCCES } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { ScoreAts } from "../types/atelier.types";

const TAILLE = 168;
const EPAISSEUR = 12;
const RAYON = (TAILLE - EPAISSEUR) / 2;
const CIRCONFERENCE = 2 * Math.PI * RAYON;
/** Trois quarts de tour : l'ouverture est en bas. */
const FRACTION_VISIBLE = 0.75;

interface Props {
  score: ScoreAts;
  phrase: string;
}

export function CadranAts({ score, phrase }: Props) {
  const { mode } = useCouleurs();
  const couleur =
    score.niveau === "bon"
      ? SUCCES[mode]
      : score.niveau === "moyen"
        ? AVERTISSEMENT[mode]
        : DESTRUCTIF[mode];
  const visible = CIRCONFERENCE * FRACTION_VISIBLE;
  const rempli = (visible * Math.max(0, Math.min(100, score.score))) / 100;

  return (
    <VStack
      className="items-center gap-4"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Score de lisibilité par les logiciels de tri : ${score.score} sur 100. ${phrase}`}
    >
      <Box
        style={{ width: TAILLE, height: TAILLE }}
        className="items-center justify-center"
      >
        <Svg width={TAILLE} height={TAILLE} style={{ position: "absolute" }}>
          {/* Le rail, puis l'arc, tous deux tournés pour ouvrir vers le bas. */}
          <Circle
            cx={TAILLE / 2}
            cy={TAILLE / 2}
            r={RAYON}
            stroke={CONTOUR[mode]}
            strokeWidth={EPAISSEUR}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${visible} ${CIRCONFERENCE}`}
            transform={`rotate(135 ${TAILLE / 2} ${TAILLE / 2})`}
          />
          <Circle
            cx={TAILLE / 2}
            cy={TAILLE / 2}
            r={RAYON}
            stroke={couleur}
            strokeWidth={EPAISSEUR}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${rempli} ${CIRCONFERENCE}`}
            transform={`rotate(135 ${TAILLE / 2} ${TAILLE / 2})`}
          />
        </Svg>
        <VStack className="items-center">
          <Texte className="font-display text-hero tracking-tight text-foreground">
            {score.score}
          </Texte>
          <Texte className="text-caption text-muted-foreground">sur 100</Texte>
        </VStack>
      </Box>
      <Texte className="px-2 text-center text-body leading-6 text-foreground">
        {phrase}
      </Texte>
    </VStack>
  );
}
