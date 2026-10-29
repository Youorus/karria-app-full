/**
 * Le faux serveur des paiements : les routes `/payments/` de
 * `docs/contrat-api-paiements.md`, pour concevoir la carte de soutien et
 * l'achat d'un modèle sans compte Stripe.
 *
 * ═══ Ce qu'il imite, et ce qu'il n'imite pas ═══
 *
 * La forme exacte des réponses — catalogue, session, statut, droits — et
 * les refus du contrat (`subscription_already_active`,
 * `template_already_owned`, `template_not_found`,
 * `coffee_count_out_of_bounds`). Il n'y a pas de page Stripe à ouvrir : la
 * session est **livrée dès son ouverture** (le hook de soutien le sait et
 * saute le navigateur en simulation), et `fulfilled` passe à vrai à la
 * seconde relecture, pour voir l'état « on attend la confirmation ».
 *
 * Un modèle acheté rejoint « les miens » du faux serveur des modèles
 * (`possederModele`), comme le ferait le vrai serveur par son webhook.
 */

import { possederModele, trouverModele } from "./modeles-simule";

const PRIX_SANS_PUB = 499;
const CAFES: Record<number, number> = { 1: 299, 2: 499, 3: 799, 5: 1299 };

interface Session {
  type: "ad_free" | "coffee" | "template";
  lectures: number;
  tasses?: number;
  modeleId?: string;
}

const etat = {
  sessions: new Map<string, Session>(),
  sansPub: false,
  cafes: 0,
  dernierCafe: null as string | null,
  resiliation: false,
};

export function estUneRoutePaiement(chemin: string): boolean {
  return chemin.split("?")[0].startsWith("/payments/");
}

function json(statut: number, corps: unknown): Response {
  return new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(statut: number, code: string, message: string, details = {}): Response {
  return json(statut, {
    error: { code, message, details: { reason: code, ...details } },
  });
}

function champ(corps: unknown, nom: string): unknown {
  return typeof corps === "object" && corps !== null
    ? (corps as Record<string, unknown>)[nom]
    : undefined;
}

function prix(lookupKey: string, label: string, centimes: number, interval?: "month") {
  return {
    lookup_key: lookupKey,
    label,
    amount_cents: centimes,
    currency: "eur",
    interval,
  };
}

function catalogue() {
  return {
    currency: "eur",
    ad_free: prix("karria_ad_free_monthly", "Karria sans pub", PRIX_SANS_PUB, "month"),
    coffees: Object.entries(CAFES).map(([n, c]) => ({
      count: Number(n),
      ...prix(`karria_coffee_${n}`, `${n} café${Number(n) > 1 ? "s" : ""}`, c),
    })),
    templates: [
      {
        template_id: trouverModele("premium")?.id ?? "",
        label: "Premium",
        amount_cents: 499,
      },
    ],
    enabled: { ios: true, android: true },
  };
}

function droits() {
  const dans30Jours = new Date(Date.now() + 30 * 86_400_000).toISOString();
  return {
    ad_free: {
      active: etat.sansPub,
      status: etat.sansPub ? "active" : "none",
      until: etat.sansPub ? dans30Jours : null,
      cancel_at_period_end: etat.sansPub && etat.resiliation,
      manageable: etat.sansPub || etat.cafes > 0,
    },
    thanks: { coffees: etat.cafes, total_cents: 0, last_at: etat.dernierCafe },
    enabled: { ios: true, android: true },
  };
}

/** Ouvre une session « payée » : l'effet est appliqué tout de suite. */
function ouvrir(session: Session, montant: number): Response {
  const id = `cs_simule_${Math.random().toString(36).slice(2, 10)}`;
  etat.sessions.set(id, session);
  return json(201, {
    checkout_url: "https://karria.fr/paiement/simulation",
    session_id: id,
    payment_type: session.type,
    mode: session.type === "ad_free" ? "subscription" : "payment",
    amount_cents: montant,
    currency: "eur",
  });
}

function livrer(session: Session): void {
  if (session.type === "ad_free") etat.sansPub = true;
  if (session.type === "coffee") {
    etat.cafes += session.tasses ?? 1;
    etat.dernierCafe = new Date().toISOString();
  }
  if (session.type === "template" && session.modeleId !== undefined) {
    possederModele(session.modeleId);
  }
}

export function repondrePaiements(
  methode: string,
  chemin: string,
  corps: unknown,
): Response {
  const route = `${methode} ${chemin.split("?")[0]}`;

  if (route === "GET /payments/catalog") return json(200, catalogue());
  if (route === "GET /payments/me") return json(200, droits());

  if (route === "POST /payments/portal-session") {
    if (!etat.sansPub && etat.cafes === 0) {
      return erreur(404, "billing_account_not_found", "Aucun paiement connu.");
    }
    // Ouvrir le portail en simulation « résilie en fin de période » : c'est
    // l'état qu'on veut voir sur la carte au retour.
    etat.resiliation = true;
    return json(201, { url: "https://karria.fr/paiement/simulation-portail" });
  }

  if (route === "POST /payments/checkout-session") {
    const type = champ(corps, "payment_type");
    if (type === "ad_free") {
      if (etat.sansPub) {
        return erreur(409, "subscription_already_active", "Déjà abonné.", {
          payment_failed: false,
        });
      }
      return ouvrir({ type: "ad_free", lectures: 0 }, PRIX_SANS_PUB);
    }
    if (type === "coffee") {
      const tasses = Number(champ(corps, "coffee_count") ?? 1);
      const montant = CAFES[tasses];
      if (montant === undefined) {
        return erreur(422, "coffee_count_out_of_bounds", "Palier inconnu.", {
          field: "coffee_count",
        });
      }
      return ouvrir({ type: "coffee", lectures: 0, tasses }, montant);
    }
    if (type === "template") {
      const id = String(champ(corps, "template_id") ?? "");
      const modele = trouverModele(id);
      if (modele === undefined || !modele.is_premium) {
        return erreur(404, "template_not_found", "Ce modèle n'est pas en vente.");
      }
      if (modele.possede) {
        return erreur(409, "template_already_owned", "Déjà à toi.");
      }
      return ouvrir({ type: "template", lectures: 0, modeleId: id }, 499);
    }
    return erreur(422, "invalid_input", "Type de paiement inconnu.", {
      field: "payment_type",
    });
  }

  const statut = /^GET \/payments\/status\/([^/]+)$/.exec(route);
  if (statut !== null) {
    const session = etat.sessions.get(statut[1]);
    if (session === undefined) return erreur(404, "not_found", "Paiement introuvable.");
    session.lectures += 1;
    // La première relecture dit « pas encore » : on voit l'attente à l'écran.
    const livre = session.lectures >= 2;
    if (livre && session.lectures === 2) livrer(session);
    return json(200, {
      session_id: statut[1],
      status: "paid",
      payment_type: session.type,
      fulfilled: livre,
    });
  }

  console.warn(`[karria] simulation : aucune route pour « ${route} »`);
  return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
}

/** Pour les tests seulement : repart sans paiement. */
export function reinitialiserPaiements(): void {
  etat.sessions.clear();
  etat.sansPub = false;
  etat.cafes = 0;
  etat.dernierCafe = null;
  etat.resiliation = false;
}
