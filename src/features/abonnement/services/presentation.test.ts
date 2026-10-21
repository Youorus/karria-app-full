/**
 * Les mots de l'abonnement : la carte du profil dit la vérité du plan.
 *
 * Le cas qui compte aujourd'hui est le plan gratuit — c'est le seul que
 * l'app affiche tant que Stripe n'est pas branché. Les autres protègent la
 * suite : ils ne doivent pas se casser le jour où un vrai plan arrive.
 */

import { describe, expect, it } from "@jest/globals";

import type { Abonnement } from "../types/abonnement.types";
import { actionDeLaCarte, libellePlan, phraseDEtat } from "./presentation";

const GRATUIT: Abonnement = {
  plan: "gratuit",
  statut: "actif",
  renouvellement: null,
  souscriptionDisponible: false,
};

describe("La carte d'abonnement, sur le plan gratuit", () => {
  it("dit « Gratuit » et que tout est inclus, sans promesse de prix", () => {
    expect(libellePlan(GRATUIT)).toBe("Gratuit");
    expect(phraseDEtat(GRATUIT)).toMatch(/tout est inclus/i);
  });

  it("propose un bouton « Bientôt » qui ne répond pas tant que le paiement est fermé", () => {
    expect(actionDeLaCarte(GRATUIT)).toEqual({ libelle: "Bientôt", active: false });
  });
});

describe("La carte d'abonnement, le jour où Premium existe", () => {
  it("annonce le renouvellement avec sa date", () => {
    const premium: Abonnement = {
      plan: "premium",
      statut: "actif",
      renouvellement: "2027-03-12T10:00:00Z",
      souscriptionDisponible: true,
    };
    expect(libellePlan(premium)).toBe("Karria Premium");
    expect(phraseDEtat(premium, new Date("2027-02-01"))).toBe(
      "Renouvellement le 12 mars.",
    );
    expect(actionDeLaCarte(premium)).toEqual({
      libelle: "Gérer mon abonnement",
      active: true,
    });
  });

  it("invite à découvrir Premium quand le paiement est ouvert et qu'on est gratuit", () => {
    expect(actionDeLaCarte({ ...GRATUIT, souscriptionDisponible: true })).toEqual({
      libelle: "Découvrir Premium",
      active: true,
    });
  });
});
