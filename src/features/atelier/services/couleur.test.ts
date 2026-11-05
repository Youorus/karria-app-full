import { describe, expect, it } from "@jest/globals";

import {
  avecClarte,
  CLARTE_MAX,
  CLARTE_MIN,
  couleurAEnvoyer,
  erreurDeCode,
  hexVersHsl,
  hslVersHex,
  memeTeinte,
  nomDeTeinte,
  normaliserCode,
  nuance,
  PALETTE,
  pisteDeNuance,
  positionDeNuance,
  surCouleur,
} from "./couleur";

describe("le code couleur", () => {
  it("accepte #rrggbb, rrggbb et #rgb, et rend #RRGGBB", () => {
    expect(normaliserCode("#1a2b3c")).toBe("#1A2B3C");
    expect(normaliserCode("1a2b3c")).toBe("#1A2B3C");
    expect(normaliserCode(" #abc ")).toBe("#AABBCC");
  });

  it("refuse ce qui n'est pas un code", () => {
    for (const t of ["", "#", "#12345", "bleu", "#GGGGGG", "#1234567"]) {
      expect(normaliserCode(t)).toBeNull();
    }
  });

  it("ne se plaint pas tant que le code peut encore devenir juste", () => {
    expect(erreurDeCode("")).toBeNull();
    expect(erreurDeCode("#1A5")).toBeNull();
    expect(erreurDeCode("#1A52")).toBeNull();
    expect(erreurDeCode("1A5276")).toBeNull();
    expect(erreurDeCode("#1A5276")).toBeNull();
    expect(erreurDeCode("#1A52766")).toMatch(/Six caractères/);
    expect(erreurDeCode("bleu")).toMatch(/chiffres/);
  });
});

describe("hex et HSL", () => {
  it("fait l'aller-retour sur la palette", () => {
    for (const c of PALETTE) {
      expect(hslVersHex(hexVersHsl(c.hex))).toBe(c.hex);
    }
    expect(hexVersHsl("#FFFFFF")).toEqual({ teinte: 0, saturation: 0, clarte: 1 });
    expect(hslVersHex({ teinte: 0, saturation: 0, clarte: 0 })).toBe("#000000");
  });

  it("garde la teinte en changeant la clarté, dans les bornes", () => {
    const clair = avecClarte("#1F3A5F", 0.9);
    const sombre = avecClarte("#1F3A5F", 0.0);
    expect(
      Math.abs(hexVersHsl(clair).teinte - hexVersHsl("#1F3A5F").teinte),
    ).toBeLessThan(2);
    expect(hexVersHsl(clair).clarte).toBeCloseTo(CLARTE_MAX, 2);
    expect(hexVersHsl(sombre).clarte).toBeCloseTo(CLARTE_MIN, 2);
  });
});

describe("la nuance", () => {
  it("va du clair au sombre, et retrouve la position d'une couleur", () => {
    const piste = pisteDeNuance("#7B1E2B", 5);
    expect(piste).toHaveLength(5);
    const clartes = piste.map((h) => hexVersHsl(h).clarte);
    for (let i = 1; i < clartes.length; i += 1)
      expect(clartes[i]).toBeLessThan(clartes[i - 1]);
    expect(nuance("#7B1E2B", 0)).toBe(piste[0]);
    expect(nuance("#7B1E2B", 1)).toBe(piste[4]);
    const position = positionDeNuance("#7B1E2B");
    expect(position).toBeGreaterThan(0);
    expect(position).toBeLessThan(1);
    expect(hexVersHsl(nuance("#7B1E2B", position)).clarte).toBeCloseTo(
      hexVersHsl("#7B1E2B").clarte,
      2,
    );
  });

  it("sur un gris, la piste reste grise", () => {
    for (const h of pisteDeNuance("#3F3F3F", 4)) {
      expect(hexVersHsl(h).saturation).toBe(0);
    }
  });

  it("reconnaît une nuance de la même teinte", () => {
    expect(memeTeinte("#7B1E2B", nuance("#7B1E2B", 0.2))).toBe(true);
    expect(memeTeinte("#7B1E2B", "#1F3A5F")).toBe(false);
    expect(memeTeinte("#333333", "#AAAAAA")).toBe(true);
    expect(nomDeTeinte(nuance("#2F5D3A", 0.8))).toBe("Forêt");
    expect(nomDeTeinte("#FF00AA")).toBeNull();
  });
});

describe("ce qui se pose sur une pastille", () => {
  it("met du blanc sur une couleur sombre et du noir sur une claire", () => {
    expect(surCouleur("#1F3A5F")).toBe("#FFFFFF");
    expect(surCouleur("#F5F3F0")).toBe("#0F172A");
    for (const c of PALETTE) expect(surCouleur(c.hex)).toBe("#FFFFFF");
  });
});

describe("ce qu'on envoie au serveur", () => {
  it("vaut null pour la couleur d'origine, le code normalisé sinon", () => {
    expect(couleurAEnvoyer(null, "#1A5276")).toBeNull();
    expect(couleurAEnvoyer("#1a5276", "#1A5276")).toBeNull();
    expect(couleurAEnvoyer("7b1e2b", "#1A5276")).toBe("#7B1E2B");
    expect(couleurAEnvoyer("#7B1E2B", null)).toBe("#7B1E2B");
    expect(couleurAEnvoyer("bleu", null)).toBeNull();
  });
});
