/**
 * Les paiements et les droits — `docs/contrat-api-paiements.md`.
 *
 * ═══ Aucun montant ne part d'ici ═══
 *
 * La requête d'ouverture ne dit que **quoi** (le type, le nombre de cafés,
 * le modèle) : le prix est celui que le serveur a fixé chez Stripe. Un
 * champ « montant » serait une invitation à s'y fier un jour.
 *
 * ═══ Les adresses rendues ne se conservent pas ═══
 *
 * La page de paiement et le portail sont des sessions Stripe qui expirent.
 * On les demande au moment de les ouvrir, jamais avant.
 *
 * ═══ Le retour ═══
 *
 * Stripe dépose la personne sur une page de l'API, qui la renvoie vers
 * `RETOUR` : un lien du schéma de l'application, que la session du
 * navigateur reconnaît et referme. L'issue, elle, se relit toujours au
 * serveur (`lireStatut`, `lireFacturation`) — jamais dans l'adresse.
 */

import { http } from "@/lib/http";

import type {
  Catalogue,
  CatalogueBrut,
  Facturation,
  FacturationBrute,
  SessionPaiement,
  SessionPaiementBrute,
  StatutPaiement,
  StatutPaiementBrut,
  StatutSansPub,
  Tasses,
} from "../types/soutien.types";

/** Où Stripe nous renvoie — reconnu par `openAuthSessionAsync` et par la
 *  route `app/(app)/paiement/retour.tsx` si le lien arrive hors session. */
export const RETOUR = "karria://paiement/retour";

const TASSES: readonly Tasses[] = [1, 2, 3, 5];

function estTasses(n: number): n is Tasses {
  return (TASSES as readonly number[]).includes(n);
}

const VERS_STATUT: Record<FacturationBrute["ad_free"]["status"], StatutSansPub> = {
  none: "aucun",
  active: "actif",
  past_due: "impaye",
  canceled: "resilie",
};

function actifIci(
  enabled: { ios: boolean; android: boolean },
  plateforme: string,
): boolean {
  return plateforme === "ios" ? enabled.ios : enabled.android;
}

function versDate(iso: string | null): Date | null {
  return iso === null ? null : new Date(iso);
}

export function versCatalogue(brut: CatalogueBrut, plateforme: string): Catalogue {
  return {
    sansPub: { libelle: brut.ad_free.label, prixCentimes: brut.ad_free.amount_cents },
    cafes: brut.coffees
      .filter((c) => estTasses(c.count))
      .map((c) => ({ tasses: c.count as Tasses, prixCentimes: c.amount_cents })),
    modeles: new Map(brut.templates.map((t) => [t.template_id, t.amount_cents])),
    actif: actifIci(brut.enabled, plateforme),
  };
}

export function versFacturation(brut: FacturationBrute, plateforme: string): Facturation {
  const statut = VERS_STATUT[brut.ad_free.status];
  if (statut === undefined) {
    // Un état que le contrat ne connaît pas encore. Le taire ferait croire à
    // un abonnement absent — et proposerait d'en payer un second.
    throw new Error(`État d'abonnement inconnu : ${String(brut.ad_free.status)}`);
  }
  return {
    sansPub: {
      actif: brut.ad_free.active,
      statut,
      jusquAu: versDate(brut.ad_free.until),
      resiliationEnFinDePeriode: brut.ad_free.cancel_at_period_end,
      gerable: brut.ad_free.manageable,
    },
    cafes: { nombre: brut.thanks.coffees, dernierLe: versDate(brut.thanks.last_at) },
    actif: actifIci(brut.enabled, plateforme),
  };
}

function versSession(brute: SessionPaiementBrute): SessionPaiement {
  return {
    id: brute.session_id,
    adresse: brute.checkout_url,
    type: brute.payment_type,
    montantCentimes: brute.amount_cents,
  };
}

export async function lireCatalogue(plateforme: string): Promise<Catalogue> {
  return versCatalogue(await http.get<CatalogueBrut>("/payments/catalog"), plateforme);
}

export async function lireFacturation(plateforme: string): Promise<Facturation> {
  return versFacturation(await http.get<FacturationBrute>("/payments/me"), plateforme);
}

/** Ouvre la souscription « sans pub ». Refus : `subscription_already_active` (409). */
export async function ouvrirAbonnement(): Promise<SessionPaiement> {
  return versSession(
    await http.post<SessionPaiementBrute>("/payments/checkout-session", {
      payment_type: "ad_free",
      return_url: RETOUR,
    }),
  );
}

export async function ouvrirCafe(tasses: Tasses): Promise<SessionPaiement> {
  return versSession(
    await http.post<SessionPaiementBrute>("/payments/checkout-session", {
      payment_type: "coffee",
      coffee_count: tasses,
      return_url: RETOUR,
    }),
  );
}

/** Ouvre l'achat d'un modèle Premium. Refus : `template_not_found` (404),
 *  `template_already_owned` (409). */
export async function ouvrirAchatModele(modeleId: string): Promise<SessionPaiement> {
  return versSession(
    await http.post<SessionPaiementBrute>("/payments/checkout-session", {
      payment_type: "template",
      template_id: modeleId,
      return_url: RETOUR,
    }),
  );
}

export async function lireStatut(sessionId: string): Promise<StatutPaiement> {
  const brut = await http.get<StatutPaiementBrut>(`/payments/status/${sessionId}`);
  return { id: brut.session_id, paye: brut.status === "paid", livre: brut.fulfilled };
}

/** Le portail Stripe : carte, reçus, résiliation. Refus : `billing_account_not_found` (404). */
export async function ouvrirPortail(): Promise<string> {
  const brute = await http.post<{ url: string }>("/payments/portal-session", {
    return_url: RETOUR,
  });
  return brute.url;
}
