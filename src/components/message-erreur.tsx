/**
 * L'affichage d'une erreur, et de ce qu'il faut faire ensuite.
 *
 * ═══ La règle : jamais de message sans issue ═══
 *
 * Une erreur qui ne dit pas quoi faire laisse l'utilisateur devant un
 * écran qu'il ne peut pas débloquer. Ce composant impose donc la présence
 * d'une action quand il y en a une : `retentable` affiche « Réessayer »,
 * `recommencer` renvoie au début du parcours.
 *
 * ═══ Pourquoi un bandeau et non une alerte système ═══
 *
 * Une alerte modale interrompt, se referme, et emporte le message avec
 * elle — l'utilisateur ne peut plus le relire pendant qu'il corrige. Le
 * bandeau reste sous les yeux le temps de la correction. C'est aussi ce
 * que font iOS et Android dans leurs propres formulaires : la modale est
 * réservée à ce qui exige une décision.
 */

import { Pressable } from "react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Texte } from "@/components/texte";

export function MessageErreur({
  message,
  action,
  libelleAction,
}: {
  message: string;
  action?: () => void;
  libelleAction?: string;
}) {
  return (
    <Box className="rounded-sm border border-border-destructive bg-surface-destructive p-4">
      <HStack className="items-center justify-between" space="md">
        <Texte
          className="flex-1 text-footnote text-destructive"
          // `alert` : le lecteur d'écran l'annonce dès son apparition,
          // sans attendre que l'utilisateur y arrive en parcourant.
          accessibilityRole="alert"
        >
          {message}
        </Texte>

        {action && libelleAction ? (
          <Pressable
            onPress={action}
            className="min-h-touch justify-center"
            accessibilityRole="button"
            accessibilityLabel={libelleAction}
          >
            <Texte className="font-bold text-footnote text-destructive underline">
              {libelleAction}
            </Texte>
          </Pressable>
        ) : null}
      </HStack>
    </Box>
  );
}
