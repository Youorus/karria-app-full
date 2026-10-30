/**
 * L'intention en attente : retenue, consommée une fois, par la bonne clé.
 */

import { afterEach, describe, expect, it } from "@jest/globals";

import {
  consommerIntention,
  intentionEnAttente,
  oublierIntention,
  retenirIntention,
} from "./intention";

describe("intention", () => {
  afterEach(() => oublierIntention());

  it("n'a rien en attente au départ", () => {
    expect(intentionEnAttente()).toBeNull();
    expect(consommerIntention("karria")).toBeNull();
  });

  it("se consomme une seule fois, par la bonne clé", () => {
    retenirIntention({ cle: "offre.garder", charge: "o-1" });

    expect(consommerIntention("karria")).toBeNull();
    expect(intentionEnAttente()).toEqual({ cle: "offre.garder", charge: "o-1" });
    expect(consommerIntention("offre.garder")).toEqual({
      cle: "offre.garder",
      charge: "o-1",
    });
    expect(consommerIntention("offre.garder")).toBeNull();
  });

  it("la plus récente remplace la précédente, et « pas maintenant » efface", () => {
    retenirIntention({ cle: "cv.creer" });
    retenirIntention({ cle: "karria" });
    expect(intentionEnAttente()?.cle).toBe("karria");

    oublierIntention();
    expect(intentionEnAttente()).toBeNull();
  });
});
