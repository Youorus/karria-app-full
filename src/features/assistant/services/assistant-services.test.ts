/**
 * Les règles pures de l'assistant : la salutation et la révélation.
 *
 * La révélation est éprouvée sur ses bords — texte vide, dernier mot,
 * texte sans espace —, là où une borne mal calculée boucle à l'infini ou
 * coupe le dernier mot.
 */

import { describe, expect, it } from "@jest/globals";

import { salutation } from "@/lib/salutation";
import { borneSuivante } from "@/lib/revelation";

describe("La salutation", () => {
  it("dit bonjour le jour et bonsoir le soir et la nuit", () => {
    expect(salutation(9)).toBe("Bonjour");
    expect(salutation(17)).toBe("Bonjour");
    expect(salutation(18)).toBe("Bonsoir");
    expect(salutation(2)).toBe("Bonsoir");
  });
});

describe("La révélation", () => {
  it("avance d'un mot à la fois", () => {
    const texte = "Je trouve ton job";
    expect(borneSuivante(texte, 0)).toBe(2);
    expect(borneSuivante(texte, 2)).toBe(9);
  });

  it("finit exactement sur la longueur du texte, sans couper le dernier mot", () => {
    const texte = "Je trouve ton job";
    expect(borneSuivante(texte, 13)).toBe(texte.length);
    expect(borneSuivante(texte, texte.length)).toBe(texte.length);
  });

  it("révèle d'un coup un texte sans espace", () => {
    expect(borneSuivante("Parfait", 0)).toBe(7);
  });
});
