/**
 * La porte : chaque raison a un titre et une phrase qui tutoient et disent le gain.
 */

import { describe, expect, it } from "@jest/globals";

import { GAINS, textesDeLaPorte, type RaisonConnexion } from "./porte";

const RAISONS: RaisonConnexion[] = [
  "karria",
  "cv",
  "garder",
  "ecarter",
  "criteres",
  "notifications",
  "achat",
  "modele",
  "profil",
];

describe("textesDeLaPorte", () => {
  it.each(RAISONS)("%s a un titre et une phrase", (raison) => {
    const textes = textesDeLaPorte(raison);
    expect(textes.titre.length).toBeGreaterThan(3);
    expect(textes.phrase.length).toBeGreaterThan(20);
    // Tutoiement : jamais de « vous » dans la bouche de Karria.
    expect(textes.phrase).not.toMatch(/\bvous\b/i);
  });

  it("liste ce qu'un compte apporte, quatre fois, avec une icône", () => {
    expect(GAINS).toHaveLength(4);
    expect(GAINS.map((g) => g.icone)).toEqual(["etincelles", "cv", "signet", "cloche"]);
  });
});
