/**
 * La route de l'atelier d'un dossier. La `key` recrée l'écran quand le
 * dossier change (lien vers un autre dossier) : l'état local, la file de
 * rendu et le brouillon sont ceux d'un seul dossier.
 */

import { useLocalSearchParams } from "expo-router";

import { EcranAtelier } from "@/features/atelier/screens/ecran-atelier";

export default function RouteAtelier() {
  const { dossierId } = useLocalSearchParams<{ dossierId: string }>();
  return <EcranAtelier key={dossierId} />;
}
