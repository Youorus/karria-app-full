import { describe, expect, it } from "@jest/globals";

import type { Cv } from "@/features/cv/types/cv.types";

import {
  cheminDeCible,
  cibleDeLettre,
  cibleDuChemin,
  differences,
  libelleDeCible,
  textesDuCv,
} from "./chemins";

const cv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: "Vendeuse" },
  contact: {
    email: "awa@ex.fr",
    telephone: null,
    ville: "Montreuil",
    liens: [{ libelle: "LinkedIn", url: "https://l.in/awa" }],
  },
  presentation: "Conseillère depuis trois ans.",
  photo: null,
  experiences: [
    {
      poste: "Vendeuse",
      entreprise: "Zara",
      lieu: "Paris",
      debut: "2022-09",
      fin: null,
      enCours: true,
      missions: ["Accueillir", "Encaisser"],
    },
  ],
  formations: [
    {
      diplome: "BTS MCO",
      ecole: "Lycée Jaurès",
      lieu: null,
      debut: "2019-09",
      fin: "2021-06",
      enCours: false,
    },
  ],
  competences: [{ nom: "Vente", niveau: "Avancé" }],
  langues: [{ langue: "Anglais", niveau: "B2" }],
  interets: [{ nom: "Danse", categorie: null }],
  vide: false,
  misAJour: "",
};

describe("les textes par chemin", () => {
  it("couvre les chemins du contrat, virtuels compris", () => {
    const m = textesDuCv(cv);
    expect(m.get("identity.full_name")).toBe("Awa Diallo");
    expect(m.get("identity.headline")).toBe("Vendeuse");
    expect(m.get("contact.links.0.url")).toBe("https://l.in/awa");
    expect(m.get("experiences.0")).toBe("Vendeuse - Zara");
    expect(m.get("experiences.0.dates")).toBe("sept. 2022 – aujourd'hui");
    expect(m.get("experiences.0.missions.1")).toBe("Encaisser");
    expect(m.get("educations.0.degree")).toBe("BTS MCO");
    expect(m.get("skills.0")).toBe("Vente");
    expect(m.get("languages.0")).toBe("Anglais");
    expect(m.get("interests.0")).toBe("Danse");
    expect(m.has("contact.phone")).toBe(false);
  });

  it("ne rend que ce qui a changé, et efface ce qui disparaît", () => {
    const apres: Cv = {
      ...cv,
      identite: { ...cv.identite!, titre: "Conseillère de vente" },
      experiences: [{ ...cv.experiences[0], missions: ["Accueillir"] }],
    };
    expect(differences(cv, apres)).toEqual([
      { chemin: "identity.headline", texte: "Conseillère de vente" },
      { chemin: "experiences.0.missions.1", texte: "" },
    ]);
  });
});

describe("les cibles", () => {
  it("désigne la section, et l'index dans une liste", () => {
    expect(cibleDuChemin("identity.full_name")).toEqual({ section: "identity" });
    expect(cibleDuChemin("experiences.2.missions.1")).toEqual({
      section: "experiences",
      index: 2,
    });
    expect(cibleDuChemin("languages.0")).toEqual({ section: "skills" });
    expect(cibleDuChemin("projects.0.title")).toBeNull();
    expect(cibleDuChemin("experiences.x")).toBeNull();
  });

  it("nomme ce qu'on modifie, et sait y revenir", () => {
    expect(libelleDeCible({ section: "experiences", index: 0 }, cv)).toBe(
      "Expérience chez Zara",
    );
    expect(libelleDeCible({ section: "educations", index: 0 }, cv)).toBe("BTS MCO");
    expect(cheminDeCible({ section: "experiences", index: 1 })).toBe(
      "experiences.1.position",
    );
  });

  it("lit les chemins de la lettre", () => {
    expect(cibleDeLettre("paragraphs.2.text")).toEqual({
      partie: "paragraphe",
      index: 2,
    });
    expect(cibleDeLettre("subject")).toEqual({ partie: "objet" });
    expect(cibleDeLettre("sender.full_name")).toEqual({ partie: "hors-lettre" });
    expect(cibleDeLettre("inconnu")).toBeNull();
  });
});
