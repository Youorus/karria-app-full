/**
 * L'identité affichée au profil ne doit jamais inventer, ni rester vide.
 */

import { describe, expect, it } from "@jest/globals";

import type { Cv } from "@/features/cv/types/cv.types";

import { etatDuCv, identite, initiales, resumeDuCv } from "./identite";

const CV_VIDE: Cv = {
  identite: null,
  contact: null,
  presentation: null,
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: true,
};

const CV_REMPLI: Cv = {
  ...CV_VIDE,
  identite: { prenom: "Marc", nom: "Takoumba", titre: "Data engineer" },
  photo: "https://exemple.fr/photo.jpg",
  experiences: [
    {
      poste: "Dev",
      entreprise: "Karria",
      lieu: null,
      debut: null,
      fin: null,
      enCours: true,
      missions: [],
    },
  ],
  vide: false,
};

describe("L'identité du profil", () => {
  it("prend le nom, le métier et la photo du CV quand il existe", () => {
    expect(identite("marc@exemple.fr", CV_REMPLI)).toEqual({
      nom: "Marc Takoumba",
      titre: "Data engineer",
      initiales: "MT",
      photo: "https://exemple.fr/photo.jpg",
    });
  });

  it("retombe sur la partie locale de l'e-mail sans CV, sans inventer de prénom", () => {
    expect(identite("marc.t@exemple.fr", null)).toEqual({
      nom: "marc.t",
      titre: null,
      initiales: "M",
      photo: null,
    });
  });

  it("n'affiche jamais une case vide", () => {
    expect(identite(null, null).nom).toBe("Toi");
    expect(initiales("", "", "")).toBe("K");
  });
});

describe("L'état du CV", () => {
  it("distingue absent, en cours et prêt", () => {
    expect(etatDuCv(null, false)).toBe("absent");
    expect(etatDuCv(CV_VIDE, true)).toBe("en-cours");
    expect(etatDuCv(CV_REMPLI, true)).toBe("pret");
  });

  it("compte les expériences au singulier comme au pluriel", () => {
    expect(resumeDuCv("pret", CV_REMPLI)).toBe("Prêt · 1 expérience");
    expect(
      resumeDuCv("pret", {
        ...CV_REMPLI,
        experiences: [...CV_REMPLI.experiences, ...CV_REMPLI.experiences],
      }),
    ).toBe("Prêt · 2 expériences");
  });
});
