import { describe, expect, it } from "@jest/globals";

import {
  annuler,
  historiqueDe,
  peutAnnuler,
  peutRetablir,
  pousser,
  PROFONDEUR_MAX,
  retablir,
} from "./historique";

describe("annuler / rétablir", () => {
  it("revient en arrière, puis en avant, et un nouveau geste efface le futur", () => {
    let h = historiqueDe("a");
    h = pousser(h, "b");
    h = pousser(h, "c");
    expect(peutAnnuler(h)).toBe(true);
    h = annuler(h);
    expect(h.present).toBe("b");
    expect(peutRetablir(h)).toBe(true);
    h = retablir(h);
    expect(h.present).toBe("c");
    h = annuler(h);
    h = pousser(h, "d");
    expect(h.present).toBe("d");
    expect(peutRetablir(h)).toBe(false);
  });

  it("ne bouge pas aux bords", () => {
    const h = historiqueDe("a");
    expect(annuler(h)).toBe(h);
    expect(retablir(h)).toBe(h);
  });

  it("est bornée", () => {
    let h = historiqueDe(0);
    for (let i = 1; i <= PROFONDEUR_MAX + 10; i += 1) h = pousser(h, i);
    expect(h.passe).toHaveLength(PROFONDEUR_MAX);
    expect(h.passe[0]).toBe(10);
  });
});
