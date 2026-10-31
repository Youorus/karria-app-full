/**
 * Le haut de l'échange : à qui l'on écrit.
 *
 * Toujours visible en tête du fil — vide ou non —, parce que c'est la
 * phrase qui change tout : ici, ce ne sont pas des réponses d'IA, ce sont
 * les personnes qui font Karria. Pas d'orbe (c'est le visage de Karria
 * l'IA), pas de badge : l'aura du fond suffit à dire qu'on est chez nous,
 * le texte dit à qui l'on parle.
 */

import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Texte } from "@/components/texte";
import { VStack } from "@/components/ui/vstack";

export function AccueilEquipe({ vide }: { vide: boolean }) {
  const reduit = useReducedMotion();
  return (
    <Animated.View entering={reduit ? undefined : FadeInDown.duration(420)}>
      <VStack className={`gap-3 px-1 ${vide ? "pt-10" : "pb-4 pt-2"}`}>
        <Texte
          accessibilityRole="header"
          className="font-display text-title-lg tracking-tighter text-foreground"
        >
          {"Un mot pour l'équipe"}
        </Texte>
        <Texte className="text-body leading-6 text-muted-foreground">
          {
            "Ici, ce n'est pas l'IA qui te répond : ce sont les personnes qui font Karria. Une question, un souci, une idée, un merci — écris, laisse un vocal ou montre une capture d'écran."
          }
        </Texte>
        {vide ? (
          <Texte className="text-body leading-6 text-muted-foreground">
            {"On lit tout, et on te répond ici. Tu es prévenu dès que c'est fait."}
          </Texte>
        ) : null}
      </VStack>
    </Animated.View>
  );
}
