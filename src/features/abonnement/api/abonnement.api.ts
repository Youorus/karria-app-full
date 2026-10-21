/**
 * L'abonnement de la personne connectée — pour l'instant, un bouchon.
 *
 * ═══ Ce que ce fichier est, et ce qu'il deviendra ═══
 *
 * Stripe n'est pas branché et le backend n'a pas encore de module de
 * facturation. Cette fonction rend donc le plan gratuit, **localement**,
 * sans réseau — mais en passant par la même traduction `versAbonnement`
 * que le vrai appel empruntera. Brancher Stripe se résumera à remplacer
 * le corps de `lireMonAbonnement` par :
 *
 *     return versAbonnement(await http.get<AbonnementBrut>("/billing/me"));
 *
 * et à ajouter la route au faux serveur. Rien d'autre ne change : l'écran
 * du profil, le hook et les libellés lisent déjà la forme finale.
 *
 * ═══ Pourquoi un bouchon ici et non un faux plan dans l'écran ═══
 *
 * Parce qu'un écran qui invente son état ment deux fois : une fois
 * aujourd'hui, et une fois le jour où quelqu'un oubliera de le retirer.
 * Ici, la donnée a une seule origine, et c'est celle qui sera remplacée.
 *
 * `http` n'est pas importé exprès : un import inutilisé serait retiré par
 * le lint, et il signalerait faussement un appel réseau.
 */

import type { Abonnement, AbonnementBrut } from "../types/abonnement.types";

const PLANS = { free: "gratuit", premium: "premium" } as const;
const STATUTS = {
  active: "actif",
  trialing: "essai",
  canceled: "annule",
  expired: "expire",
} as const;

export function versAbonnement(brut: AbonnementBrut): Abonnement {
  return {
    plan: PLANS[brut.plan],
    statut: STATUTS[brut.status],
    renouvellement: brut.renews_at,
    souscriptionDisponible: brut.checkout_available,
  };
}

/** Ce que le serveur dira tant que Karria est gratuit. */
const GRATUIT_BRUT: AbonnementBrut = {
  plan: "free",
  status: "active",
  renews_at: null,
  checkout_available: false,
};

export async function lireMonAbonnement(): Promise<Abonnement> {
  return versAbonnement(GRATUIT_BRUT);
}
