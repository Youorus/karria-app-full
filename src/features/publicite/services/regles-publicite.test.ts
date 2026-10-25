/**
 * Les règles de la publicité.
 *
 * Ce que ces tests protègent : jamais d'annonce en tête, une toutes les N
 * offres, un plafond par liste, aucun trou quand une annonce manque, et
 * jamais d'annonce de test en production — ni de bloc réel en
 * développement.
 */

import { describe, expect, it } from "@jest/globals";

import {
  blocNatif,
  emplacementsPour,
  entrelacer,
  intervalleDepuis,
} from "./regles-publicite";

const REGLE = { intervalle: 3, plafond: 2 };

describe("L'intervalle", () => {
  it("se règle, borné", () => {
    expect(intervalleDepuis("6")).toBe(6);
    expect(intervalleDepuis("1")).toBe(4);
    expect(intervalleDepuis("99")).toBe(20);
  });

  it("vaut 7 sans réglage lisible", () => {
    expect(intervalleDepuis(undefined)).toBe(7);
    expect(intervalleDepuis("six")).toBe(7);
    expect(intervalleDepuis("6.5")).toBe(7);
  });
});

describe("Les emplacements", () => {
  it("suivent le nombre d'offres, plafonnés", () => {
    expect(emplacementsPour(2, REGLE)).toEqual([]);
    expect(emplacementsPour(3, REGLE)).toEqual([0]);
    expect(emplacementsPour(7, REGLE)).toEqual([0, 1]);
    expect(emplacementsPour(30, REGLE)).toEqual([0, 1]);
    expect(emplacementsPour(-1, REGLE)).toEqual([]);
  });
});

describe("L'entrelacement", () => {
  const offres = ["o1", "o2", "o3", "o4", "o5", "o6", "o7", "o8", "o9"];

  it("pose chaque annonce après son groupe, jamais en tête, plafond compris", () => {
    const annonces = new Map([
      [0, "A0"],
      [1, "A1"],
      [2, "A2"],
    ]);
    expect(entrelacer(offres, annonces, REGLE)).toEqual([
      "o1",
      "o2",
      "o3",
      "A0",
      "o4",
      "o5",
      "o6",
      "A1",
      "o7",
      "o8",
      "o9",
    ]);
  });

  it("ne laisse aucun trou quand une annonce manque", () => {
    expect(entrelacer(offres, new Map([[1, "A1"]]), REGLE)).toEqual([
      "o1",
      "o2",
      "o3",
      "o4",
      "o5",
      "o6",
      "A1",
      "o7",
      "o8",
      "o9",
    ]);
    expect(entrelacer(offres, new Map(), REGLE)).toEqual(offres);
  });
});

describe("Le bloc d'annonces", () => {
  const prod = {
    developpement: false,
    modeTest: undefined,
    plateforme: "ios" as const,
    idIos: "ca-app-pub-1/2",
    idAndroid: "ca-app-pub-1/3",
  };

  it("est celui de test en développement ou en mode test", () => {
    expect(blocNatif({ ...prod, developpement: true })).toEqual({ mode: "test" });
    expect(blocNatif({ ...prod, modeTest: "true" })).toEqual({ mode: "test" });
  });

  it("est le bloc réel de la plateforme en production", () => {
    expect(blocNatif(prod)).toEqual({ mode: "reel", id: "ca-app-pub-1/2" });
    expect(blocNatif({ ...prod, plateforme: "android" })).toEqual({
      mode: "reel",
      id: "ca-app-pub-1/3",
    });
  });

  it("coupe la publicité plutôt que servir un bloc absent ou mal formé", () => {
    expect(blocNatif({ ...prod, idIos: undefined })).toEqual({ mode: "coupe" });
    expect(blocNatif({ ...prod, idIos: "ca-app-pub-1~2" })).toEqual({ mode: "coupe" });
  });
});
