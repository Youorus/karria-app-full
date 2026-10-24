/**
 * Le relais de l'ouverture d'un modèle : ce que ces tests protègent, c'est
 * qu'un vieux toucher ou un autre modèle ne fasse jamais zoomer le détail
 * depuis un mauvais endroit.
 */

import { describe, expect, it } from "@jest/globals";

import {
  prendreOrigine,
  retenirOrigine,
  transformationDepuis,
} from "./origine-ouverture";

const CADRE = { x: 16, y: 200, largeur: 170, hauteur: 236 };

describe("le relais d'origine", () => {
  it("rend le cadre du modèle touché, une seule fois", () => {
    retenirOrigine("a", CADRE, 0);
    expect(prendreOrigine("a", 300)).toEqual(CADRE);
    expect(prendreOrigine("a", 310)).toBeNull();
  });

  it("ignore un autre modèle et un toucher trop ancien", () => {
    retenirOrigine("a", CADRE, 0);
    expect(prendreOrigine("b", 10)).toBeNull();
    retenirOrigine("a", CADRE, 0);
    expect(prendreOrigine("a", 5_000)).toBeNull();
  });
});

describe("la transformation de départ", () => {
  it("pose le centre de la cible sur celui de l'origine, à l'échelle", () => {
    const t = transformationDepuis(CADRE, { x: 0, y: 100, largeur: 400, hauteur: 528 });
    expect(t.echelle).toBeCloseTo(0.425);
    expect(t.dx).toBe(16 + 85 - 200);
    expect(t.dy).toBe(200 + 118 - (100 + 264));
  });
});
