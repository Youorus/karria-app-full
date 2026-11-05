/**
 * Ouvrir un export dans le lecteur de Karria (`/lecture-document`).
 *
 * Un seul geste pour « Mes CV » et le dossier : le lien signé, le genre,
 * le titre neutre et le nom de fichier partent en paramètres de route ;
 * le lecteur télécharge et affiche. Le lien signé vaut une heure : si la
 * personne revient plus tard, le lecteur le dit (`erreurLien`).
 */

import { useCallback } from "react";

import { useNavigationUnique } from "@/lib/navigation";

import { parametresDeLecture, type DocumentALire } from "../services/lecteur";

export function useOuvrirLecteur(): (d: DocumentALire) => void {
  const { pousser } = useNavigationUnique();
  return useCallback(
    (d: DocumentALire) =>
      pousser({ pathname: "/lecture-document", params: parametresDeLecture(d) }),
    [pousser],
  );
}
