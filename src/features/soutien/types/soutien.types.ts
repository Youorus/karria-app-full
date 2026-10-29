/**
 * Le soutien à l'équipe : « Karria sans pub » et « nous offrir un café »,
 * depuis le profil — calqué sur `docs/contrat-api-paiements.md`.
 *
 * ═══ Deux gestes, un seul moyen ═══
 *
 * Marc a tranché (octobre 2026) : Stripe seul, dans le navigateur, comme
 * Zoumani qu'Apple a validé. Aucun achat intégré, aucun SDK Stripe dans
 * l'application. L'abonnement « sans pub » retire les annonces ; un café ne
 * débloque **rien** — c'est un merci.
 *
 * ═══ Les prix viennent du serveur ═══
 *
 * En centimes, tels que Stripe les prélèvera. L'application ne connaît
 * aucun montant : si un prix change côté serveur, l'écran suit sans
 * livraison (AGENTS.md §6.4).
 */

/** Les paliers de cafés du serveur. */
export type Tasses = 1 | 2 | 3 | 5;

export type TypeDePaiement = "ad_free" | "coffee" | "template";

// ─── Ce que le serveur envoie ──────────────────────────────────────────

export interface PrixBrut {
  lookup_key: string;
  label: string;
  amount_cents: number;
  currency: string;
  interval?: "month" | null;
}

export interface CatalogueBrut {
  currency: string;
  ad_free: PrixBrut;
  coffees: (PrixBrut & { count: number })[];
  templates: { template_id: string; label: string; amount_cents: number }[];
  enabled: { ios: boolean; android: boolean };
}

export interface SessionPaiementBrute {
  checkout_url: string;
  session_id: string;
  payment_type: TypeDePaiement;
  mode: "payment" | "subscription";
  amount_cents: number;
  currency: string;
}

export interface StatutPaiementBrut {
  session_id: string;
  status: "paid" | "unpaid";
  payment_type: TypeDePaiement | null;
  fulfilled: boolean;
}

export interface FacturationBrute {
  ad_free: {
    active: boolean;
    status: "none" | "active" | "past_due" | "canceled";
    until: string | null;
    cancel_at_period_end: boolean;
    manageable: boolean;
  };
  thanks: { coffees: number; total_cents: number; last_at: string | null };
  enabled: { ios: boolean; android: boolean };
}

// ─── Ce que l'application manipule ─────────────────────────────────────

export interface OffreDeCafe {
  tasses: Tasses;
  prixCentimes: number;
}

export interface Catalogue {
  sansPub: { libelle: string; prixCentimes: number };
  cafes: OffreDeCafe[];
  /** Les modèles Premium en vente, par identifiant → prix en centimes. */
  modeles: Map<string, number>;
  /** Faux : l'app ne montre aucun paiement (interrupteur du serveur). */
  actif: boolean;
}

export type StatutSansPub = "aucun" | "actif" | "impaye" | "resilie";

export interface Facturation {
  sansPub: {
    actif: boolean;
    statut: StatutSansPub;
    /** La fin connue : période payée, ou grâce après un prélèvement en échec. */
    jusquAu: Date | null;
    resiliationEnFinDePeriode: boolean;
    /** Un client Stripe existe : le portail peut s'ouvrir. */
    gerable: boolean;
  };
  cafes: { nombre: number; dernierLe: Date | null };
  actif: boolean;
}

export interface SessionPaiement {
  id: string;
  adresse: string;
  type: TypeDePaiement;
  montantCentimes: number;
}

export interface StatutPaiement {
  id: string;
  paye: boolean;
  /** Vrai quand le serveur a reçu la notification de Stripe et livré. */
  livre: boolean;
}
