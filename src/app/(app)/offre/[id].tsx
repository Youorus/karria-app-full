/**
 * La route du détail d'une offre.
 *
 * La `key` recrée l'écran quand l'identifiant change — un lien profond
 * vers une autre offre alors que le détail est déjà ouvert. Sans elle,
 * l'écran garderait l'état de l'offre précédente (son analyse, son
 * signet) : vérifié sur simulateur, l'analyse de Doctolib restait
 * affichée sous l'offre de Mistral AI.
 */

import { useLocalSearchParams } from "expo-router";

import { EcranDetailOffre } from "@/features/offres/screens/ecran-detail-offre";

export default function RouteDetailOffre() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EcranDetailOffre key={id} />;
}
