/**
 * Ouvrir l'atelier **avec un modèle déjà choisi** — le geste que partagent la
 * galerie (« Utiliser ce modèle ») et « Mes CV » (« Voir avec un autre modèle »).
 *
 * ═══ Toujours les données de la personne, jamais un échantillon ═══
 *
 * Un dossier est ouvert dans l'atelier : on y retourne, le modèle demandé
 * est posé sur le dossier (`?modele=`, que `useAtelier` envoie au serveur).
 * Sinon : l'atelier libre, sur le CV de base (ou le brouillon libre plus
 * récent), dans ce modèle — « Nouveau CV » sans la première feuille, puisque
 * le choix est déjà fait ; `feuille: "modele"` la rouvre quand on veut
 * comparer d'emblée (Mes CV).
 *
 * ═══ Ce que le contrat ne permet pas ═══
 *
 * Un export (`GET /cv/me/generated-cvs`) ne porte pas le CV qui l'a produit :
 * seulement son modèle et ses fichiers. « Voir avec un autre modèle » depuis
 * Mes CV repart donc du CV **courant** (brouillon libre s'il est plus récent,
 * sinon CV de base), dans le modèle de l'export — pas du texte exact exporté
 * si le CV a changé depuis. Le dire au contrat le jour où l'export embarquera
 * son `cv`.
 */

import { useCallback } from "react";

import { useNavigationUnique } from "@/lib/navigation";

import { dossierEnCours } from "../services/dossier-en-cours";

export interface OuvertureAvecModele {
  modeleId: string;
  /** La couleur principale de l'export (`#RRGGBB`), pour la revoir telle quelle. */
  couleur?: string | null;
  /** Ouvrir aussitôt « Avec quel modèle ? », pour comparer. */
  feuille?: "modele";
  /** Vrai : ignorer le dossier en cours, aller droit à l'atelier libre. */
  libre?: boolean;
}

export function useOuvrirAtelierAvecModele(): (o: OuvertureAvecModele) => void {
  const { pousser } = useNavigationUnique();
  return useCallback(
    ({ modeleId, couleur, feuille, libre = false }: OuvertureAvecModele) => {
      const cible = {
        ...(feuille === "modele" ? { cible: "modele" } : {}),
        ...(couleur ? { couleur } : {}),
      };
      const dossierId = libre ? null : dossierEnCours();
      if (dossierId !== null) {
        pousser({
          pathname: "/atelier/[dossierId]",
          params: { dossierId, modele: modeleId, ...cible },
        });
        return;
      }
      pousser({ pathname: "/atelier/libre", params: { modele: modeleId, ...cible } });
    },
    [pousser],
  );
}
