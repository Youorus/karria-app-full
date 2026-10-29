/**
 * L'écran affiché pendant que l'application se prépare.
 *
 * Le chargeur de Karria — le « K » qui respire — posé sur le fond pur du thème.
 */

import { ChargeurKarria } from "@/components/chargeur-karria";
import { VStack } from "@/components/ui/vstack";

export function EcranChargement() {
  return (
    <VStack className="flex-1 items-center justify-center bg-background">
      <ChargeurKarria taille="grand" />
    </VStack>
  );
}
