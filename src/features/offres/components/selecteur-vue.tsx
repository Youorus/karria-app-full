/**
 * Le sélecteur de vue du fil : « Ma recherche » / « Toutes les offres ».
 *
 * ═══ Pourquoi un sélecteur et pas un ✕ ═══
 *
 * Le badge de recherche de la première version se fermait d'un ✕ : rien
 * ne disait qu'on « revenait à toutes les offres », ni qu'on pourrait
 * revenir à sa recherche. Deux segments nommés disent les deux états, et
 * le curseur qui glisse dit qu'on peut repasser de l'un à l'autre.
 *
 * ═══ Ce qu'il montre, et quand ═══
 *
 * Il n'apparaît qu'une fois qu'une recherche existe — avant, le fil n'a
 * qu'une vue et le ✦ invite à parler à Karria. Sous les segments, la
 * recherche en une ligne rappelle ce que « Ma recherche » contient.
 *
 * Le curseur est une vue animée séparée des segments : sa largeur se
 * mesure au premier rendu (`onLayout`), état purement visuel du composant.
 */

import { useState } from "react";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { VueDuFil } from "../hooks/use-fil-offres";

const RESSORT = { damping: 24, stiffness: 260 };
/** L'écart intérieur de la capsule : le curseur s'y inscrit. */
const MARGE = 4;

const SEGMENTS: { vue: VueDuFil; libelle: string }[] = [
  { vue: "pour_toi", libelle: "Ma recherche" },
  { vue: "toutes", libelle: "Toutes les offres" },
];

interface Props {
  vue: VueDuFil;
  /** La recherche en une ligne, rappelée sous les segments. */
  resume: string | null;
  /** Pendant un changement de vue : un second toucher attendrait. */
  desactive: boolean;
  onChanger: (vue: VueDuFil) => void;
}

export function SelecteurVue({ vue, resume, desactive, onChanger }: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const [largeur, setLargeur] = useState(0);
  const largeurSegment = Math.max(0, (largeur - MARGE * 2) / SEGMENTS.length);
  const rang = SEGMENTS.findIndex((s) => s.vue === vue);

  const curseur = useAnimatedStyle(() => {
    const x = rang * largeurSegment;
    return {
      width: largeurSegment,
      transform: [{ translateX: reduit ? x : withSpring(x, RESSORT) }],
    };
  }, [rang, largeurSegment, reduit]);

  return (
    <VStack space="xs">
      <Box
        className="relative flex-row rounded-full bg-remplissage"
        style={{ padding: MARGE }}
        onLayout={(e) => setLargeur(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {largeur > 0 ? (
          <Animated.View
            pointerEvents="none"
            className="absolute bottom-1 top-1 rounded-full bg-primary"
            style={[{ left: MARGE }, curseur]}
          />
        ) : null}
        {SEGMENTS.map((s) => {
          const actif = s.vue === vue;
          return (
            <Pressable
              key={s.vue}
              onPress={() => {
                if (!actif) onChanger(s.vue);
              }}
              disabled={desactive}
              className="min-h-11 flex-1 items-center justify-center rounded-full px-3"
              accessibilityRole="tab"
              accessibilityState={{ selected: actif, disabled: desactive }}
              accessibilityLabel={s.libelle}
            >
              <Texte
                className={`font-bold text-footnote ${
                  actif ? "text-primary-foreground" : "text-foreground"
                }`}
                numberOfLines={1}
              >
                {s.libelle}
              </Texte>
            </Pressable>
          );
        })}
      </Box>
      {vue === "pour_toi" && resume !== null ? (
        <HStack space="xs" className="items-center px-2">
          <Icone nom="etincelles" couleur={couleurs.primaire} taille={12} />
          <Texte className="flex-1 text-caption text-muted-foreground" numberOfLines={1}>
            {resume}
          </Texte>
        </HStack>
      ) : null}
    </VStack>
  );
}
