/**
 * Les règles de la galerie de modèles (V1).
 */

import { describe, expect, it } from "@jest/globals";

import type { Modele } from "../types/modeles.types";
import {
  compteCompact,
  filtrer,
  noteLisible,
  pucesDeLaGalerie,
  sousTitreGalerie,
  prixLisible,
} from "./presentation";

function modele(id: number, categorie: string, premium = false): Modele {
  return {
    id: String(id),
    libelle: `M${id}`,
    categorie,
    description: null,
    premium,
    prix: premium ? "4.99" : null,
    etiquettes: [],
    miniature: null,
    flou: null,
    version: 1,
    vues: 0,
    utilisations: 0,
    note: 0,
    nombreDAvis: 0,
    couleur: null,
    police: null,
    avecPhoto: false,
    apercus: [],
    avecLettre: false,
  };
}

describe("Les puces de la galerie", () => {
  it("propose Tous, Premium s'il y a un modèle payant, puis les catégories triées", () => {
    const puces = pucesDeLaGalerie([
      modele(1, "professional"),
      modele(2, "elegant", true),
      modele(3, "elegant"),
    ]);
    expect(puces.map((p) => p.libelle)).toEqual([
      "Tous",
      "Premium",
      "Elegant",
      "Professional",
    ]);
  });

  it("n'affiche pas Premium sans modèle payant", () => {
    expect(pucesDeLaGalerie([modele(1, "elegant")]).map((p) => p.libelle)).toEqual([
      "Tous",
      "Elegant",
    ]);
  });
});

describe("Le filtre", () => {
  const modeles = [modele(1, "elegant"), modele(2, "elegant", true), modele(3, "pro")];
  it("filtre par catégorie et par premium", () => {
    expect(filtrer(modeles, { type: "tous" })).toHaveLength(3);
    expect(filtrer(modeles, { type: "premium" }).map((m) => m.id)).toEqual(["2"]);
    expect(
      filtrer(modeles, { type: "categorie", valeur: "elegant" }).map((m) => m.id),
    ).toEqual(["1", "2"]);
  });
});

describe("Les compteurs et libellés", () => {
  it("abrège les grands nombres comme la V1", () => {
    expect(compteCompact(42)).toBe("42");
    expect(compteCompact(1_234)).toBe("1.2k");
    expect(compteCompact(12_500)).toBe("13k");
    expect(compteCompact(2_000_000)).toBe("2M");
  });

  it("rédige le sous-titre et la note", () => {
    expect(sousTitreGalerie(3)).toBe("3 modèles — les tiens sont cochés ✓");
    expect(sousTitreGalerie(1)).toBe("1 modèle — les tiens sont cochés ✓");
    expect(noteLisible(0, 0)).toBe("Pas encore noté");
    expect(noteLisible(4.56, 12)).toBe("4,6");
  });
});

describe("prixLisible", () => {
  it("écrit le prix du serveur à la française", () => {
    expect(prixLisible("4.99")).toBe("4,99 €");
    expect(prixLisible("12")).toBe("12 €");
    expect(prixLisible(null)).toBeNull();
    expect(prixLisible("gratuit")).toBeNull();
  });
});
