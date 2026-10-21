/**
 * L'aura : le fond vivant qui donne à Karria sa présence.
 *
 * ═══ Ce qu'elle doit produire ═══
 *
 * La sensation d'être *avec* quelqu'un plutôt que *dans* une application.
 * C'est ce que font ChatGPT, Claude ou Meta AI avec leurs halos : une
 * lumière qui respire lentement derrière la conversation. Trois nappes de
 * couleur — le bleu néon, le violet et le bleu glacier de la marque —
 * dérivent chacune à son rythme ; leurs périodes ne se divisent pas, donc
 * la figure ne se répète jamais à l'identique.
 *
 * ═══ Deux états ═══
 *
 * - au repos, elle respire à peine ;
 * - `active` — l'IA réfléchit ou parle —, elle s'intensifie et accélère.
 *   L'utilisateur voit l'IA travailler sans lire un indicateur.
 *
 * ═══ Mouvement réduit ═══
 *
 * Si le réglage d'accessibilité « réduire les animations » est actif, les
 * nappes restent immobiles. Une animation permanente peut donner la
 * nausée ; le réglage existe pour cela, et on le respecte sans condition.
 *
 * ═══ Pourquoi des `style` ici ═══
 *
 * Les positions et rayons sont calculés depuis la taille de l'écran, et
 * les propriétés animées passent par Reanimated : aucune classe ne peut
 * les porter. C'est l'exception prévue par AGENTS.md §3.2 pour les API
 * natives.
 */

import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { Box } from "@/components/ui/box";
import { AURA, FOND } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

const CercleAnime = Animated.createAnimatedComponent(Circle);

/** Recouvrir tout l'écran. En objet et non en classe : `Animated.View` et
 *  `<Svg>` reçoivent des styles natifs, pas des classes. */
const PLEIN_ECRAN = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

/** L'opacité au cœur de chaque nappe. Le sombre en supporte davantage :
 *  sur fond nuit, la même valeur paraît deux fois plus faible. */
const INTENSITE = { light: 0.32, dark: 0.55 } as const;

interface Nappe {
  id: string;
  couleur: string;
  /** Position de départ, en fraction de l'écran. */
  x: number;
  y: number;
  /** Rayon, en fraction de la largeur. */
  rayon: number;
  /** Amplitude de la dérive, en fraction de la largeur. */
  derive: number;
  /** Période d'un aller, en millisecondes. Premières entre elles. */
  periode: number;
}

const NAPPES: Nappe[] = [
  {
    id: "bleu",
    couleur: AURA.bleu,
    x: 0.18,
    y: 0.16,
    rayon: 0.85,
    derive: 0.12,
    periode: 7_300,
  },
  {
    id: "violet",
    couleur: AURA.violet,
    x: 0.92,
    y: 0.34,
    rayon: 0.8,
    derive: 0.14,
    periode: 9_100,
  },
  {
    id: "glacier",
    couleur: AURA.glacier,
    x: 0.5,
    y: -0.04,
    rayon: 0.6,
    derive: 0.1,
    periode: 11_300,
  },
];

interface Props {
  /** L'IA réfléchit ou parle : l'aura s'intensifie. */
  active?: boolean;
  /** Fondu vers le fond en bas d'écran, pour asseoir un contenu. */
  assise?: boolean;
}

function NappeAnimee({
  nappe,
  largeur,
  hauteur,
  immobile,
}: {
  nappe: Nappe;
  largeur: number;
  hauteur: number;
  immobile: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (immobile) return;
    t.value = withRepeat(
      withTiming(1, { duration: nappe.periode, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [immobile, nappe.periode, t]);

  const proprietes = useAnimatedProps(() => {
    // Une trajectoire en ellipse plutôt qu'en ligne : un aller-retour
    // rectiligne se lit tout de suite comme une animation.
    const angle = t.value * Math.PI * 2;
    return {
      cx: (nappe.x + Math.cos(angle) * nappe.derive) * largeur,
      cy: nappe.y * hauteur + Math.sin(angle) * nappe.derive * largeur,
    };
  });

  return (
    <CercleAnime
      animatedProps={proprietes}
      cx={nappe.x * largeur}
      cy={nappe.y * hauteur}
      r={nappe.rayon * largeur}
      fill={`url(#${nappe.id})`}
    />
  );
}

export function Aura({ active = false, assise = false }: Props) {
  const { width: largeur, height: hauteur } = useWindowDimensions();
  const { mode } = useCouleurs();
  const immobile = useReducedMotion();
  const intensite = INTENSITE[mode];

  // L'intensité globale : une respiration lente au repos, plus ample et
  // plus rapide quand l'IA travaille.
  const souffle = useSharedValue(0.85);
  useEffect(() => {
    if (immobile) {
      souffle.value = withTiming(active ? 1 : 0.85, { duration: 400 });
      return;
    }
    souffle.value = active
      ? withRepeat(
          withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        )
      : withRepeat(
          withTiming(1, { duration: 4_200, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        );
  }, [active, immobile, souffle]);

  const styleSouffle = useAnimatedStyle(() => ({
    opacity: Math.min(1, souffle.value),
    transform: [{ scale: 0.96 + souffle.value * 0.06 }],
  }));

  return (
    <Box pointerEvents="none" className="absolute inset-0">
      <Animated.View style={[PLEIN_ECRAN, styleSouffle]}>
        <Svg width={largeur} height={hauteur} accessible={false}>
          <Defs>
            {NAPPES.map((nappe) => (
              <RadialGradient key={nappe.id} id={nappe.id} cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={nappe.couleur} stopOpacity={intensite} />
                <Stop
                  offset="0.45"
                  stopColor={nappe.couleur}
                  stopOpacity={intensite * 0.35}
                />
                <Stop offset="1" stopColor={nappe.couleur} stopOpacity={0} />
              </RadialGradient>
            ))}
          </Defs>
          {NAPPES.map((nappe) => (
            <NappeAnimee
              key={nappe.id}
              nappe={nappe}
              largeur={largeur}
              hauteur={hauteur}
              immobile={immobile}
            />
          ))}
        </Svg>
      </Animated.View>
      {assise ? (
        <Svg width={largeur} height={hauteur} style={PLEIN_ECRAN} accessible={false}>
          <Defs>
            <LinearGradient
              id="assise"
              x1={0}
              y1={hauteur * 0.45}
              x2={0}
              y2={hauteur}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor={FOND[mode]} stopOpacity={0} />
              <Stop offset="1" stopColor={FOND[mode]} stopOpacity={0.92} />
            </LinearGradient>
          </Defs>
          <Rect
            x={0}
            y={hauteur * 0.45}
            width={largeur}
            height={hauteur * 0.55}
            fill="url(#assise)"
          />
        </Svg>
      ) : null}
    </Box>
  );
}
