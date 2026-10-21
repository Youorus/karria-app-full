/**
 * Un message de la conversation.
 *
 * ═══ Deux traitements, volontairement inégaux ═══
 *
 * Ce que l'utilisateur écrit est dans une bulle, à droite. Ce que Karria
 * répond n'en a pas : le texte est posé sur le fond, à gauche, signé du
 * symbole. C'est la convention de ChatGPT et de Claude, et elle a une
 * raison : une réponse d'IA est souvent longue, et une bulle de vingt
 * lignes se lit comme un mur. Sans bulle, elle se lit comme une voix.
 *
 * Seule la part révélée de la réponse est affichée (`visible`) : voir
 * `lib/revelation.ts`.
 */

import { SymboleKarria } from "@/components/marque";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";

import type { Message } from "../types/assistant.types";

export function BulleMessage({ message }: { message: Message }) {
  if (message.auteur === "utilisateur") {
    return (
      <HStack className="justify-end">
        <Box className="max-w-[85%] rounded-lg bg-bulle px-4 py-3">
          <Texte className="text-callout leading-6 text-bulle-foreground">
            {message.texte}
          </Texte>
        </Box>
      </HStack>
    );
  }

  return (
    <HStack space="sm" className="items-start pr-6">
      <Box className="pt-0.5">
        <SymboleKarria taille={22} />
      </Box>
      <Texte
        className="flex-1 text-callout leading-7 text-foreground"
        // Le lecteur d'écran reçoit la réponse entière d'emblée : la lui
        // révéler mot à mot la lui ferait relire à chaque battement.
        accessibilityLabel={message.texte}
      >
        {message.texte.slice(0, message.visible)}
      </Texte>
    </HStack>
  );
}
