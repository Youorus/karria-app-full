/**
 * Le chargement du fil — `FeedLoadingSkeleton` de la V1.
 *
 * Des cartes fantômes à la forme exacte des vraies (tuile, trois lignes,
 * deux pastilles), qui pulsent entre 40 % et 70 % d'opacité toutes les
 * 800 ms. Montrer la forme de ce qui arrive rassure plus qu'un rond qui
 * tourne : on sait déjà où l'œil va se poser.
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
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

function Carte() {
  return (
    <VStack space="md" className="rounded-carte border border-border-subtle bg-card p-5">
      <HStack space="md" className="items-center">
        <Box className="h-[52px] w-[52px] rounded-2xl bg-remplissage" />
        <VStack space="sm" className="flex-1">
          <Box className="h-2.5 w-2/5 rounded-full bg-remplissage" />
          <Box className="h-3.5 w-11/12 rounded-full bg-remplissage" />
        </VStack>
      </HStack>
      <Box className="h-3 w-3/5 rounded-full bg-remplissage" />
      <HStack space="sm">
        <Box className="h-[26px] w-[70px] rounded-xl bg-remplissage" />
        <Box className="h-[26px] w-[100px] rounded-xl bg-remplissage" />
      </HStack>
    </VStack>
  );
}

export function SqueletteFil({ cartes = 4 }: { cartes?: number }) {
  const reduit = useReducedMotion();
  const opacite = useSharedValue(0.4);

  useEffect(() => {
    if (reduit) return;
    opacite.set(withRepeat(withTiming(0.7, { duration: 800 }), -1, true));
  }, [reduit, opacite]);

  const style = useAnimatedStyle(() => ({ opacity: opacite.value }));

  return (
    <Animated.View style={style} accessibilityLabel="Chargement des offres">
      <VStack space="md">
        {Array.from({ length: cartes }, (_, i) => (
          <Carte key={i} />
        ))}
      </VStack>
    </Animated.View>
  );
}
