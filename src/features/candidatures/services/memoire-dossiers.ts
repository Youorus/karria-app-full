/**
 * Le dernier dossier lu, en mémoire — pour que la lecture d'un document
 * (CV adapté, lettre) s'ouvre sans écran d'attente.
 *
 * Même idée que `offres/hooks/memoire-offres.ts` : le détail vient de lire
 * le dossier entier ; l'écran de lecture le retrouve ici et ne relit le
 * serveur que s'il n'y est pas (lien direct, redémarrage à chaud). Rien
 * n'est persistant : un dossier change côté serveur, l'écran de détail le
 * relit à chaque ouverture.
 */

import type { Dossier } from "../types/candidatures.types";

const dossiers = new Map<string, Dossier>();

export function memoriserDossier(dossier: Dossier): void {
  dossiers.set(dossier.id, dossier);
}

export function dossierMemorise(id: string): Dossier | null {
  return dossiers.get(id) ?? null;
}

export function oublierDossier(id: string): void {
  dossiers.delete(id);
}
