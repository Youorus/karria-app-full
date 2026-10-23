/**
 * Les suggestions de l'accueil : quatre façons de commencer.
 *
 * Des capsules et non une liste : elles se lisent d'un regard, et leur
 * forme dit qu'on peut les toucher. Une suggestion touchée part comme un
 * message tapé — voir `services/accueil.ts`. Les mêmes capsules servent
 * aux réponses rapides que Karria propose après chaque réponse.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";

interface Props {
  suggestions: readonly string[];
  onChoisir: (suggestion: string) => void;
  /** Centrées sur l'accueil ; alignées à gauche sous une réponse, dans
   *  le sens de lecture de la conversation. */
  alignement?: "centre" | "gauche";
}

export function Suggestions({ suggestions, onChoisir, alignement = "centre" }: Props) {
  return (
    <HStack
      className={`flex-wrap gap-2 ${alignement === "centre" ? "justify-center" : "justify-start"}`}
    >
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
