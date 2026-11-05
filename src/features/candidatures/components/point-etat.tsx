/**
 * L'état d'un dossier, en une ligne : un point, une phrase.
 *
 * Pas d'étiquette, pas de fond : l'état se lit comme on le dirait
 * (« Candidaté hier », « Prêt à envoyer »). Le point donne la couleur du
 * moment — et respire quand Karria travaille, pour qu'on sache que
 * quelque chose se passe sans rien toucher. Le geste « mouvement réduit »
 * laisse le point immobile.
 */

import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";

import type { EtatLisible, TonEtat } from "../services/presentation";

const COULEUR: Record<TonEtat, string> = {
  attente: "bg-primary",
  relecture: "bg-secondary",
  pret: "bg-foreground-faint",
  fait: "bg-success",
  echec: "bg-destructive",
};

export function PointEtat({
  etat,
  grand = false,
}: {
  etat: EtatLisible;
  grand?: boolean;
}) {
  const reduit = useReducedMotion();
  const souffle = useSharedValue(1);

  useEffect(() => {
    if (reduit || etat.ton !== "attente") {
      souffle.set(1);
      return;
    }
    souffle.set(
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 700 }),
          withTiming(1, { duration: 700 }),
        ),
        -1,
      ),
    );
  }, [reduit, etat.ton, souffle]);

  const style = useAnimatedStyle(() => ({ opacity: souffle.value }));

  return (
    <HStack space="sm" className="items-center">
      <Animated.View style={style}>
        <HStack className={`h-2 w-2 rounded-full ${COULEUR[etat.ton]}`} />
      </Animated.View>
      <Texte
        className={`${grand ? "text-callout" : "text-footnote"} ${
          etat.ton === "fait" ? "font-bold text-foreground" : "text-muted-foreground"
        }`}
        numberOfLines={1}
      >
        {etat.libelle}
      </Texte>
    </HStack>
  );
}
