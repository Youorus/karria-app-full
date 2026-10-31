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
 *   L'utilisateur voit l'IA travailler sans lire un indicateur ;
 * - `ecoute` — l'utilisateur dicte —, elle respire un peu plus vite et
 *   **suit la voix** : le niveau du micro (`niveau`, valeur partagée lue sur
 *   le fil d'interface) gonfle légèrement le calque. Le téléphone montre
 *   qu'il entend, sans vumètre.
 *
 * ═══ Mouvement réduit ═══
 *
 * Si le réglage d'accessibilité « réduire les animations » est actif, les
 * nappes restent immobiles. Une animation permanente peut donner la
 * nausée ; le réglage existe pour cela, et on le respecte sans condition.
 *
 * ═══ Ce que ça coûte, et ce qu'on s'autorise par appareil ═══
 *
 * Chaque nappe est un dégradé radial dessiné une fois puis déplacé par le
 * compositeur ; leur rayon dépasse la largeur de l'écran — deux à trois
 * fois la surface de l'écran à fusionner à chaque image — et le calque qui les porte change d'opacité et
 * d'échelle, ce qui force le compositeur à le dessiner hors écran puis à
 * le recomposer. Sur un Android d'entrée de gamme, ce seul fond prend la
 * moitié du budget de 16 ms. Le palier visuel (`hooks/qualite-visuelle.ts`)
 * tranche : **haut**, tout ; **moyen**, la dérive mais plus de souffle
 * (opacité et échelle fixes, donc pas de calque hors écran) ; **bas**, une
 * image fixe. Et quel que soit le palier, l'aura ne bouge que si son écran
 * est au premier plan : les cinq onglets portent chacun la leur, et quatre
 * fonds animés hors écran coûtaient autant que le cinquième.
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
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
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
import { useAnimationActive, useQualiteVisuelle } from "@/hooks/use-qualite-visuelle";
import { AURA, FOND } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

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
  /** L'utilisateur dicte : l'aura respire plus vite et suit la voix. */
  ecoute?: boolean;
  /** Le niveau de la voix, de 0 à 1, sur le fil d'interface. */
  niveau?: SharedValue<number>;
  /** Fondu vers le fond en bas d'écran, pour asseoir un contenu. */
  assise?: boolean;
}

/**
 * Une nappe : son dégradé est dessiné **une seule fois**, dans une vue à sa
 * taille, et c'est la vue qui se déplace. Animer `cx`/`cy` d'un cercle SVG
 * obligeait react-native-svg à redessiner tout l'écran à chaque image — sur
 * iOS, au processeur et sur le fil principal, en concurrence avec les
 * gestes et la navigation : c'était la latence ressentie à l'ouverture.
 * Une translation, elle, ne coûte qu'au compositeur.
 */
function NappeAnimee({
  nappe,
  largeur,
  hauteur,
  intensite,
  immobile,
}: {
  nappe: Nappe;
  largeur: number;
  hauteur: number;
  intensite: number;
  immobile: boolean;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (immobile) {
      // Arrêter là où elle est : repartir de zéro ferait sauter la nappe.
      cancelAnimation(t);
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: nappe.periode, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [immobile, nappe.periode, t]);

  const style = useAnimatedStyle(() => {
    // Une trajectoire en ellipse plutôt qu'en ligne : un aller-retour
    // rectiligne se lit tout de suite comme une animation.
    const angle = t.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.cos(angle) * nappe.derive * largeur },
        { translateY: Math.sin(angle) * nappe.derive * largeur },
      ],
    };
  });

  const rayon = nappe.rayon * largeur;
  const diametre = rayon * 2;
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: nappe.x * largeur - rayon,
          top: nappe.y * hauteur - rayon,
          width: diametre,
          height: diametre,
        },
        style,
      ]}
    >
      <Svg width={diametre} height={diametre} accessible={false}>
        <Defs>
          <RadialGradient id={nappe.id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={nappe.couleur} stopOpacity={intensite} />
            <Stop
              offset="0.45"
              stopColor={nappe.couleur}
              stopOpacity={intensite * 0.35}
            />
            <Stop offset="1" stopColor={nappe.couleur} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={rayon} cy={rayon} r={rayon} fill={`url(#${nappe.id})`} />
      </Svg>
    </Animated.View>
  );
}

export function Aura({ active = false, ecoute = false, niveau, assise = false }: Props) {
  const { width: largeur, height: hauteur } = useWindowDimensions();
  const { mode } = useCouleurs();
  const palier = useQualiteVisuelle();
  const anime = useAnimationActive();
  const intensite = INTENSITE[mode];
  // Les nappes dérivent sauf en bas de gamme ; le souffle (opacité et
  // échelle du calque entier) est réservé au haut de gamme.
  const derive = anime && palier !== "bas";
  const souffleAnime = anime && palier === "haut";

  // L'intensité globale : une respiration lente au repos, plus ample et
  // plus rapide quand l'IA travaille, entre les deux quand elle écoute.
  const souffle = useSharedValue(0.85);
  useEffect(() => {
    if (!souffleAnime) {
      cancelAnimation(souffle);
      souffle.value = withTiming(active ? 1 : 0.85, { duration: 400 });
      return;
    }
    souffle.value = active
      ? withRepeat(
          withTiming(1.15, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        )
      : ecoute
        ? withRepeat(
            withTiming(1.02, { duration: 1_600, easing: Easing.inOut(Easing.quad) }),
            -1,
            true,
          )
        : withRepeat(
            withTiming(1, { duration: 4_200, easing: Easing.inOut(Easing.quad) }),
            -1,
            true,
          );
    return () => cancelAnimation(souffle);
  }, [active, ecoute, souffleAnime, souffle]);

  // La voix ne gonfle le calque que là où le souffle est déjà animé : en
  // dessous, le calque hors écran qu'elle forcerait coûte trop cher.
  const silence = useSharedValue(0);
  const voix = niveau ?? silence;
  const suitLaVoix = souffleAnime && ecoute;
  const styleSouffle = useAnimatedStyle(() => {
    const gonflement = suitLaVoix ? voix.get() * 0.12 : 0;
    return {
      opacity: Math.min(1, souffle.value + gonflement),
      transform: [{ scale: 0.96 + souffle.value * 0.06 + gonflement * 0.4 }],
    };
  });

  return (
    <Box pointerEvents="none" className="absolute inset-0">
      <Animated.View style={[PLEIN_ECRAN, styleSouffle]}>
        {NAPPES.map((nappe) => (
          <NappeAnimee
            key={nappe.id}
            nappe={nappe}
            largeur={largeur}
            hauteur={hauteur}
            intensite={intensite}
            immobile={!derive}
          />
        ))}
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
