/**
 * Une bande d'information posée en haut, par-dessus la navigation, qui ne
 * bloque rien : une phrase, une action, une croix.
 *
 * ═══ Deux usages, une bande ═══
 *
 * « Une amélioration est prête — Relancer » (mise à jour EAS téléchargée)
 * et « Une nouvelle version est disponible — Mettre à jour » (magasin).
 * Même forme que la bannière de notification (`banniere-notification.tsx`)
 * : la carte flottante en haut est déjà le langage de l'application pour
 * « quelque chose à savoir, pas à subir ». Elle glisse depuis le haut et
 * se retire de même ; mouvement réduit respecté.
 *
 * La croix est une cible de 48 pt : refuser doit être aussi facile
 * qu'accepter, sinon la bande devient une injonction.
 */

import { Pressable } from "react-native";
import Animated, { ReduceMotion, SlideInUp, SlideOutUp } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

interface Props {
  visible: boolean;
  phrase: string;
  libelleAction: string;
  onAction: () => void;
  onFermer: () => void;
}

export function BandeDemarrage({
  visible,
  phrase,
  libelleAction,
  onAction,
  onFermer,
}: Props) {
  const couleurs = useCouleurs();
  if (!visible) return null;

  return (
    <Box className="absolute left-0 right-0 top-0 px-4 pt-safe" pointerEvents="box-none">
      <Animated.View
        entering={SlideInUp.duration(260).reduceMotion(ReduceMotion.System)}
        exiting={SlideOutUp.duration(200).reduceMotion(ReduceMotion.System)}
      >
        <HStack
          className="mt-2 items-center gap-3 rounded-carte border border-border-subtle bg-popover py-2 pl-4 pr-1"
          accessibilityRole="alert"
        >
          <Texte
            className="flex-1 text-callout text-popover-foreground"
            numberOfLines={2}
          >
            {phrase}
          </Texte>
          <Pressable
            onPress={onAction}
            className="min-h-[40px] justify-center rounded-full bg-surface-primary px-3"
            accessibilityRole="button"
            accessibilityLabel={libelleAction}
          >
            <Texte className="font-bold text-callout text-primary" numberOfLines={1}>
              {libelleAction}
            </Texte>
          </Pressable>
          <Pressable
            onPress={onFermer}
            className="h-12 w-12 items-center justify-center"
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Icone nom="fermer" couleur={couleurs.estompe} taille={14} />
          </Pressable>
        </HStack>
      </Animated.View>
    </Box>
  );
}
