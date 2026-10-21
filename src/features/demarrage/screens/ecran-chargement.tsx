/**
 * L'écran affiché pendant que l'application se prépare.
 *
 * Le chargeur de Karria — le « K » qui respire, hérité de la V1 — posé
 * sur l'aura. Polices, lecture de la session : quelques centaines de
 * millisecondes au plus.
 */

import { Aura } from "@/components/aura";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { VStack } from "@/components/ui/vstack";

export function EcranChargement() {
  return (
    <VStack className="flex-1 items-center justify-center bg-background">
      <Aura />
      <ChargeurKarria taille="grand" />
    </VStack>
  );
}
