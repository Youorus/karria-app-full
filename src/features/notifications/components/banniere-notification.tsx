/**
 * La bannière d'une notification reçue application ouverte.
 *
 * Elle remplace celle du système au premier plan (voir
 * `services/notifications.ts`) : même carte que le reste de Karria, un
 * toucher ouvre la destination, la croix l'écarte. Elle descend du haut
 * et y remonte ; en mouvement réduit, elle apparaît et disparaît sans
 * glisser.
 *
 * Posée en surimpression (`absolute`, `box-none`) : elle ne pousse aucun
 * contenu et laisse passer les touchers autour d'elle.
 */

import { Pressable } from "react-native";
import Animated, { ReduceMotion, SlideInUp, SlideOutUp } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Banniere } from "../hooks/use-centre-notifications";

interface Props {
  banniere: Banniere | null;
  onOuvrir: () => void;
  onFermer: () => void;
}

export function BanniereNotification({ banniere, onOuvrir, onFermer }: Props) {
  const couleurs = useCouleurs();
  if (banniere === null) return null;

  return (
    <Box className="absolute left-0 right-0 top-0 px-4 pt-safe" pointerEvents="box-none">
      <Animated.View
        key={banniere.cle}
        entering={SlideInUp.duration(260).reduceMotion(ReduceMotion.System)}
        exiting={SlideOutUp.duration(200).reduceMotion(ReduceMotion.System)}
      >
        <HStack className="mt-2 items-center rounded-carte border border-border-subtle bg-popover">
          <Pressable
            onPress={onOuvrir}
            className="min-h-[48px] flex-1 py-3 pl-4"
            accessibilityRole="button"
            accessibilityLabel={
              banniere.corps === null
                ? banniere.titre
                : `${banniere.titre}. ${banniere.corps}`
            }
            accessibilityHint="Ouvre la notification"
          >
            <VStack space="xs">
              <Texte
                className="font-bold text-body text-popover-foreground"
                numberOfLines={1}
              >
                {banniere.titre}
              </Texte>
              {banniere.corps !== null ? (
                <Texte className="text-callout text-muted-foreground" numberOfLines={2}>
                  {banniere.corps}
                </Texte>
              ) : null}
            </VStack>
          </Pressable>
          <Pressable
            onPress={onFermer}
            className="h-12 w-12 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Fermer la notification"
          >
            <Icone nom="fermer" couleur={couleurs.estompe} taille={14} />
          </Pressable>
        </HStack>
      </Animated.View>
    </Box>
  );
}
