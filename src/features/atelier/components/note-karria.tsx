/**
 * La note discrète : « Karria a mis à jour ton à-propos — voir · revenir ».
 *
 * Une ligne sous l'en-tête, sans fond vif ni icône : un point, la phrase,
 * deux mots bleus, une croix. Elle dit ce qui a déjà été fait au CV avant
 * qu'on le lise, et comment le défaire. Fermée, elle ne revient pas de la
 * session.
 */

import { Pressable } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";

interface Props {
  texte: string;
  occupee: boolean;
  onVoir: () => void;
  onRevenir: () => void;
  onFermer: () => void;
}

export function NoteKarria({ texte, occupee, onVoir, onRevenir, onFermer }: Props) {
  const couleurs = useCouleurs();
  return (
    <Animated.View
      entering={FadeIn.duration(260).reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(180).reduceMotion(ReduceMotion.System)}
    >
      <HStack className="items-center gap-2 px-5 pb-2" accessibilityLiveRegion="polite">
        <Box className="h-1.5 w-1.5 rounded-full bg-primary" />
        <Texte className="flex-1 text-footnote text-muted-foreground" numberOfLines={2}>
          {texte}
          <Texte className="text-footnote text-muted-foreground"> — </Texte>
          <Texte className="font-bold text-footnote text-primary" onPress={onVoir}>
            {TEXTES.voir}
          </Texte>
          <Texte className="text-footnote text-muted-foreground"> · </Texte>
          <Texte
            className={`font-bold text-footnote text-primary ${occupee ? "opacity-50" : ""}`}
            onPress={occupee ? undefined : onRevenir}
          >
            {TEXTES.revenir}
          </Texte>
        </Texte>
        <Pressable
          onPress={onFermer}
          hitSlop={8}
          className="h-8 w-8 items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Fermer la note"
        >
          <Icone nom="fermer" couleur={couleurs.estompe} taille={12} graisse="semibold" />
        </Pressable>
      </HStack>
    </Animated.View>
  );
}
