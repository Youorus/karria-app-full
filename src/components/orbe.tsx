/**
 * L'orbe : le visage de Karria.
 *
 * ═══ Pourquoi une forme et pas un avatar ═══
 *
 * Un visage dessiné fixe une personnalité qu'on ne contrôle pas, et vieillit
 * mal. Une sphère de lumière aux couleurs de la marque se lit tout de suite
 * comme « l'IA », et peut exprimer un état sans un mot : elle respire au
 * repos, elle pulse quand elle réfléchit. C'est le langage qu'ont imposé
 * Siri, ChatGPT en mode vocal et Meta AI.
 *
 * ═══ Construction ═══
 *
 * Deux couches : un halo large et diffus, puis la sphère elle-même, dont le
 * point lumineux est décentré vers le haut à gauche — c'est ce décalage, et
 * lui seul, qui la fait lire comme un volume plutôt qu'un disque plat.
 * Le « K » de la marque est posé au centre, en blanc.
 *
 * ═══ Mouvement réduit ═══
 *
 * Respecté : l'orbe reste fixe, seul son éclat change d'un état à l'autre.
 */

import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { SymboleKarria } from "@/components/marque";
import { Box } from "@/components/ui/box";

import { AURA } from "@/theme";

interface Props {
  taille?: number;
  /** L'IA réfléchit : l'orbe pulse. */
  active?: boolean;
}

export function Orbe({ taille = 160, active = false }: Props) {
  const immobile = useReducedMotion();
  const pulsation = useSharedValue(0);

  useEffect(() => {
    if (immobile) {
      pulsation.value = withTiming(active ? 1 : 0, { duration: 300 });
      return;
    }
    pulsation.value = withRepeat(
      withTiming(1, {
        duration: active ? 700 : 3_600,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [active, immobile, pulsation]);

  const styleHalo = useAnimatedStyle(() => ({
    opacity: 0.55 + pulsation.value * (active ? 0.45 : 0.2),
    transform: [{ scale: immobile ? 1 : 1 + pulsation.value * (active ? 0.12 : 0.05) }],
  }));

  const styleSphere = useAnimatedStyle(() => ({
    transform: [{ scale: immobile ? 1 : 1 + pulsation.value * (active ? 0.05 : 0.02) }],
  }));

  // La boîte est deux fois la sphère : le halo déborde de moitié.
  const boite = taille * 2;
  const centre = boite / 2;
  const rayon = taille / 2;

  return (
    <Animated.View
      style={{ width: boite, height: boite }}
      accessibilityRole="image"
      accessibilityLabel={active ? "Karria réfléchit" : "Karria"}
    >
      <Animated.View
        style={[{ position: "absolute", width: boite, height: boite }, styleHalo]}
      >
        <Svg width={boite} height={boite}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.25" stopColor={AURA.bleu} stopOpacity={0.55} />
              <Stop offset="0.6" stopColor={AURA.violet} stopOpacity={0.18} />
              <Stop offset="1" stopColor={AURA.violet} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={centre} cy={centre} r={centre} fill="url(#halo)" />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[{ position: "absolute", width: boite, height: boite }, styleSphere]}
      >
        <Svg width={boite} height={boite}>
          <Defs>
            <RadialGradient id="sphere" cx="38%" cy="32%" r="75%">
              <Stop offset="0" stopColor={AURA.glacier} />
              <Stop offset="0.45" stopColor={AURA.bleu} />
              <Stop offset="1" stopColor={AURA.violet} />
            </RadialGradient>
          </Defs>
          <Circle cx={centre} cy={centre} r={rayon} fill="url(#sphere)" />
        </Svg>
        {/* Le « K » de Karria, en blanc, au centre de la sphère : l'orbe
         *est* Karria, pas une décoration à côté du logo. */}
        <Box className="absolute inset-0 items-center justify-center">
          <SymboleKarria taille={rayon * 0.82} teinte="reflet" />
        </Box>
      </Animated.View>
    </Animated.View>
  );
}
