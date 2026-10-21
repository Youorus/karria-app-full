/**
 * Les suggestions de l'accueil : quatre façons de commencer.
 *
 * Des capsules et non une liste : elles se lisent d'un regard, et leur
 * forme dit qu'on peut les toucher. Une suggestion touchée part comme un
 * message tapé — voir `services/accueil.ts`.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";

interface Props {
  suggestions: readonly string[];
  onChoisir: (suggestion: string) => void;
}

export function Suggestions({ suggestions, onChoisir }: Props) {
  return (
    <HStack className="flex-wrap justify-center gap-2">
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          onPress={() => onChoisir(suggestion)}
          className="min-h-touch justify-center rounded-full border border-border-champ bg-verre px-4"
          accessibilityRole="button"
          accessibilityHint="Envoie cette demande à Karria"
        >
          <Texte className="font-medium text-footnote text-foreground">
            {suggestion}
          </Texte>
        </Pressable>
      ))}
    </HStack>
  );
}
