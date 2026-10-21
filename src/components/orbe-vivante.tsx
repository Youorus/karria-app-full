/**
 * L'orbe vivante : Karria, en petit, qui vit.
 *
 * ═══ Ce qui la fait vivre ═══
 *
 * Quatre mouvements superposés, tous dérivés d'une **seule horloge** de
 * 12 s qui boucle sans couture :
 *
 * 1. **La lumière intérieure** — deux nappes (glacier et violet) glissent
 *    dans la sphère sur des trajectoires différentes, comme un liquide
 *    éclairé de l'intérieur. La sphère ne paraît jamais deux fois la même.
 * 2. **La flottaison** — la sphère dérive de quelques points et se
 *    déforme imperceptiblement (largeur et hauteur ne battent pas
 *    ensemble) : un être, pas un bouton.
 * 3. **Les particules** — cinq étincelles tournent autour, chacune à son
 *    rayon, sa vitesse et sa phase, et s'allument puis s'éteignent.
 * 4. **Le halo** — une lueur bleu-violet qui respire derrière.
 *
 * ═══ Pourquoi une seule horloge ═══
 *
 * Chaque mouvement en tire sa propre fréquence par un multiple entier :
 * à la fin des 12 s, tout revient exactement au départ, donc la boucle
 * n'a pas de saut. Et un seul `withRepeat` à animer plutôt que quinze,
 * sur le fil natif.
 *
 * Mouvement réduit : l'orbe reste fixe, sans particules.
 *
 * C'est la **même** orbe sur le bouton du fil et dans l'agent : on touche
 * la petite, la grande nous accueille — un seul personnage.
 */

import { useEffect, type ReactNode } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Box } from "@/components/ui/box";
import { AURA } from "@/theme";

const PERIODE_MS = 12_000;
const DEUX_PI = Math.PI * 2;

/** Les étincelles : rayon (× rayon de l'orbe), tours par période, phase,
 *  taille en points. Des tours entiers : la boucle reste sans couture. */
const PARTICULES = [
  { rayon: 0.86, tours: 2, phase: 0.0, taille: 3.5, couleur: AURA.glacier },
  { rayon: 1.02, tours: -3, phase: 0.27, taille: 2.5, couleur: AURA.violet },
  { rayon: 0.94, tours: 4, phase: 0.55, taille: 2, couleur: AURA.bleu },
  { rayon: 1.12, tours: -2, phase: 0.71, taille: 3, couleur: AURA.glacier },
  { rayon: 0.9, tours: 5, phase: 0.86, taille: 2, couleur: AURA.violet },
] as const;

function Nappe({
  temps,
  taille,
  couleur,
  frequences,
}: {
  temps: SharedValue<number>;
  taille: number;
  couleur: string;
  frequences: [number, number];
}) {
  const style = useAnimatedStyle(() => {
    const a = temps.value * DEUX_PI;
    return {
      transform: [
        { translateX: Math.cos(a * frequences[0]) * taille * 0.22 },
        { translateY: Math.sin(a * frequences[1]) * taille * 0.22 },
      ],
    };
  });
  const r = taille * 0.42;
  return (
    <Animated.View
      style={[{ position: "absolute", left: taille / 2 - r, top: taille / 2 - r }, style]}
    >
      <Svg width={r * 2} height={r * 2}>
        <Defs>
          <RadialGradient id={`nappe-${couleur}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={couleur} stopOpacity={0.95} />
            <Stop offset="1" stopColor={couleur} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r} fill={`url(#nappe-${couleur})`} />
      </Svg>
    </Animated.View>
  );
}

function Particule({
  temps,
  rayonOrbe,
  centre,
  particule,
}: {
  temps: SharedValue<number>;
  rayonOrbe: number;
  centre: number;
  particule: (typeof PARTICULES)[number];
}) {
  const style = useAnimatedStyle(() => {
    const angle = (temps.value * particule.tours + particule.phase) * DEUX_PI;
    // Le rayon respire un peu : la particule ne trace pas un cercle parfait.
    const rayon = rayonOrbe * particule.rayon * (1 + 0.08 * Math.sin(angle * 2));
    return {
      opacity: 0.25 + 0.75 * Math.max(0, Math.sin(angle * 1.5 + particule.phase * 7)),
      transform: [
        { translateX: centre + Math.cos(angle) * rayon - particule.taille / 2 },
        { translateY: centre + Math.sin(angle) * rayon - particule.taille / 2 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: particule.taille,
          height: particule.taille,
          borderRadius: particule.taille / 2,
          backgroundColor: particule.couleur,
        },
        style,
      ]}
    />
  );
}

interface Props {
  /** Diamètre de la sphère, en points. */
  taille?: number;
  /** Ce qui est posé au centre : le K, une flèche… */
  children?: ReactNode;
  /** Karria réfléchit : l'horloge passe de 12 s à 4 s — tout s'accélère. */
  active?: boolean;
}

export function OrbeVivante({ taille = 60, children, active = false }: Props) {
  const reduit = useReducedMotion();
  const temps = useSharedValue(0);
  // La boîte déborde de la sphère : place pour les particules et le halo.
  const boite = taille * 2;
  const centre = boite / 2;

  useEffect(() => {
    if (reduit) return;
    temps.set(
      withRepeat(withTiming(1, { duration: PERIODE_MS, easing: Easing.linear }), -1),
    );
  }, [reduit, temps]);

  const styleSphere = useAnimatedStyle(() => {
    const a = temps.value * DEUX_PI;
    return {
      transform: [
        { translateX: Math.sin(a * 2) * 1.8 },
        { translateY: Math.cos(a * 3) * 2.4 },
        { scaleX: 1 + Math.sin(a * 4) * 0.025 },
        { scaleY: 1 + Math.cos(a * 4) * 0.025 },
      ],
    };
  });

  const styleHalo = useAnimatedStyle(() => {
    const souffle = (Math.sin(temps.value * DEUX_PI * 3) + 1) / 2;
    return {
      opacity: 0.55 + souffle * 0.35,
      transform: [{ scale: 0.92 + souffle * 0.14 }],
    };
  });

  return (
    <Box style={{ width: boite, height: boite }} pointerEvents="box-none">
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", width: boite, height: boite }, styleHalo]}
      >
        <Svg width={boite} height={boite}>
          <Defs>
            <RadialGradient id="halo-vivant" cx="50%" cy="50%" r="50%">
              <Stop offset="0.3" stopColor={AURA.bleu} stopOpacity={0.5} />
              <Stop offset="0.62" stopColor={AURA.violet} stopOpacity={0.16} />
              <Stop offset="1" stopColor={AURA.violet} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={centre} cy={centre} r={centre} fill="url(#halo-vivant)" />
        </Svg>
      </Animated.View>

      {reduit
        ? null
        : PARTICULES.map((p) => (
            <Particule
              key={`${p.phase}`}
              temps={temps}
              rayonOrbe={taille / 2}
              centre={centre}
              particule={p}
            />
          ))}

      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: centre - taille / 2,
            top: centre - taille / 2,
            width: taille,
            height: taille,
            borderRadius: taille / 2,
            overflow: "hidden",
            backgroundColor: AURA.bleu,
          },
          styleSphere,
        ]}
      >
        <Nappe temps={temps} taille={taille} couleur={AURA.violet} frequences={[1, 2]} />
        <Nappe
          temps={temps}
          taille={taille}
          couleur={AURA.glacier}
          frequences={[-2, 1]}
        />
        <Box className="absolute inset-0 items-center justify-center">{children}</Box>
      </Animated.View>
    </Box>
  );
}
