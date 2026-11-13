/**
 * Les règles de la porte de mise à jour (`version.ts`) : lecture du numéro
 * de build, délais, et le repli « jamais bloquer sans magasin ».
 */

import { describe, expect, it } from "@jest/globals";

import {
  bandeMontrable,
  fautIlReverifier,
  numeroDeBuild,
  estBloquante,
  libelleDeVersion,
  rendreOuvrable,
  REVERIFICATION_MS,
  urlDeMagasin,
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

describe("Toute version en retard bloque (Marc, 2026-11-13)", () => {
  const base: Version = {
    etat: "requise",
    derniereBuild: 9,
    buildMinimale: 8,
    derniereVersion: "1.2.0",
    urlStore: null,
  };

  it("bloque pour « requise » comme pour « disponible », même sans magasin", () => {
    expect(estBloquante(base)).toBe(true);
    expect(estBloquante({ ...base, etat: "disponible" })).toBe(true);
    expect(estBloquante({ ...base, etat: "ok" })).toBe(false);
    expect(estBloquante(null)).toBe(false);
  });

  it("ne dégrade plus « requise » en « disponible »", () => {
    expect(rendreOuvrable(base).etat).toBe("requise");
  });

  it("nomme la version à installer, ou le build à défaut", () => {
    expect(libelleDeVersion(base)).toBe("Version 1.2.0");
    expect(libelleDeVersion({ ...base, derniereVersion: null })).toBe("Build 9");
    expect(
      libelleDeVersion({ ...base, derniereVersion: null, derniereBuild: 0 }),
    ).toBeNull();
  });
});

describe("L'adresse du magasin", () => {
  it("accepte l'App Store pour iOS et le Play Store pour Android, en https", () => {
    expect(urlDeMagasin("https://apps.apple.com/fr/app/karria/id123", "ios")).toBe(
      "https://apps.apple.com/fr/app/karria/id123",
    );
    expect(
      urlDeMagasin(
        "https://play.google.com/store/apps/details?id=com.karria.app",
        "android",
      ),
    ).toBe("https://play.google.com/store/apps/details?id=com.karria.app");
  });

  it("refuse tout le reste : autre hôte, sous-domaine piégé, http, absurdité", () => {
    expect(
      urlDeMagasin("https://play.google.com/store/apps/details?id=x", "ios"),
    ).toBeNull();
    expect(
      urlDeMagasin("https://apps.apple.com/fr/app/karria/id123", "android"),
    ).toBeNull();
    expect(urlDeMagasin("https://apps.apple.com.evil.fr/x", "ios")).toBeNull();
    expect(urlDeMagasin("https://evil.fr/apps.apple.com", "ios")).toBeNull();
    expect(urlDeMagasin("http://apps.apple.com/fr/app/karria/id123", "ios")).toBeNull();
    expect(urlDeMagasin("javascript:alert(1)", "ios")).toBeNull();
    expect(urlDeMagasin("pas une url", "ios")).toBeNull();
    expect(urlDeMagasin(null, "ios")).toBeNull();
    expect(urlDeMagasin("", "android")).toBeNull();
  });
});
