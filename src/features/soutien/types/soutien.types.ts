/**
 * Le soutien à l'équipe : « offrir un café » depuis le profil.
 *
 * ═══ Pourquoi pas un abonnement ═══
 *
 * Marc a renoncé à l'abonnement (octobre 2026) : Karria reste gratuit,
 * pour tout le monde, sans formule bridée. À la place, une invitation
 * chaleureuse à soutenir l'équipe, à la manière des « Buy me a coffee »
 * des équipes indépendantes. Un café ne débloque **rien** : c'est un
 * merci, pas un achat de fonctionnalité.
 *
 * ═══ Pourquoi l'achat intégré ═══
 *
 * Un pourboire au développeur dans une app des stores passe par l'achat
 * intégré (Apple, règle 3.1.1 ; Google Play Billing). Un lien de don
 * externe est refusé pour cet usage. Chaque taille de café est donc un
 * **produit consommable** des stores, identifié par `produitId`.
 */

/** Le nombre de tasses : trois montants, pas un champ libre. */
export type Tasses = 1 | 2 | 3;

export interface OffreDeCafe {
  tasses: Tasses;
  /** L'identifiant du produit consommable, le même sur les deux stores. */
  produitId: string;
  /** Le prix localisé rendu par le store (« 2,99 € »), `null` tant que
   *  le store ne l'a pas dit — on n'affiche jamais un prix inventé. */
  prix: string | null;
}

/** Ce que le store permet aujourd'hui. */
export interface CatalogueDeCafes {
  /** Faux tant que l'achat intégré n'est pas branché : « Bientôt ». */
  disponible: boolean;
  offres: OffreDeCafe[];
}

/** L'issue d'un pourboire : la personne peut renoncer dans la feuille du
 *  store, ce n'est pas une erreur. */
export type IssueDuPourboire = "merci" | "renonce";
