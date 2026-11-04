/**
 * Les règles de la porte de mise à jour (`version.ts`) : lecture du numéro
 * de build, délais, et le repli « jamais bloquer sans magasin ».
 */

import { describe, expect, it } from "@jest/globals";

import {
  bandeMontrable,
  fautIlReverifier,
  numeroDeBuild,
  rendreOuvrable,
  REVERIFICATION_MS,
  UN_JOUR_MS,
  type Version,
} from "./version";

describe("Le numéro de build", () => {
  it("lit un entier tel qu'EAS le pose", () => {
    expect(numeroDeBuild("12")).toBe(12);
    expect(numeroDeBuild("1")).toBe(1);
  });

  it("refuse tout ce qui n'est pas un entier : on ne comparera rien", () => {
    expect(numeroDeBuild(null)).toBeNull();
    expect(numeroDeBuild(undefined)).toBeNull();
    expect(numeroDeBuild("")).toBeNull();
    expect(numeroDeBuild("1.0.3")).toBeNull();
    expect(numeroDeBuild("abc")).toBeNull();
  });
});

describe("Les délais", () => {
  it("redemande à la première ouverture, puis seulement après six heures", () => {
    expect(fautIlReverifier(null, 1_000)).toBe(true);
    expect(fautIlReverifier(1_000, 1_000 + REVERIFICATION_MS - 1)).toBe(false);
    expect(fautIlReverifier(1_000, 1_000 + REVERIFICATION_MS)).toBe(true);
  });

  it("ne montre la bande qu'une fois par jour", () => {
    expect(bandeMontrable(null, 5)).toBe(true);
    expect(bandeMontrable(5, 5 + UN_JOUR_MS - 1)).toBe(false);
    expect(bandeMontrable(5, 5 + UN_JOUR_MS)).toBe(true);
  });
});

describe("Une mise à jour exigée sans magasin", () => {
  const base: Version = {
    etat: "requise",
    derniereBuild: 9,
    buildMinimale: 8,
    urlStore: null,
  };

  it("redevient « disponible » : on ne bloque pas derrière un bouton vide", () => {
    expect(rendreOuvrable(base).etat).toBe("disponible");
  });

  it("reste « requise » dès qu'il y a où aller", () => {
    expect(rendreOuvrable({ ...base, urlStore: "https://apps.apple.com/x" }).etat).toBe(
      "requise",
    );
  });

  it("ne touche pas aux autres états", () => {
    expect(rendreOuvrable({ ...base, etat: "ok" }).etat).toBe("ok");
  });
});
