/**
 * L'import : ses messages d'échec, et ses notes de lecture.
 *
 * Les notes sont la promesse faite à Marc : chaque ligne vient du compte
 * rendu réel. Les tests construisent un résultat et vérifient que rien
 * n'est dit qui n'y soit — et que ce qui manque est dit.
 */

import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import type { Cv, ResultatImport } from "../types/cv.types";
import {
  libelleManquant,
  lignesDeLecture,
  manqueLisible,
  messageDImport,
} from "./import";

describe("Les messages d'échec de l'import", () => {
  it("distinguent chaque raison du contrat", () => {
    const raisons = [
      "document_type_unsupported",
      "document_too_large",
      "document_too_many_pages",
      "document_pages_must_be_images",
      "document_empty",
      "document_unreadable",
      "document_not_a_cv",
    ];
    const messages = raisons.map((r) =>
      messageDImport(new ErreurApi("x", 422, r, "file")),
    );
    expect(new Set(messages).size).toBe(raisons.length);
    expect(messages[3]).toMatch(/une par page/);
    expect(messages[6]).toMatch(/bien ton CV/);
  });

  it("invitent à réessayer plus tard quand le modèle ne répond pas", () => {
    expect(messageDImport(new ErreurApi("x", 503))).toMatch(/pour le moment/);
  });

  it("disent que rien n'est parti quand le réseau manque", () => {
    const reseau = new ErreurApi("x", 0);
    expect(reseau.estReseau).toBe(true);
    expect(messageDImport(reseau)).toMatch(/n'est pas parti/);
  });

  it("gardent un repli lisible pour une cause inconnue", () => {
    expect(messageDImport(new Error("?"))).toMatch(/n'a pas pu être importé/);
  });
});

const cv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: "Conseillère de vente" },
  contact: { email: "awa@example.com", telephone: null, ville: "Montreuil", liens: [] },
  presentation: "Je suis souriante.",
  photo: null,
  experiences: [
    {
      poste: "Vendeuse",
      entreprise: "Zara",
      lieu: null,
      debut: "2022-09",
      fin: null,
      enCours: true,
      missions: [],
    },
    {
      poste: "Caissière",
      entreprise: "Carrefour",
      lieu: null,
      debut: "2021-06",
      fin: "2022-08",
      enCours: false,
      missions: [],
    },
  ],
  formations: [
    {
      diplome: "BTS MCO",
      ecole: "Lycée",
      lieu: null,
      debut: "2019-09",
      fin: "2021-06",
      enCours: false,
    },
  ],
  competences: [{ nom: "Vente", niveau: "Avancé" }],
  langues: [{ langue: "Anglais", niveau: "B2" }],
  interets: [],
  vide: false,
  misAJour: "2026-11-04T10:00:00Z",
};

const resultat: ResultatImport = {
  cv,
  source: { type: "application/pdf", fichiers: 1, pages: 1 },
  retenus: { experiences: 2, educations: 1, skills: 1, languages: 1 },
  ecartes: { experiences: 1 },
  manquants: ["contact.phone"],
};

describe("Les notes de lecture", () => {
  it("ne disent que ce qui a été lu, dans l'ordre : nom, parcours, formations, compétences", () => {
    const lignes = lignesDeLecture(resultat);
    expect(lignes).toEqual([
      "Awa Diallo — Conseillère de vente.",
      "2 expériences trouvées, chez Zara et Carrefour.",
      "1 formation.",
      "1 compétence et 1 langue.",
      "Ton « à propos » est repris.",
      "1 élément illisible écarté.",
      "Pas de téléphone trouvé.",
    ]);
  });

  it("disent aussi ce qui n'a pas été trouvé", () => {
    const vide: ResultatImport = {
      cv: {
        ...cv,
        identite: null,
        contact: null,
        presentation: null,
        experiences: [],
        formations: [],
        competences: [],
        langues: [],
      },
      source: { type: "image/jpeg", fichiers: 2, pages: 2 },
      retenus: {},
      ecartes: {},
      manquants: ["contact.phone", "contact.email", "contact.city", "identity"],
    };
    expect(lignesDeLecture(vide)).toEqual([
      "Je n'ai pas trouvé ton nom.",
      "Aucune expérience trouvée.",
      "Aucune formation trouvée.",
      "Aucune compétence trouvée.",
      "Pas de téléphone, e-mail ni de ville trouvés.",
    ]);
  });

  it("abrègent au-delà de trois entreprises", () => {
    const quatre = {
      ...resultat,
      cv: {
        ...cv,
        experiences: ["A", "B", "C", "D"].map((e) => ({
          ...cv.experiences[0],
          entreprise: e,
        })),
      },
    };
    expect(lignesDeLecture(quatre)[1]).toBe("4 expériences trouvées, chez A, B et C…");
  });
});

describe("Ce qui manque", () => {
  it("se dit en une phrase", () => {
    expect(manqueLisible([])).toBe("");
    expect(manqueLisible(["contact.phone"])).toBe("Pas de téléphone trouvé");
    expect(manqueLisible(["contact.phone", "contact.email"])).toBe(
      "Pas de téléphone ni de e-mail trouvés",
    );
  });

  it("a une pastille courte pour chaque champ", () => {
    expect(libelleManquant("contact.phone")).toBe("Téléphone manquant");
    expect(libelleManquant("experiences.dates")).toBe("Dates manquantes");
    expect(libelleManquant("summary")).toBe("À propos à écrire");
  });
});
