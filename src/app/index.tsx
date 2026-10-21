/**
 * L'aiguillage : où va-t-on à l'ouverture ?
 *
 * L'accueil pour qui n'a pas de session ; pour qui en a une, les offres du
 * jour — ou, une seule fois par installation, l'écran qui propose les
 * notifications. La décision vit dans `useAiguillage` ; tant qu'elle n'est
 * pas prise, on garde l'écran de chargement pour que rien ne clignote.
 */

import { Redirect } from "expo-router";

import { useAiguillage } from "@/features/demarrage/hooks/use-aiguillage";
import { EcranChargement } from "@/features/demarrage/screens/ecran-chargement";

export default function Aiguillage() {
  const destination = useAiguillage();
  if (destination === null) return <EcranChargement />;
  return <Redirect href={destination} />;
}
