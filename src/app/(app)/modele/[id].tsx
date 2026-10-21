/**
 * La route du détail d'un modèle. La `key` recrée l'écran quand
 * l'identifiant change (lien profond vers un autre modèle), comme pour le
 * détail d'une offre.
 */

import { useLocalSearchParams } from "expo-router";

import { EcranDetailModele } from "@/features/modeles/screens/ecran-detail-modele";

export default function RouteDetailModele() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EcranDetailModele key={id} />;
}
