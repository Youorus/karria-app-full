/**
 * Le verdict ATS : une grande indication, lue d'un coup d'œil.
 *
 * ═══ Ce qu'on doit comprendre sans lire (refonte du 2026-11-13) ═══
 *
 * Marc : « il faut que l'utilisateur comprenne que ces 97 sur 100, c'est
 * une compatibilité ATS ». Avant, un cadran et « sur 100 » — un score, dont
 * on ne savait pas de quoi. Ici : une carte teintée (vert, ambre, rouge
 * selon le niveau), l'étiquette « Validé ATS », le chiffre en très grand
 * suivi de « % », et une phrase qui dit qui a fait quoi : « Karria a rendu
 * ton CV compatible à 97 % avec les logiciels de tri. » Le sigle est
 * expliqué dessous, une fois, en petit.
 *
 * L'anneau reste : il donne la proportion sans chiffre, et il s'anime à
 * l'arrivée — la récompense du geste. Mouvement réduit : plein d'emblée.
 */

import { useEffect } from "react";
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { AVERTISSEMENT, CONTOUR, DESTRUCTIF, SUCCES } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { etiquetteVerdictAts, TEXTES, titreVerdictAts } from "../services/presentation";
import type { NiveauAts, ScoreAts } from "../types/atelier.types";

const TAILLE = 124;
const EPAISSEUR = 11;
const RAYON = (TAILLE - EPAISSEUR) / 2;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SURFACE: Record<NiveauAts, string> = {
  bon: "border-success bg-surface-success",
  moyen: "border-warning bg-surface-warning",
  faible: "border-destructive bg-surface-destructive",
};

const TEXTE: Record<NiveauAts, string> = {
  bon: "text-success",
  moyen: "text-warning",
  faible: "text-destructive",
};

function Anneau({
  score,
  couleur,
  rail,
}: {
  score: number;
  couleur: string;
  rail: string;
}) {
  const reduit = useReducedMotion();
  const avancement = useSharedValue(reduit ? score : 0);
  useEffect(() => {
    avancement.value = reduit
      ? score
      : withDelay(
          200,
          withTiming(score, { duration: 900, easing: Easing.out(Easing.cubic) }),
        );
  }, [score, reduit, avancement]);
  const props = useAnimatedProps(() => ({
    strokeDasharray: `${(CIRCONFERENCE * Math.max(0, Math.min(100, avancement.value))) / 100} ${CIRCONFERENCE}`,
  }));
  return (
    <Svg width={TAILLE} height={TAILLE} style={{ position: "absolute" }}>
      <Circle
        cx={TAILLE / 2}
        cy={TAILLE / 2}
        r={RAYON}
        stroke={rail}
        strokeWidth={EPAISSEUR}
        fill="none"
      />
      <AnimatedCircle
        cx={TAILLE / 2}
        cy={TAILLE / 2}
        r={RAYON}
        stroke={couleur}
        strokeWidth={EPAISSEUR}
        fill="none"
        strokeLinecap="round"
        animatedProps={props}
        transform={`rotate(-90 ${TAILLE / 2} ${TAILLE / 2})`}
      />
    </Svg>
  );
}

export function VerdictAts({ score }: { score: ScoreAts }) {
  const { mode } = useCouleurs();
  const couleur =
    score.niveau === "bon"
      ? SUCCES[mode]
      : score.niveau === "moyen"
        ? AVERTISSEMENT[mode]
        : DESTRUCTIF[mode];
  const titre = titreVerdictAts(score);
  const etiquette = etiquetteVerdictAts(score.niveau);

  return (
    <VStack
      className={`gap-4 rounded-carte border-[1.5px] p-5 ${SURFACE[score.niveau]}`}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${etiquette}. ${titre} ${TEXTES.atsVerdictSous}`}
    >
      <HStack className="items-center justify-between gap-3">
        <HStack className="items-center gap-1.5">
          <Icone nom="bouclier" couleur={couleur} taille={13} graisse="bold" />
          <Texte className="text-caption font-bold uppercase tracking-wide text-muted-foreground">
            {TEXTES.atsVerdictSur}
          </Texte>
        </HStack>
        <HStack
          className="items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ backgroundColor: couleur }}
        >
          <Icone
            nom={score.niveau === "bon" ? "coche" : "eclair"}
            couleur="#ffffff"
            taille={11}
            graisse="bold"
          />
          <Texte className="text-caption font-bold text-on-scrim">{etiquette}</Texte>
        </HStack>
      </HStack>

      <HStack className="items-center gap-5">
        <Box
          style={{ width: TAILLE, height: TAILLE }}
          className="items-center justify-center"
        >
          <Anneau score={score.score} couleur={couleur} rail={CONTOUR[mode]} />
          <HStack className="items-baseline">
            <Texte
              className={`font-display text-hero tracking-tight ${TEXTE[score.niveau]}`}
            >
              {score.score}
            </Texte>
            <Texte className={`font-display text-title-sm ${TEXTE[score.niveau]}`}>
              %
            </Texte>
          </HStack>
        </Box>
        <VStack className="flex-1 gap-1.5">
          <Texte className="font-display text-title-sm leading-6 tracking-tight text-foreground">
            {titre}
          </Texte>
        </VStack>
      </HStack>

      <Texte className="text-caption leading-4 text-muted-foreground">
        {TEXTES.atsVerdictSous}
      </Texte>
    </VStack>
  );
}
