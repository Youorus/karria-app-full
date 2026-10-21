/**
 * Le chargeur de Karria : son identité pendant l'attente.
 *
 * ═══ Repris de la V1 ═══
 *
 * Le « K » circuit du logo qui respire — il grandit de 10 % puis revient,
 * en 1,2 s — et trois points qui s'allument l'un après l'autre. C'est le
 * chargeur que les utilisateurs de la V1 connaissent ; le garder, c'est
 * garder la signature de l'application.
 *
 * ═══ Ce que la refonte y ajoute ═══
 *
 * Un halo bleu-violet qui respire avec le « K » : le chargeur appartient
 * désormais au même monde que l'aura et l'orbe.
 *
 * ═══ Où il s'emploie ═══
 *
 * Pour toute attente de l'application : démarrage, offres, détail. La
 * seule exception est l'IA qui réfléchit dans la conversation : là,
 * c'est l'orbe — Karria qui pense n'est pas l'application qui charge.
 */

import { Image } from "expo-image";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { AURA } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

const K = {
  light: require("@/assets/branding/karria-k-clair.png"),
  dark: require("@/assets/branding/karria-k-sombre.png"),
} as const;

/** Proportions du « K » d'origine : 179 × 203. */
const RAPPORT = 179 / 203;

const TAILLES = { petit: 40, moyen: 64, grand: 88 } as const;

/** La séquence des points, reprise de la V1 : 300 ms chacun, puis tous
 *  s'éteignent et une pause. Une période complète dure 1,4 s. */
const PERIODE_POINTS = 1_400;

function Point({
  progression,
  rang,
}: {
  progression: SharedValue<number>;
  rang: number;
}) {
  const style = useAnimatedStyle(() => {
    // Chaque point s'allume à son tiers de la montée et s'éteint avec les
    // autres à la fin.
    const allume = progression.value > (rang + 1) / 4 ? 1 : 0;
    return { opacity: 0.25 + allume * 0.75, transform: [{ scale: 0.6 + allume * 0.4 }] };
  });
  return (
    <Animated.View style={style}>
      <Box className="h-2 w-2 rounded-full bg-muted-foreground" />
    </Animated.View>
  );
}

interface Props {
  taille?: keyof typeof TAILLES;
  libelle?: string;
}

export function ChargeurKarria({ taille = "moyen", libelle }: Props) {
  const { mode } = useCouleurs();
  const immobile = useReducedMotion();
  const souffle = useSharedValue(1);
  const points = useSharedValue(0);
  const hauteur = TAILLES[taille];
  const halo = hauteur * 2.2;

  useEffect(() => {
    if (immobile) return;
    const courbe = Easing.bezier(0.4, 0, 0.2, 1);
    souffle.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1_200, easing: courbe }),
        withTiming(1, { duration: 1_200, easing: courbe }),
      ),
      -1,
    );
    points.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.linear }),
        withDelay(PERIODE_POINTS - 900, withTiming(0, { duration: 0 })),
      ),
      -1,
    );
  }, [immobile, souffle, points]);

  const styleK = useAnimatedStyle(() => ({ transform: [{ scale: souffle.value }] }));
  const styleHalo = useAnimatedStyle(() => ({
    opacity: 0.45 + (souffle.value - 1) * 4,
    transform: [{ scale: souffle.value }],
  }));

  return (
    <VStack
      space="md"
      className="items-center"
      accessibilityRole="progressbar"
      accessibilityLabel={libelle ?? "Chargement"}
    >
      <Box className="items-center justify-center" style={{ width: halo, height: halo }}>
        <Animated.View style={[{ position: "absolute" }, styleHalo]}>
          <Svg width={halo} height={halo}>
            <Defs>
              <RadialGradient id="halo-chargeur" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={AURA.bleu} stopOpacity={0.55} />
                <Stop offset="0.55" stopColor={AURA.violet} stopOpacity={0.2} />
                <Stop offset="1" stopColor={AURA.violet} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#halo-chargeur)" />
          </Svg>
        </Animated.View>
        <Animated.View style={styleK}>
          <Image
            source={K[mode]}
            style={{ height: hauteur, width: hauteur * RAPPORT }}
            contentFit="contain"
            accessible={false}
          />
        </Animated.View>
      </Box>
      <HStack space="xs" className="items-center">
        {[0, 1, 2].map((rang) => (
          <Point key={rang} progression={points} rang={rang} />
        ))}
      </HStack>
      {libelle !== undefined ? (
        <Texte className="text-body text-muted-foreground">{libelle}</Texte>
      ) : null}
    </VStack>
  );
}
