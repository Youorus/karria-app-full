/**
 * Les offres déjà reçues dans le fil, gardées le temps de la session.
 *
 * ═══ Pourquoi ═══
 *
 * Ouvrir une offre depuis le fil ne doit pas faire attendre un écran de
 * chargement : on a déjà tout pour l'afficher, sauf la description. La V1
 * faisait passer l'offre entière dans les paramètres de navigation —
 * donc sérialisée dans l'URL, et perdue au premier lien profond. Ici, le
 * détail part de cette mémoire et ne va au serveur que pour compléter
 * (la description) ou s'il n'y trouve rien (lien partagé, notification).
 */

import type { Offre } from "../types/offres.types";

const memoire = new Map<string, Offre>();

export function memoriser(offres: Offre[]): void {
  for (const offre of offres) memoire.set(offre.id, offre);
}

export function offreConnue(id: string): Offre | undefined {
  return memoire.get(id);
}
