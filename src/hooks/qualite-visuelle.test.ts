/**
 * Le palier visuel : ce que l'aura et l'orbe supposent de la décision.
 */

import { describe, expect, it } from "@jest/globals";

import { palierVisuel } from "./qualite-visuelle";

const GO = 1024 * 1024 * 1024;

describe("Le palier visuel", () => {
  it("donne le haut à un iPhone, même sans indice", () => {
    expect(
      palierVisuel({
        plateforme: "ios",
        anneeAppareil: null,
        memoireOctets: null,
        densite: 3,
      }),
    ).toBe("haut");
    expect(
      palierVisuel({
        plateforme: "ios",
        anneeAppareil: 2023,
        memoireOctets: 6 * GO,
        densite: 3,
      }),
    ).toBe("haut");
  });

  it("descend un vieil iPhone à 2 Go d'un palier, jamais plus", () => {
    expect(
      palierVisuel({
        plateforme: "ios",
        anneeAppareil: 2016,
        memoireOctets: 2 * GO,
        densite: 2,
      }),
    ).toBe("moyen");
  });

  it("part du moyen sur Android sans indice", () => {
    expect(
      palierVisuel({
        plateforme: "android",
        anneeAppareil: null,
        memoireOctets: null,
        densite: 2.75,
      }),
    ).toBe("moyen");
  });

  it("donne le haut à un Android récent et bien doté", () => {
    expect(
      palierVisuel({
        plateforme: "android",
        anneeAppareil: 2022,
        memoireOctets: 8 * GO,
        densite: 3,
      }),
    ).toBe("haut");
  });

  it("met en bas un Android ancien, ou peu doté sur un écran peu dense", () => {
    expect(
      palierVisuel({
        plateforme: "android",
        anneeAppareil: 2015,
        memoireOctets: 4 * GO,
        densite: 3,
      }),
    ).toBe("bas");
    expect(
      palierVisuel({
        plateforme: "android",
        anneeAppareil: 2019,
        memoireOctets: 3 * GO,
        densite: 2,
      }),
    ).toBe("bas");
  });

  it("garde le moyen à un Android récent mais juste en mémoire", () => {
    expect(
      palierVisuel({
        plateforme: "android",
        anneeAppareil: 2021,
        memoireOctets: 3 * GO,
        densite: 2.75,
      }),
    ).toBe("moyen");
  });
});
