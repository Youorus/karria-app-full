import { describe, expect, it } from "@jest/globals";

import { poserLesAnnonces } from "./pose-annonces";

const REGLE = { intervalle: 7, plafond: 8 };
const AUCUNE: ReadonlyMap<number, string> = new Map();

describe("La pose des annonces dans une liste", () => {
  it("une annonce entre quand sa place est sous l'écran", () => {
    // Emplacement 0 : après la 7ᵉ offre, indice 7. On voit jusqu'à l'indice 4.
    const posees = poserLesAnnonces(AUCUNE, new Map([[0, "a"]]), REGLE, 4);
    expect([...posees]).toEqual([[0, "a"]]);
  });

  it("une annonce dont la place est à l'écran ou dépassée attend", () => {
    const pretes = new Map([[0, "a"]]);
    // À l'écran (indice 7 visible), à une carte près (6), ou dépassée (20).
    for (const dernier of [7, 6, 20]) {
      expect(poserLesAnnonces(AUCUNE, pretes, REGLE, dernier)).toBe(AUCUNE);
    }
    // Remontée en haut de liste : elle entre.
    expect(poserLesAnnonces(AUCUNE, pretes, REGLE, 3).get(0)).toBe("a");
  });

  it("la place d'une annonce tient compte de celles déjà posées au-dessus", () => {
    // Emplacement 1 : indice 14 seul, 15 avec l'annonce 0 posée avant lui.
    const pretes = new Map([
      [0, "a"],
      [1, "b"],
    ]);
    const avecLaPremiere = new Map([[0, "a"]]);
    expect(poserLesAnnonces(avecLaPremiere, pretes, REGLE, 14)).toBe(avecLaPremiere);
    expect(poserLesAnnonces(avecLaPremiere, pretes, REGLE, 13).get(1)).toBe("b");
  });

  it("rien ne change : la même table revient, la liste ne se redessine pas", () => {
    const posees = new Map([[0, "a"]]);
    expect(poserLesAnnonces(posees, new Map([[0, "a"]]), REGLE, 30)).toBe(posees);
  });

  it("une annonce posée garde sa place, même visible ; remplacée, elle la garde aussi", () => {
    const posees = new Map([[0, "a"]]);
    const suite = poserLesAnnonces(posees, new Map([[0, "neuve"]]), REGLE, 30);
    expect([...suite]).toEqual([[0, "neuve"]]);
  });

  it("une annonce retirée de la réserve sort de la liste", () => {
    const posees = new Map([[0, "a"]]);
    expect(poserLesAnnonces(posees, AUCUNE, REGLE, 30).size).toBe(0);
  });
});
