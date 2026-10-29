/**
 * Les montants affichés : des centimes du serveur à l'écriture française.
 */

import { describe, expect, it } from "@jest/globals";

import { centimesDepuisTexte, euros } from "./monnaie";

describe("euros", () => {
  it("écrit les centimes à la française", () => {
    expect(euros(499)).toBe("4,99 €");
    expect(euros(1299)).toBe("12,99 €");
    expect(euros(5)).toBe("0,05 €");
  });

  it("omet les centimes quand il n'y en a pas", () => {
    expect(euros(1200)).toBe("12 €");
    expect(euros(0)).toBe("0 €");
  });

  it("garde le signe", () => {
    expect(euros(-299)).toBe("-2,99 €");
  });
});

describe("centimesDepuisTexte", () => {
  it("lit le prix écrit par le serveur", () => {
    expect(centimesDepuisTexte("4.99")).toBe(499);
    expect(centimesDepuisTexte("4,99")).toBe(499);
    expect(centimesDepuisTexte("12")).toBe(1200);
  });

  it("refuse ce qui n'est pas un nombre", () => {
    expect(centimesDepuisTexte("gratuit")).toBeNull();
  });
});
