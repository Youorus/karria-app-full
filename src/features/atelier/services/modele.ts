/**
 * Quel modèle rendre un dossier — une règle, trois écrans.
 *
 * Le contrat des dossiers ne permet pas de changer `template_id` après la
 * création : le modèle réellement employé vient donc, dans l'ordre, du
 * dossier, du brouillon local de l'atelier (le dernier choisi), du modèle
 * par défaut de la personne (`/user-templates/me/selected`), et sinon du
 * premier modèle gratuit ou possédé de la galerie. L'atelier, la lettre et
 * Finaliser lisent la même règle : ce qu'on voit est ce qu'on exporte.
 */

import type { Dossier } from "@/features/candidatures/types/candidatures.types";
import type { Modele } from "@/features/modeles/types/modeles.types";

export function modeleDuDossier(entree: {
  dossier: Dossier;
  brouillonModeleId: string | null | undefined;
  choisi: string | null | undefined;
  galerie: readonly Modele[];
  possedes: ReadonlySet<string>;
}): string | null {
  const gratuit = entree.galerie.find((m) => !m.premium || entree.possedes.has(m.id));
  return (
    entree.dossier.modeleId ??
    entree.brouillonModeleId ??
    entree.choisi ??
    gratuit?.id ??
    null
  );
}
