/**
 * La lecture d'un document du dossier : `?document=cv` (défaut) ou
 * `?document=lettre`.
 */

import { useLocalSearchParams } from "expo-router";

import { EcranLectureDossier } from "@/features/candidatures/screens/ecran-lecture-dossier";

export default function RouteLectureDossier() {
  const { id, document } = useLocalSearchParams<{ id: string; document?: string }>();
  return <EcranLectureDossier key={`${id}-${document ?? "cv"}`} />;
}
