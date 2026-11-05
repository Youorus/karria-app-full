/**
 * Le retour discret de l'espace Candidatures : une phrase, une fois.
 *
 * ═══ Pourquoi un store et non un paramètre de route ═══
 *
 * La feuille « As-tu candidaté ? » peut être appelée de partout — l'atelier
 * après un export, le détail d'un dossier — et renvoie vers l'onglet
 * Candidatures avec un mot (« C'est noté. Bonne chance ! »). Un paramètre
 * d'URL resterait collé à l'onglet et referait apparaître la phrase à
 * chaque retour ; un store minuscule, consommé à la lecture, la montre
 * **une fois**. Même mécanique que l'intention de connexion
 * (`lib/intention.ts`), en plus simple : pas de persistance, un redémarrage
 * n'a rien à redire.
 */

import { useSyncExternalStore } from "react";

let note: string | null = null;
const abonnes = new Set<() => void>();

function publier(): void {
  abonnes.forEach((rappel) => rappel());
}

/** Pose la phrase que l'onglet Candidatures dira à sa prochaine ouverture. */
export function poserRetourDiscret(phrase: string): void {
  note = phrase;
  publier();
}

/** L'onglet l'a dite : on l'oublie. */
export function effacerRetourDiscret(): void {
  if (note === null) return;
  note = null;
  publier();
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

const lire = () => note;

/** La phrase en attente, ou `null`. */
export function useRetourDiscret(): string | null {
  return useSyncExternalStore(abonner, lire, lire);
}
