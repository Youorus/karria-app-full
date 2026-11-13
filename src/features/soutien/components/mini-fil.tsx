/**
 * Le mini-fil : trois cartes d'offres en miniature, dont l'annonce du
 * milieu s'efface.
 *
 * ═══ Pourquoi un dessin, et celui-là ═══
 *
 * « Sans pub » se comprend d'un coup d'œil quand on **voit** le fil : deux
 * offres, une annonce entre elles qui pâlit et se barre. C'est la seule
 * illustration du soutien ; elle est faite de la matière du produit (les
 * cartes du fil), pas d'une icône générique.
 *
 * ═══ Le geste qui fait comprendre ═══
 *
 * Avec `anime`, l'annonce apparaît d'abord pleine, puis pâlit et se barre :
 * la promesse se joue sous les yeux, une fois, à l'ouverture. Mouvement
 * réduit : l'état final, d'emblée.
 *
 * Décorative : masquée au lecteur d'écran, qui lit le titre à côté.
 */

import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { PREMIUM_TEXTE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";

function Lignes({ grande }: { grande: boolean }) {
  return (
    <VStack className="flex-1 gap-1.5">
      <Box className={`rounded-full bg-track ${grande ? "h-2.5 w-36" : "h-1.5 w-24"}`} />
      <Box
        className={`rounded-full bg-remplissage-doux ${grande ? "h-2.5 w-20" : "h-1.5 w-14"}`}
      />
    </VStack>
  );
}

function Offre({ grande }: { grande: boolean }) {
  const or = PREMIUM_TEXTE[useCouleurs().mode];
  return (
    <HStack
      className={`items-center gap-2.5 rounded-tuile border border-border-subtle bg-card ${
        grande ? "px-4 py-3" : "px-3 py-2"
      }`}
    >
      <Box
        className={`rounded-pastille bg-surface-primary ${grande ? "h-8 w-8" : "h-5 w-5"}`}
      />
      <Lignes grande={grande} />
      <Icone nom="coche" couleur={or} taille={grande ? 13 : 10} graisse="bold" />
    </HStack>
  );
}

function Annonce({ grande, anime }: { grande: boolean; anime: boolean }) {
  const reduit = useReducedMotion();
  const joue = anime && !reduit;
  // 0 : l'annonce pleine ; 1 : pâlie et barrée.
  const effacement = useSharedValue(joue ? 0 : 1);

  useEffect(() => {
    if (!joue) {
      effacement.value = 1;
      return;
    }
    effacement.value = 0;
    effacement.value = withDelay(
      450,
      withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) }),
    );
  }, [joue, effacement]);

  const carte = useAnimatedStyle(() => ({
    opacity: 1 - effacement.value * 0.6,
    transform: [{ scale: 1 - effacement.value * 0.03 }],
  }));
  const barre = useAnimatedStyle(() => ({
    transform: [{ scaleX: effacement.value }],
  }));

  return (
    <Animated.View style={carte}>
      <HStack
        className={`items-center gap-2.5 rounded-tuile border border-dashed border-border-champ bg-remplissage-doux ${
          grande ? "px-4 py-3" : "px-3 py-2"
        }`}
      >
        <Box className={`rounded-pastille bg-track ${grande ? "h-8 w-8" : "h-5 w-5"}`} />
        <Lignes grande={grande} />
        <Box>
          <Texte className="text-caption font-bold uppercase tracking-wide text-foreground-faint">
            {TEXTES.annonce}
          </Texte>
          {/* Le trait, centré sur le mot par une couche pleine hauteur. */}
          <Box
            style={{ position: "absolute", top: 0, bottom: 0, left: -2, right: -2 }}
            className="justify-center"
          >
            <Animated.View
              style={[{ height: 1.5, transformOrigin: "left" }, barre]}
              className="bg-foreground-faint"
            />
          </Box>
        </Box>
      </HStack>
    </Animated.View>
  );
}

export function MiniFil({
  grande = false,
  anime = false,
}: {
  grande?: boolean;
  /** Joue l'effacement de l'annonce à l'affichage. */
  anime?: boolean;
}) {
  return (
    <VStack
      className={grande ? "gap-2" : "gap-1.5"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Offre grande={grande} />
      <Annonce grande={grande} anime={anime} />
      <Offre grande={grande} />
    </VStack>
  );
}
