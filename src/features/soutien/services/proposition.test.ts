/**
 * Les mots de la proposition d'abonnement (`proposition.ts`) : ceux que
 * Marc a écrits pour la campagne, avec le prix du catalogue — jamais un
 * montant inventé.
 */

import { describe, expect, it } from "@jest/globals";

import { propositionFiligrane, propositionPortraits } from "./proposition";

describe("La proposition après un CV filigrané", () => {
  it("dit le CV prêt, le filigrane, le prix et l'absence d'engagement", () => {
    expect(propositionFiligrane(499)).toEqual({
      titre: "Ton CV est prêt",
      texte:
        "Il porte le filigrane Karria. Pour le retirer et soutenir Karria, passe à Karria sans pub : 4,99 € par mois, sans engagement.",
      accepter: "Retirer le filigrane — 4,99 €/mois",
      refuser: "Garder mon CV avec le filigrane",
    });
  });

  it("suit le prix du serveur, et se passe du montant quand il est inconnu", () => {
    expect(propositionFiligrane(599).accepter).toBe("Retirer le filigrane — 5,99 €/mois");
    const sansPrix = propositionFiligrane(null);
    expect(sansPrix.accepter).toBe("Retirer le filigrane");
    expect(sansPrix.texte).not.toContain("€");
    expect(sansPrix.texte).toContain("sans engagement");
  });
});

describe("La proposition quand les portraits sont épuisés", () => {
  it("dit la limite du mois et ce que l'abonnement lève, avec un bouton pour fermer", () => {
    expect(propositionPortraits(3, 499)).toEqual({
      titre: "Limite atteinte",
      texte:
        "Tu as utilisé tes 3 portraits IA du mois. Karria sans pub lève la limite : 4,99 € par mois.",
      accepter: "Voir Karria sans pub",
      refuser: "Fermer",
    });
    expect(propositionPortraits(3, null).texte).toBe(
      "Tu as utilisé tes 3 portraits IA du mois. Karria sans pub lève la limite.",
    );
    // Le serveur n'a pas dit la limite : on ne l'invente pas.
    expect(propositionPortraits(null, 499).texte).toBe(
      "Tu as utilisé tes portraits IA du mois. Karria sans pub lève la limite : 4,99 € par mois.",
    );
  });
});
