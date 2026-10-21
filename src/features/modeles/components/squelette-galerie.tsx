/**
 * Le chargement de la galerie : six cartes fantômes (V1), qui pulsent au
 * même rythme que celles du fil — l'application a une seule façon
 * d'attendre.
 */

import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

export function SqueletteGalerie({ largeur }: { largeur: number }) {
  const reduit = useReducedMotion();
  const opacite = useSharedValue(0.4);
  useEffect(() => {
    if (reduit) return;
    opacite.set(withRepeat(withTiming(0.7, { duration: 800 }), -1, true));
  }, [reduit, opacite]);
  const style = useAnimatedStyle(() => ({ opacity: opacite.value }));

  return (
    <Animated.View style={style} accessibilityLabel="Chargement des modèles">
      <Box className="flex-row flex-wrap gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <VStack
            key={i}
            className="overflow-hidden rounded-tuile border border-border-subtle bg-card"
            style={{ width: largeur }}
          >
            <Box
              className="bg-remplissage"
              style={{ height: Math.round(largeur / 0.72) }}
            />
            <VStack className="gap-2 p-3">
              <Box className="h-3 w-3/4 rounded-full bg-remplissage" />
              <Box className="h-2.5 w-1/2 rounded-full bg-remplissage" />
            </VStack>
          </VStack>
        ))}
      </Box>
    </Animated.View>
  );
}
