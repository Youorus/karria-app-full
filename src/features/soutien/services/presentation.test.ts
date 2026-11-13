/**
 * Les mots du soutien : les prix viennent du serveur, les dates se lisent en
 * français, et l'état de l'abonnement dit quoi faire.
 */

import { describe, expect, it } from "@jest/globals";

import { versCatalogue, versFacturation } from "../api/soutien.api";
import type { CatalogueBrut, FacturationBrute } from "../types/soutien.types";
import {
  annuelParMois,
  moisOfferts,
  prixAnnuel,
  cafesDejaOfferts,
  libelleAbonnement,
  prixParJour,
  etatSansPub,
  libelleDOffre,
  motCafe,
  nomDesTasses,
  prixMensuel,
  prixParMois,
  TEXTES,
} from "./presentation";

const CATALOGUE: CatalogueBrut = {
  currency: "eur",
  ad_free: {
    lookup_key: "karria_ad_free_monthly",
    label: "Karria sans pub",
    amount_cents: 499,
    currency: "eur",
    interval: "month",
  },
  coffees: [
    { count: 1, lookup_key: "k1", label: "1 café", amount_cents: 299, currency: "eur" },
    { count: 2, lookup_key: "k2", label: "2 cafés", amount_cents: 499, currency: "eur" },
    { count: 3, lookup_key: "k3", label: "3 cafés", amount_cents: 799, currency: "eur" },
    { count: 5, lookup_key: "k5", label: "5 cafés", amount_cents: 1299, currency: "eur" },
    { count: 9, lookup_key: "k9", label: "9 cafés", amount_cents: 1, currency: "eur" },
  ],
  templates: [{ template_id: "t1", label: "Meridian", amount_cents: 499 }],
  enabled: { ios: false, android: true },
};

const FACTURATION: FacturationBrute = {
  ad_free: {
    active: true,
    status: "active",
    until: "2026-11-28T12:00:00Z",
    cancel_at_period_end: false,
    manageable: true,
  },
  thanks: { coffees: 3, total_cents: 799, last_at: "2026-10-29T12:00:00Z" },
  enabled: { ios: true, android: true },
};

describe("Le catalogue", () => {
  it("garde les paliers du contrat, les prix du serveur et l'interrupteur de la plateforme", () => {
    const ios = versCatalogue(CATALOGUE, "ios");
    expect(ios.sansPub).toEqual({ libelle: "Karria sans pub", prixCentimes: 499 });
    expect(ios.cafes.map((c) => c.tasses)).toEqual([1, 2, 3, 5]);
    expect(ios.cafes[3]?.prixCentimes).toBe(1299);
    expect(ios.modeles.get("t1")).toBe(499);
    expect(ios.actif).toBe(false);
    expect(versCatalogue(CATALOGUE, "android").actif).toBe(true);
  });

  it("lit l'annuel quand le serveur le vend, et s'en passe sinon", () => {
    expect(versCatalogue(CATALOGUE, "ios").sansPubAnnuel).toBeNull();
    const avec = versCatalogue(
      {
        ...CATALOGUE,
        ad_free_yearly: {
          lookup_key: "karria_ad_free_yearly",
          label: "Karria sans pub (annuel)",
          amount_cents: 4990,
          currency: "eur",
          interval: "year",
        },
      },
      "ios",
    );
    expect(avec.sansPubAnnuel).toEqual({ prixCentimes: 4990 });
  });
});

describe("La facturation", () => {
  it("traduit l'abonnement et les cafés", () => {
    const f = versFacturation(FACTURATION, "ios");
    expect(f.sansPub.actif).toBe(true);
    expect(f.sansPub.statut).toBe("actif");
    expect(f.sansPub.jusquAu?.toISOString()).toBe("2026-11-28T12:00:00.000Z");
    expect(f.cafes.nombre).toBe(3);
    expect(f.actif).toBe(true);
  });

  it("refuse un état inconnu plutôt que de le taire", () => {
    const brut = {
      ...FACTURATION,
      ad_free: { ...FACTURATION.ad_free, status: "paused" as never },
    };
    expect(() => versFacturation(brut, "ios")).toThrow(/inconnu/);
  });
});

describe("Les mots", () => {
  it("nomme les tasses, sans émoji", () => {
    expect(nomDesTasses(5)).toBe("Cinq cafés");
    expect(motCafe(1)).toBe("café");
    expect(motCafe(3)).toBe("cafés");
    expect(libelleDOffre({ tasses: 2, prixCentimes: 499 })).toBe(
      "Offrir deux cafés · 4,99 €",
    );
    expect(libelleDOffre(null)).toBe("Offrir un café");
    expect(prixMensuel(499)).toBe("4,99 € / mois");
    expect(prixParMois(499)).toBe("4,99 € par mois");
  });

  it("promet trois bénéfices lisibles, sans engagement, et la rassurance Stripe", () => {
    expect(TEXTES.comparatif).toHaveLength(3);
    expect(TEXTES.garanties).toHaveLength(3);
    expect(TEXTES.sansPubPromesse).toMatch(/sans engagement/i);
    expect(TEXTES.sansPubPromesse).toMatch(/résiliable à tout moment/i);
    expect(TEXTES.stripe).toMatch(/Stripe/);
  });

  it("ramène le prix au jour sans l'embellir, et rappelle les cafés offerts", () => {
    expect(prixParJour(499)).toBe("moins de 0,17 € par jour");
    expect(prixParJour(300)).toBe("soit 0,10 € par jour");
    expect(libelleAbonnement(499)).toBe("S'abonner pour 4,99 € / mois");
    expect(prixAnnuel(4990)).toBe("49,90 € / an");
    expect(annuelParMois(4990)).toBe("moins de 4,16 € par mois");
    expect(moisOfferts(499, 4990)).toBe("2 mois offerts");
    expect(moisOfferts(499, 5988)).toBeNull();
    expect(cafesDejaOfferts(0)).toBeNull();
    expect(cafesDejaOfferts(1)).toBe("Tu nous as déjà offert un café. Merci !");
    expect(cafesDejaOfferts(4)).toBe("Tu nous as déjà offert 4 cafés. Merci !");
  });

  it("dit l'état de l'abonnement et quoi faire", () => {
    const base = versFacturation(FACTURATION, "ios").sansPub;
    expect(etatSansPub(base)).toEqual({
      texte: "Aucune annonce dans ton fil. Prochain renouvellement le 28 novembre 2026.",
      alerte: false,
    });
    expect(etatSansPub({ ...base, resiliationEnFinDePeriode: true }).texte).toMatch(
      /s'arrête le 28 novembre 2026/,
    );
    const impaye = etatSansPub({ ...base, statut: "impaye" });
    expect(impaye.alerte).toBe(true);
    expect(impaye.texte).toMatch(/mets ta carte à jour/);
    expect(etatSansPub({ ...base, statut: "impaye", jusquAu: null }).texte).toMatch(
      /Mets ta carte à jour/,
    );
    expect(etatSansPub({ ...base, jusquAu: null }).texte).toMatch(/Merci de soutenir/);
    expect(
      etatSansPub({ ...base, resiliationEnFinDePeriode: true, jusquAu: null }).texte,
    ).toMatch(/fin de la période/);
  });
});
