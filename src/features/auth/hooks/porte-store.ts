/**
 * L'état de la porte de connexion : ouverte pour quelle raison, ou fermée.
 *
 * ═══ Pourquoi un store au niveau du module ═══
 *
 * La feuille de connexion est montée **une fois**, au-dessus de tout
 * l'espace `(app)` (`invitation-connexion.tsx`). Celui qui l'ouvre peut
 * être n'importe quel hook — le fil, le détail d'une offre, l'onglet CV, un
 * modèle. Un contexte React obligerait à remonter un fournisseur et à faire
 * passer une fonction partout ; une valeur de module abonnable suffit, comme
 * `lib/sans-pub.ts`.
 */

import { oublierIntention, retenirIntention, type Intention } from "@/lib/intention";

import type { RaisonConnexion } from "../services/porte";

let raison: RaisonConnexion | null = null;
const abonnes = new Set<() => void>();

function publier(): void {
  abonnes.forEach((rappel) => rappel());
}

/** Ouvre la porte pour cette raison ; retient ce qu'on voulait faire. */
export function ouvrirPorte(pour: RaisonConnexion, intention?: Intention): void {
  if (intention !== undefined) retenirIntention(intention);
  raison = pour;
  publier();
}

/** Ferme la porte ; `renoncer` oublie aussi l'intention (« Pas maintenant »). */
export function fermerPorte(renoncer = false): void {
  if (renoncer) oublierIntention();
  if (raison === null) return;
  raison = null;
  publier();
}

export function raisonDeLaPorte(): RaisonConnexion | null {
  return raison;
}

export function abonnerPorte(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}
