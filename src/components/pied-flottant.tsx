/**
 * Le pied flottant des écrans de détail : les actions, en suspension.
 *
 * ═══ Pourquoi flottant ═══
 *
 * Une barre collée au bas de l'écran coupe le contenu net et pèse comme un
 * bandeau. Une capsule qui flotte, à quelques points des bords, laisse le
 * contenu défiler dessous et s'apercevoir à travers : l'action reste à
 * portée de pouce sans fermer la page — c'est le parti de la V1 pour son
 * pied « Créer mon CV / Créer ma lettre », poussé jusqu'au verre.
 *
 * Sur iOS 26, la capsule est en Liquid Glass ; ailleurs, un voile
 * translucide avec une ombre portée. L'écran qui l'emploie réserve sa
 * hauteur en bas de son défilement (`HAUTEUR_PIED_FLOTTANT`), pour que la
 * dernière ligne ne finisse jamais sous les boutons.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

const VERRE = isLiquidGlassAvailable();

/** La place à réserver sous le contenu défilant : pied + marge. */
export const HAUTEUR_PIED_FLOTTANT = 120;

interface Props {
  /** Une ligne d'aide au-dessus des boutons (« Ce modèle est à toi »). */
  aide?: string | null;
  children: ReactNode;
}

export function PiedFlottant({ aide, children }: Props) {
  const { bottom } = useSafeAreaInsets();
  const reduit = useReducedMotion();

  const contenu = (
    <VStack className="gap-2 p-2">
      {aide ? (
        <Texte className="px-2 pt-1 text-center text-footnote text-muted-foreground">
          {aide}
        </Texte>
      ) : null}
      {children}
    </VStack>
  );

  return (
    <Animated.View
      entering={reduit ? undefined : FadeInDown.duration(320).delay(240)}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: Math.max(bottom, 12) + 4,
      }}
    >
      {VERRE ? (
        // Le rayon en style : `GlassView` dessine sa forme lui-même.
        <GlassView glassEffectStyle="regular" style={{ borderRadius: 26 }}>
          {contenu}
        </GlassView>
      ) : (
        <Box className="rounded-[26px] border border-border-subtle bg-verre shadow-xl">
          {contenu}
        </Box>
      )}
    </Animated.View>
  );
}
