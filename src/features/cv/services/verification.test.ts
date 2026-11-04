/**
 * « À vérifier » après un import, et ce qui manque au CV.
 *
 * `manquantsDuCv` doit dire la même chose que le serveur
 * (`CurriculumVitae.missing_fields`) : coordonnées d'abord, puis identité,
 * à-propos, expériences et formations (présence et dates), compétences.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { Cv } from "../types/cv.types";
import {
  effacerVerification,
  manquantsDuCv,
  marquerImporte,
  marquerVerifie,
  sectionDuManquant,
  useVerification,
} from "./verification";

const complet: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: "Vendeuse" },
  contact: { email: "a@b.fr", telephone: "06", ville: "Paris", liens: [] },
  presentation: "Moi.",
  photo: null,
  experiences: [
    {
      poste: "V",
      entreprise: "Z",
      lieu: null,
      debut: "2020",
      fin: null,
      enCours: true,
      missions: [],
    },
  ],
  formations: [
    { diplome: "BTS", ecole: "L", lieu: null, debut: null, fin: "2019", enCours: false },
  ],
  competences: [{ nom: "Vente", niveau: "Expert" }],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "",
};

describe("Ce qui manque au CV", () => {
  it("ne manque de rien quand tout y est", () => {
    expect(manquantsDuCv(complet)).toEqual([]);
  });

  it("suit l'ordre du serveur : coordonnées, identité, à-propos, listes, compétences", () => {
    const troue: Cv = {
      ...complet,
      contact: { email: null, telephone: null, ville: null, liens: [] },
      identite: { prenom: "Awa", nom: "Diallo", titre: null },
      presentation: null,
      experiences: [{ ...complet.experiences[0], debut: null }],
      formations: [{ ...complet.formations[0], fin: null }],
      competences: [],
    };
    expect(manquantsDuCv(troue)).toEqual([
      "contact.phone",
      "contact.email",
      "contact.city",
      "identity.headline",
      "summary",
      "experiences.dates",
      "educations.dates",
      "skills",
    ]);
    expect(
      manquantsDuCv({ ...troue, contact: null, identite: null, experiences: [] }),
    ).toContain("identity");
    expect(manquantsDuCv({ ...troue, experiences: [] })).toContain("experiences");
  });

  it("rattache chaque manque à sa section", () => {
    expect(sectionDuManquant("contact.phone")).toBe("contact");
    expect(sectionDuManquant("identity.headline")).toBe("identity");
    expect(sectionDuManquant("experiences.dates")).toBe("experiences");
    expect(sectionDuManquant("educations")).toBe("educations");
    expect(sectionDuManquant("skills")).toBe("skills");
    expect(sectionDuManquant("summary")).toBe("summary");
  });
});

describe("Le store « à vérifier »", () => {
  beforeEach(() => effacerVerification());

  it("met tout à vérifier après un import, coordonnées en tête, puis s'allège section par section", () => {
    const { result } = renderHook(() => useVerification());
    expect(result.current.importRecent).toBe(false);

    act(() => marquerImporte());
    expect(result.current.aVerifier).toEqual(["contact", "experiences", "educations"]);
    expect(result.current.importRecent).toBe(true);

    act(() => marquerVerifie("contact"));
    expect(result.current.aVerifier).toEqual(["experiences", "educations"]);

    act(() => marquerVerifie("skills"));
    expect(result.current.aVerifier).toEqual(["experiences", "educations"]);

    act(() => {
      marquerVerifie("experiences");
      marquerVerifie("educations");
    });
    expect(result.current.importRecent).toBe(false);
  });

  it("s'efface d'un geste", () => {
    const { result } = renderHook(() => useVerification());
    act(() => marquerImporte());
    act(() => effacerVerification());
    expect(result.current.aVerifier).toEqual([]);
  });
});
