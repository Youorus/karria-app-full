/**
 * La lecture d'un export (CV ou lettre, PDF ou Word) dans Karria, avec
 * l'en-tête de Karria — et non le navigateur intégré et son adresse de
 * stockage. Paramètres : `use-ouvrir-lecteur.ts`.
 */

import { useLocalSearchParams } from "expo-router";

import { EcranLecteur } from "@/features/atelier/screens/ecran-lecteur";

export default function RouteLectureDocument() {
  const { url } = useLocalSearchParams<{ url?: string }>();
  return <EcranLecteur key={url ?? ""} />;
}
