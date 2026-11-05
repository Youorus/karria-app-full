/**
 * Ouvrir un export dans le lecteur de Karria (`/lecture-document`).
 *
 * Un seul geste pour « Mes CV » et le dossier. Le document (lien signé,
 * genre, nom, modèle) est **mémorisé** dans l'app (`memoriserDocument`) et
 * la route ne reçoit que son identifiant : rien de ce qui s'affiche ou se
 * télécharge ne vient des paramètres — un lien externe ne peut pas ouvrir
 * le lecteur sur autre chose qu'un export que l'app a elle-même lu. Un
 * lien hors du stockage de Karria n'est pas retenu, et rien ne s'ouvre.
 */

import { useCallback } from "react";

import { useNavigationUnique } from "@/lib/navigation";

import { memoriserDocument, type DocumentALire } from "../services/lecteur";

export function useOuvrirLecteur(): (d: DocumentALire) => boolean {
  const { pousser } = useNavigationUnique();
  return useCallback(
    (d: DocumentALire) => {
      const id = memoriserDocument(d);
      if (id === null) {
        console.warn("[karria] export non ouvert : lien hors du stockage de Karria");
        return false;
      }
      pousser({ pathname: "/lecture-document", params: { id } });
      return true;
    },
    [pousser],
  );
}
