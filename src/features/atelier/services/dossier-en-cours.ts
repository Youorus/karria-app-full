/**
 * Le dossier qu'on est en train de travailler dans l'atelier — un seul.
 *
 * ═══ Pourquoi ═══
 *
 * Depuis l'atelier, acheter un modèle Premium passe par Stripe et revient
 * dans l'atelier. Mais on peut aussi acheter depuis la galerie, pendant
 * qu'un dossier est ouvert : la galerie doit alors pouvoir dire
 * « Continuer dans l'atelier ». Ce relais minuscule, en mémoire, est le
 * seul lien entre les deux. Rien de persistant : au redémarrage, on repasse
 * par Candidatures.
 */

import { useSyncExternalStore } from "react";

let courant: string | null = null;
const abonnes = new Set<() => void>();

function publier(): void {
  abonnes.forEach((r) => r());
}

export function poserDossierEnCours(dossierId: string | null): void {
  if (courant === dossierId) return;
  courant = dossierId;
  publier();
}

export function dossierEnCours(): string | null {
  return courant;
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

const lire = () => courant;

export function useDossierEnCours(): string | null {
  return useSyncExternalStore(abonner, lire, lire);
}
