/**
 * La lecture d'un export (CV ou lettre, PDF ou Word) dans Karria, avec
 * l'en-tête de Karria — et non le navigateur intégré et son adresse de
 * stockage. Un seul paramètre, `id` : l'export est relu dans la mémoire
 * de l'app (`services/lecteur.ts`) — rien d'affiché ni de téléchargé ne
 * vient de la route, et un lien externe est renvoyé (`+native-intent.ts`).
 */

import { useLocalSearchParams } from "expo-router";

import { EcranLecteur } from "@/features/atelier/screens/ecran-lecteur";

export default function RouteLectureDocument() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <EcranLecteur key={id ?? ""} />;
}
