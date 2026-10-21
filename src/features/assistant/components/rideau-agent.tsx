/**
 * Le rideau : la transition qui balaie le fil pour faire apparaître Karria.
 *
 * ═══ Ce que l'on voit ═══
 *
 * On touche « Demander à Karria… ». Une onde de lumière part de la barre,
 * en bas de l'écran, et grandit jusqu'à couvrir tout l'écran ; son front
 * est un anneau bleu-violet, l'intérieur est le fond de Karria. Pendant
 * qu'elle passe, le fil recule — il rétrécit, s'arrondit, s'efface — comme
 * une page qu'on écarte. Puis l'agent monte en fondu. À la fermeture, la
 * même chose à l'envers : l'onde se résorbe vers la barre et le fil revient.
 *
 * ═══ Pourquoi une scène et non une route ═══
 *
 * Une navigation ne sait faire que des transitions de pile (glisser,
 * fondre, monter en feuille). Ici, deux plans d'une même scène bougent
 * ensemble sur une seule progression (`p`, de 0 à 1) : le fil, l'onde et
 * l'agent sont synchronisés par construction, et le fil revient
 * exactement où on l'avait laissé.
 *
 * ═══ L'agent reste monté ═══
 *
 * Invisible et inerte quand le rideau est fermé (`pointerEvents`), mais
 * monté : la conversation survit à un aller-retour vers les offres.
 *
 * ═══ Mouvement réduit ═══
 *
 * Respecté : un simple fondu, sans onde ni recul.
 */

import { useEffect, type ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { AURA, FOND } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { PanneauAgent } from "./panneau-agent";

/** Une courbe qui part vite et se pose doucement : l'onde « jaillit ». */
const COURBE = Easing.bezier(0.2, 0.8, 0.2, 1);
const DUREE_OUVERTURE = 750;
const DUREE_FERMETURE = 550;

/** Le centre de l'onde : la barre « Demander à Karria… », à 60 points du
 *  bas de la zone sûre. */
const HAUTEUR_BARRE = 60;

const PLEIN_ECRAN = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

interface Props {
  ouvert: boolean;
  onFermer: () => void;
  /** Le fil des offres, que le rideau écarte. */
  children: ReactNode;
}

export function RideauAgent({ ouvert, onFermer, children }: Props) {
  const { width: L, height: H } = useWindowDimensions();
  const { bottom } = useSafeAreaInsets();
  const { mode } = useCouleurs();
  const reduit = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    p.set(
      withTiming(ouvert ? 1 : 0, {
        duration: reduit ? 250 : ouvert ? DUREE_OUVERTURE : DUREE_FERMETURE,
        easing: COURBE,
      }),
    );
  }, [ouvert, reduit, p]);

  // L'onde doit atteindre le coin le plus éloigné de son centre : le
  // haut de l'écran, côté gauche ou droit.
  const cy = H - bottom - HAUTEUR_BARRE / 2;
  const rayon = Math.hypot(L / 2, cy) * 1.08;
  const diametre = rayon * 2;

  const styleFil = useAnimatedStyle(() => {
    if (reduit) return { opacity: 1 - p.value };
    return {
      opacity: interpolate(p.value, [0, 0.55], [1, 0], "clamp"),
      borderRadius: interpolate(p.value, [0, 0.4], [0, 44], "clamp"),
      transform: [
        { translateY: interpolate(p.value, [0, 1], [0, -H * 0.06]) },
        { scale: interpolate(p.value, [0, 1], [1, 0.9]) },
      ],
    };
  });

  const styleOnde = useAnimatedStyle(() => ({
    opacity: reduit ? 0 : interpolate(p.value, [0, 0.05, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ scale: interpolate(p.value, [0, 0.85], [0.02, 1], "clamp") }],
  }));

  const styleAgent = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.45, 0.9], [0, 1], "clamp"),
    transform: [
      { translateY: reduit ? 0 : interpolate(p.value, [0.45, 1], [36, 0], "clamp") },
    ],
  }));

  return (
    <View style={{ flex: 1 }}>
      <Animated.View
        style={[{ flex: 1, overflow: "hidden" }, styleFil]}
        pointerEvents={ouvert ? "none" : "auto"}
      >
        {children}
      </Animated.View>

      {/* L'onde : un disque centré sur la barre, qui grandit jusqu'à
          couvrir l'écran. Fond de Karria au cœur, anneau d'aura au front. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: diametre,
            height: diametre,
            left: L / 2 - rayon,
            top: cy - rayon,
          },
          styleOnde,
        ]}
      >
        <Svg width={diametre} height={diametre}>
          <Defs>
            <RadialGradient id="onde" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={FOND[mode]} stopOpacity={1} />
              <Stop offset="0.8" stopColor={FOND[mode]} stopOpacity={1} />
              <Stop offset="0.9" stopColor={AURA.violet} stopOpacity={0.85} />
              <Stop offset="0.96" stopColor={AURA.bleu} stopOpacity={0.6} />
              <Stop offset="1" stopColor={AURA.glacier} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={rayon} cy={rayon} r={rayon} fill="url(#onde)" />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[PLEIN_ECRAN, styleAgent]}
        pointerEvents={ouvert ? "auto" : "none"}
        accessibilityElementsHidden={!ouvert}
        importantForAccessibility={ouvert ? "auto" : "no-hide-descendants"}
      >
        <PanneauAgent onFermer={onFermer} />
      </Animated.View>
    </View>
  );
}
