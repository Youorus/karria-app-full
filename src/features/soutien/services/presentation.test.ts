/**
 * Les mots du soutien : les prix viennent du serveur, les dates se lisent en
 * français, et l'état de l'abonnement dit quoi faire.
 */

import { describe, expect, it } from "@jest/globals";

import { versCatalogue, versFacturation } from "../api/soutien.api";
import type { CatalogueBrut, FacturationBrute } from "../types/soutien.types";
import {
  etatSansPub,
  libelleDOffre,
  nomDesTasses,
  prixMensuel,
  tassesDessinees,
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
  it("nomme et dessine les tasses", () => {
    expect(nomDesTasses(5)).toBe("Cinq cafés");
    expect(tassesDessinees(3)).toBe("☕☕☕");
    expect(tassesDessinees(5)).toBe("☕☕☕+");
    expect(libelleDOffre({ tasses: 2, prixCentimes: 499 })).toBe(
      "Offrir deux cafés · 4,99 €",
    );
    expect(libelleDOffre(null)).toBe("Offrir un café");
    expect(prixMensuel(499)).toBe("4,99 € / mois");
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
