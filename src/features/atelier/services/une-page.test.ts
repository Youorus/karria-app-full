/**
 * Tenir sur une page : les propositions, du moins coûteux au plus coûteux,
 * et les phrases de l'alerte.
 */

import { describe, expect, it } from "@jest/globals";

import type { Cv } from "@/features/cv/types/cv.types";

import { phraseConseil, phraseDepassement, propositionsUnePage } from "./une-page";

function cv(partiel: Partial<Record<keyof Cv, unknown>>): Cv {
  return {
    identite: null,
    contact: null,
    presentation: null,
    experiences: [],
    formations: [],
    competences: [],
    langues: [],
    interets: [],
    ...partiel,
  } as Cv;
}

describe("propositionsUnePage", () => {
  it("ne propose rien pour un CV court", () => {
    expect(propositionsUnePage(cv({}))).toEqual([]);
  });

  it("propose les centres d'intérêt en trop d'abord, puis les expériences les plus anciennes", () => {
    const propositions = propositionsUnePage(
      cv({
        interets: [
          { nom: "Football", categorie: null, description: null },
          { nom: "Photo", categorie: null, description: null },
          { nom: "Mentorat", categorie: null, description: null },
          { nom: "Voyages", categorie: null, description: null },
        ],
        experiences: [
          {
            poste: "Lead",
            entreprise: "A",
            lieu: null,
            debut: "2024-01",
            fin: null,
            enCours: true,
            missions: [],
          },
          {
            poste: "Dev",
            entreprise: "B",
            lieu: null,
            debut: "2022-03",
            fin: "2023-12",
            enCours: false,
            missions: [],
          },
          {
            poste: "Alternant",
            entreprise: "C",
            lieu: null,
            debut: "2020-09",
            fin: "2022-02",
            enCours: false,
            missions: [],
          },
          {
            poste: "Stage",
            entreprise: "D",
            lieu: null,
            debut: "2020-03",
            fin: "2020-08",
            enCours: false,
            missions: [],
          },
        ],
      }),
    );
    expect(propositions.map((p) => `${p.rubrique}:${p.libelle}`)).toEqual([
      "interets:Voyages",
      "experiences:Stage · D",
    ]);
    // L'index est celui de la liste courante : c'est ce que « Masquer » attend.
    expect(propositions[1]?.index).toBe(3);
    expect(propositions[1]?.raison).toBe("Expérience la plus ancienne");
  });

  it("propose les compétences au-delà de huit, depuis la fin", () => {
    const propositions = propositionsUnePage(
      cv({
        competences: Array.from({ length: 10 }, (_, i) => ({
          nom: `c${i}`,
          niveau: "Avancé",
          categorie: null,
        })),
      }),
    );
    expect(propositions.map((p) => p.libelle)).toEqual(["c9", "c8"]);
  });
});

describe("les phrases", () => {
  it("dit de combien de pages ça dépasse", () => {
    expect(phraseDepassement(2)).toMatch(/d'une page/);
    expect(phraseDepassement(3)).toMatch(/de 2 pages/);
  });

  it("conseille selon qu'il y a des propositions ou non", () => {
    expect(phraseConseil(0)).toMatch(/Je modifie/);
    expect(phraseConseil(2)).toMatch(/la page derrière/);
  });
});
