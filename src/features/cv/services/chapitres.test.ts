import { describe, expect, it } from "@jest/globals";

import { DEFINITIONS, moisLisible, periodeLisible, veutPasser } from "./chapitres";

describe("Les dates du CV", () => {
  it("écrit le mois en clair", () => {
    expect(moisLisible("2021-09")).toBe("sept. 2021");
    expect(moisLisible(null)).toBeNull();
  });

  it("dit « aujourd'hui » pour un poste en cours", () => {
    expect(periodeLisible("2022-01", null, true)).toBe("janv. 2022 – aujourd'hui");
    expect(periodeLisible(null, null, false)).toBeNull();
  });
});

describe("Les chapitres", () => {
  it("n'autorisent jamais à passer l'identité ni le contact", () => {
    expect(DEFINITIONS.identity.facultatif).toBe(false);
    expect(DEFINITIONS.contact.facultatif).toBe(false);
  });

  it("reconnaissent les suggestions qui passent le chapitre", () => {
    expect(veutPasser("Je n'ai pas encore d'expérience")).toBe(true);
    expect(veutPasser("J'aime le contact avec les gens")).toBe(false);
  });
});
