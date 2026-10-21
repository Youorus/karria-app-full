/**
 * Le mini-CV : ton CV qui se construit sous tes yeux.
 *
 * Chaque réponse validée y arrive en pastille, avec un petit rebond :
 * c'est la récompense du geste, et la preuve que répondre a servi. Le
 * divertissement du parcours tient beaucoup à ça — voir son CV grandir,
 * question après question.
 */

import { ScrollView } from "react-native";
import Animated, { ZoomIn, useReducedMotion } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { DEFINITIONS, resumeDuJet } from "../services/chapitres";
import type { Jet } from "../types/cv.types";

export function MiniCv({ valides }: { valides: Jet[] }) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  if (valides.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-5"
      accessibilityLabel="Ce que ton CV contient déjà"
    >
      {valides.map((jet, i) => (
        <Animated.View
          key={`${jet.chapitre}-${i}`}
          entering={reduit ? undefined : ZoomIn.springify().damping(14)}
        >
          <HStack className="max-w-[220px] items-center gap-1.5 rounded-full border border-border-subtle bg-verre py-1.5 pl-2 pr-3">
            <Icone
              nom={DEFINITIONS[jet.chapitre].icone}
              couleur={couleurs.primaire}
              taille={13}
            />
            <Texte className="font-medium text-caption text-foreground" numberOfLines={1}>
              {resumeDuJet(jet)}
            </Texte>
          </HStack>
        </Animated.View>
      ))}
    </ScrollView>
  );
}
