/**
 * Le pont entre un formulaire et le CV du dossier (`edition.ts`), sur le
 * poste visé et la précision écrite dessous : enregistrer l'un ne doit
 * jamais effacer l'autre sans qu'on l'ait demandé.
 */

import { describe, expect, it } from "@jest/globals";

import type { Cv } from "@/features/cv/types/cv.types";

import { cvAvecIntitule, cvAvecSection } from "./edition";

const cv: Cv = {
  identite: {
    prenom: "Awa",
    nom: "Diallo",
    titre: "Vendeuse",
    precision: "Disponible immédiatement",
  },
  contact: null,
  presentation: null,
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "",
};

describe("cvAvecIntitule", () => {
  it("change le poste visé sans toucher à la précision quand elle n'est pas donnée", () => {
    expect(cvAvecIntitule(cv, "  Conseillère de vente ").identite).toEqual({
      prenom: "Awa",
      nom: "Diallo",
      titre: "Conseillère de vente",
      precision: "Disponible immédiatement",
    });
  });

  it("pose la précision, nettoyée, et l'efface quand elle est vide", () => {
    expect(
      cvAvecIntitule(cv, "Vendeuse", " Recherche alternance 24 mois ").identite
        ?.precision,
    ).toBe("Recherche alternance 24 mois");
    expect(cvAvecIntitule(cv, "Vendeuse", "   ").identite?.precision).toBeNull();
    expect(cvAvecIntitule(cv, "", "").identite).toEqual({
      prenom: "Awa",
      nom: "Diallo",
      titre: null,
      precision: null,
    });
  });

  it("part d'une identité vide quand le CV n'en a pas", () => {
    expect(
      cvAvecIntitule({ ...cv, identite: null }, "Vendeuse", "Dès demain").identite,
    ).toEqual({ prenom: "", nom: "", titre: "Vendeuse", precision: "Dès demain" });
  });
});

describe("cvAvecSection", () => {
  it("écrit l'identité entière, précision comprise", () => {
    const suivant = cvAvecSection(cv, {
      section: "identity",
      valeur: {
        prenom: "Awa",
        nom: "Diallo",
        titre: "Vendeuse",
        precision: "Dès janvier",
      },
    });
    expect(suivant.identite?.precision).toBe("Dès janvier");
  });
});
