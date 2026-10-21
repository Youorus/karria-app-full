/**
 * La frise : où on en est, d'un coup d'œil.
 *
 * Huit segments, un par chapitre. Le segment courant s'allonge — on voit
 * le chemin parcouru, et surtout qu'il reste peu : c'est ce qui donne
 * envie d'aller au bout. Le titre du chapitre courant est écrit dessous.
 */

import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { CleChapitre } from "../types/cv.types";

interface Props {
  progression: {
    cle: CleChapitre;
    titre: string;
    etat: "fait" | "courant" | "a-venir";
  }[];
}

export function FriseChapitres({ progression }: Props) {
  const reduit = useReducedMotion();
  const index = progression.findIndex((p) => p.etat === "courant");
  const courant = progression[index];

  return (
    <VStack className="gap-2">
      <HStack
        className="gap-1"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Étape ${index + 1} sur ${progression.length}`}
      >
        {progression.map((p) => (
          <Animated.View
            key={p.cle}
            layout={reduit ? undefined : LinearTransition.duration(380)}
            className={`h-1 rounded-full ${p.etat === "courant" ? "flex-[3] bg-primary" : `flex-1 ${p.etat === "fait" ? "bg-primary" : "bg-track"}`}`}
          />
        ))}
      </HStack>
      {courant !== undefined ? (
        <Texte className="font-bold text-caption uppercase tracking-widest text-muted-foreground">
          {index + 1}/{progression.length} · {courant.titre}
        </Texte>
      ) : null}
    </VStack>
  );
}
