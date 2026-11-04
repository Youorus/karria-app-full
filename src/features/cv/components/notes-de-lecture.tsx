/**
 * Les notes de lecture de Karria pendant l'import : une ligne à la fois.
 *
 * Chaque ligne entre par le bas, en fondu, comme une phrase qu'on écrit.
 * Pas de coche, pas de barre : du texte, parce que ce sont des notes, pas
 * des étapes. Avec `resume`, le composant affiche d'un bloc ce qui a été
 * trouvé, en chiffres — le même compte rendu, condensé pour l'écran final.
 *
 * Mouvement réduit : les lignes apparaissent sans animation.
 */

import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

import type { ResultatImport } from "../types/cv.types";

interface Props {
  lignes: string[];
  resume?: ResultatImport;
}

function Chiffre({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <VStack className="min-w-[72px] items-center gap-0.5 rounded-carte bg-card px-3 py-2">
      <Texte className="font-display text-title text-foreground">{valeur}</Texte>
      <Texte className="text-caption text-muted-foreground">{libelle}</Texte>
    </VStack>
  );
}

export function NotesDeLecture({ lignes, resume }: Props) {
  const reduit = useReducedMotion();
  return (
    <VStack className="gap-3">
      {lignes.map((ligne, i) => (
        <Animated.View
          key={`${i}-${ligne}`}
          entering={reduit ? undefined : FadeInDown.duration(360)}
        >
          <Texte className="text-center text-body leading-6 text-foreground">
            {ligne}
          </Texte>
        </Animated.View>
      ))}
      {resume !== undefined ? (
        <HStack className="flex-wrap justify-center gap-2">
          <Chiffre
            valeur={resume.cv.experiences.length}
            libelle={resume.cv.experiences.length > 1 ? "expériences" : "expérience"}
          />
          <Chiffre
            valeur={resume.cv.formations.length}
            libelle={resume.cv.formations.length > 1 ? "formations" : "formation"}
          />
          <Chiffre
            valeur={resume.cv.competences.length}
            libelle={resume.cv.competences.length > 1 ? "compétences" : "compétence"}
          />
        </HStack>
      ) : null}
    </VStack>
  );
}
