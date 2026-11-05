/**
 * L'atelier **libre** : « Nouveau CV », sans dossier — le CV de base dans le
 * modèle de son choix, retouché dans le brouillon local, exporté à Finaliser.
 * Route statique : `expo-router` la préfère à `[dossierId]`.
 */

import { EcranAtelier } from "@/features/atelier/screens/ecran-atelier";

export default function RouteAtelierLibre() {
  return <EcranAtelier libre />;
}
