/**
 * Le port du pourboire : ce que la carte « offrir un café » attend d'un
 * système de paiement, sans savoir lequel.
 *
 * ═══ Pourquoi un port ═══
 *
 * Aucune bibliothèque d'achat intégré n'est installée (règle §6.5 : pas
 * de dépendance sans accord). La carte, le hook et les textes sont
 * pourtant finis. Le port fige la frontière : le jour où RevenueCat
 * (`react-native-purchases`, déjà utilisé par la V1) est ajouté, on écrit
 * un adaptateur dans `api/pourboire.revenuecat.ts` qui implémente
 * `PortPourboire`, on le branche dans `pourboire` ci-dessous, et rien
 * d'autre ne bouge.
 *
 * ═══ L'implémentation d'aujourd'hui ═══
 *
 * `bientot` : le catalogue est connu mais `disponible` est faux, et
 * `offrir` refuse. Le bouton dit « Bientôt » et ne répond pas — on ne
 * propose pas un paiement qu'on ne peut pas encaisser. Aucun réseau ici.
 *
 * ═══ Les identifiants de produit ═══
 *
 * Dans la lignée des produits de la V1 (`com.karria.premium.monthly`) :
 * `com.karria.cafe.1|2|3`, des **consommables** (un café s'offre autant
 * de fois qu'on veut), à créer à l'identique sur App Store Connect et la
 * Play Console.
 */

import type { CatalogueDeCafes, IssueDuPourboire, Tasses } from "../types/soutien.types";

export interface PortPourboire {
  /** Les cafés proposés, avec leur prix localisé quand le store le sait. */
  lireCatalogue(): Promise<CatalogueDeCafes>;
  /** Ouvre la feuille d'achat du store pour ce produit. */
  offrir(produitId: string): Promise<IssueDuPourboire>;
}

export const PRODUITS: Record<Tasses, string> = {
  1: "com.karria.cafe.1",
  2: "com.karria.cafe.2",
  3: "com.karria.cafe.3",
};

const TAILLES: readonly Tasses[] = [1, 2, 3];

export const bientot: PortPourboire = {
  async lireCatalogue() {
    return {
      disponible: false,
      offres: TAILLES.map((tasses) => ({
        tasses,
        produitId: PRODUITS[tasses],
        prix: null,
      })),
    };
  },
  async offrir(produitId) {
    throw new Error(`achat intégré non branché (${produitId})`);
  },
};

/** Le port branché dans l'application. */
export const pourboire: PortPourboire = bientot;
