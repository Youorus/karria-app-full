/**
 * Les mots du café : le bouton ne promet jamais un paiement qui n'existe
 * pas, et ne montre jamais un prix que le store n'a pas donné.
 */

import { describe, expect, it } from "@jest/globals";

import { bientot } from "./pourboire";
import { libelleDOffre, nomDesTasses, tassesDessinees } from "./presentation";

describe("La carte café", () => {
  it("dit « Bientôt » tant que l'achat intégré n'est pas branché", async () => {
    const catalogue = await bientot.lireCatalogue();
    expect(catalogue.disponible).toBe(false);
    expect(catalogue.offres.map((o) => o.produitId)).toEqual([
      "com.karria.cafe.1",
      "com.karria.cafe.2",
      "com.karria.cafe.3",
    ]);
    expect(libelleDOffre(catalogue.offres[0] ?? null, catalogue.disponible)).toBe(
      "Bientôt",
    );
    await expect(bientot.offrir("com.karria.cafe.1")).rejects.toThrow(/non branché/);
  });

  it("nomme le geste, avec le prix du store seulement s'il est connu", () => {
    const offre = { tasses: 2 as const, produitId: "com.karria.cafe.2", prix: null };
    expect(libelleDOffre(offre, true)).toBe("Offrir deux cafés");
    expect(libelleDOffre({ ...offre, prix: "2,99 €" }, true)).toBe(
      "Offrir deux cafés · 2,99 €",
    );
  });

  it("dessine et nomme les tasses", () => {
    expect(tassesDessinees(3)).toBe("☕☕☕");
    expect(nomDesTasses(1)).toBe("Un café");
  });
});
