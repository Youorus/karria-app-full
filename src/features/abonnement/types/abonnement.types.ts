/**
 * L'abonnement : ce que la personne paie — ou, aujourd'hui, ne paie pas.
 *
 * ═══ Modélisé avant d'exister ═══
 *
 * Karria est gratuit tant que la refonte n'est pas finie, et Stripe n'est
 * pas branché. Mais l'écran du profil montre déjà la zone d'abonnement,
 * et il doit la montrer avec le **même** état qu'il affichera le jour où
 * un vrai plan reviendra du serveur. D'où ce type dès maintenant : le jour
 * venu, seule la couche `api/` change, et l'écran ne bouge pas.
 *
 * ═══ Deux formes, comme partout ═══
 *
 * `…Brut` est la forme réseau prévue — calquée sur le vocabulaire de
 * Stripe (`active`, `trialing`, `canceled`) pour que la traduction côté
 * serveur soit un simple passage de champs. Le reste de l'application ne
 * voit que les mots en français.
 */

export type Plan = "gratuit" | "premium";

/** Où en est l'abonnement. Un plan gratuit est toujours `actif`. */
export type StatutAbonnement = "actif" | "essai" | "annule" | "expire";

export interface Abonnement {
  plan: Plan;
  statut: StatutAbonnement;
  /** La prochaine échéance (ISO 8601), ou `null` quand rien n'est à payer. */
  renouvellement: string | null;
  /** Vrai tant que le paiement n'est pas ouvert : le bouton dit « Bientôt ». */
  souscriptionDisponible: boolean;
}

export interface AbonnementBrut {
  plan: "free" | "premium";
  status: "active" | "trialing" | "canceled" | "expired";
  renews_at: string | null;
  checkout_available: boolean;
}
