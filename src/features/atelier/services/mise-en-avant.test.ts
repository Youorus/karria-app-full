import { describe, expect, it } from "@jest/globals";

import type { Cv, Experience } from "@/features/cv/types/cv.types";

import {
  deplacerElement,
  elementsMasques,
  masquerElement,
  montrerElement,
} from "./mise-en-avant";

const exp = (poste: string, entreprise: string): Experience => ({
  poste,
  entreprise,
  lieu: null,
  debut: null,
  fin: null,
  enCours: false,
  missions: [],
});

const base: Cv = {
  identite: null,
  contact: null,
  presentation: null,
  photo: null,
  experiences: [exp("A", "a"), exp("B", "b"), exp("C", "c")],
  formations: [],
  competences: [{ nom: "Vente", niveau: "Avancé" }],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "",
};

describe("la mise en avant", () => {
  it("déplace un élément dans sa liste", () => {
    const cv = deplacerElement(base, "experiences", 2, 0);
    expect(cv.experiences.map((e) => e.poste)).toEqual(["C", "A", "B"]);
    expect(deplacerElement(base, "experiences", 0, 5)).toBe(base);
  });

  it("masque un élément, le reconnaît comme masqué, et le remet à sa place", () => {
    const copie = masquerElement(base, "experiences", 1);
    expect(copie.experiences.map((e) => e.poste)).toEqual(["A", "C"]);
    expect(
      elementsMasques(base, copie, "experiences").map((e) => "poste" in e && e.poste),
    ).toEqual(["B"]);
    const revenu = montrerElement(base, copie, "experiences", "exp:B|b|");
    expect(revenu.experiences.map((e) => e.poste)).toEqual(["A", "B", "C"]);
  });

  it("remet l'élément après le dernier de base encore présent, même réordonné", () => {
    const copie = deplacerElement(
      masquerElement(base, "experiences", 1),
      "experiences",
      1,
      0,
    );
    // copie : C, A — B doit revenir après A.
    const revenu = montrerElement(base, copie, "experiences", "exp:B|b|");
    expect(revenu.experiences.map((e) => e.poste)).toEqual(["C", "A", "B"]);
  });
});
