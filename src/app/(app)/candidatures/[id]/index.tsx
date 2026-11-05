/**
 * La route du détail d'un dossier de candidature.
 *
 * La `key` recrée l'écran quand l'identifiant change (un autre dossier
 * ouvert par-dessus, un lien) : sans elle, l'écran garderait le dossier
 * précédent le temps de la relecture — comme pour le détail d'une offre.
 */

import { useLocalSearchParams } from "expo-router";

import { EcranDossier } from "@/features/candidatures/screens/ecran-dossier";

export default function RouteDossier() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EcranDossier key={id} />;
}
