/**
 * Les limites de l'IA du compte gratuit, et la porte vers Karria sans pub.
 *
 * ═══ Ce que l'API répond ═══
 *
 * Passé un plafond (ADR-0038 de l'API : portraits, imports, dossiers,
 * lettres, paragraphes par mois ; messages à Karria par 24 heures), l'API
 * répond `429` avec une raison `*_quota_exceeded` ou `assistant_rate_limited`,
 * et `details.subscriber`. Son message est écrit pour être lu : il propose
 * Karria sans pub à qui ne l'a pas, et parle d'usage raisonnable à l'abonné.
 *
 * Ici, on reconnaît ce refus et on dit s'il faut proposer l'abonnement —
 * jamais à quelqu'un qui l'a déjà.
 */

import { ErreurApi } from "@/lib/http";

/** Un plafond d'IA atteint : le message du serveur, et s'il faut proposer l'abonnement. */
export interface QuotaAtteint {
  message: string;
  proposerSansPub: boolean;
}

/** Où mène « Voir Karria sans pub » : l'offre du profil, ouverte d'emblée. */
export const VERS_SANS_PUB = {
  pathname: "/profil",
  params: { offre: "sans-pub" },
} as const;

export const TEXTES_QUOTA = {
  titre: "Limite atteinte",
  voirSansPub: "Voir Karria sans pub",
  plusTard: "Plus tard",
} as const;

/** `null` si la cause n'est pas un plafond d'IA atteint. */
export function quotaAtteint(cause: unknown): QuotaAtteint | null {
  if (!(cause instanceof ErreurApi) || cause.statut !== 429) return null;
  const raison = cause.raison ?? "";
  if (!raison.endsWith("_quota_exceeded") && raison !== "assistant_rate_limited")
    return null;
  return { message: cause.message, proposerSansPub: cause.details.subscriber !== true };
}
