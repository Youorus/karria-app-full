/**
 * Ce qui s'affiche pendant que Karria réfléchit.
 *
 * L'orbe vivante, en petit et accélérée, là où la réponse va apparaître. Le
 * texte est là pour qui ne verrait pas l'animation — mouvement réduit,
 * lecteur d'écran — et dit ce qui se passe plutôt qu'un « chargement ».
 */

import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";

export function Reflexion() {
  return (
    <HStack space="xs" className="-ml-3 items-center" accessibilityLiveRegion="polite">
      <OrbeVivante taille={16} active />
      <Texte className="text-footnote text-muted-foreground">Karria réfléchit…</Texte>
    </HStack>
  );
}
