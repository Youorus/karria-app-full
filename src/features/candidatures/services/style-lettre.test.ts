import { describe, expect, it } from "@jest/globals";

import { styleLettreServi, versStyleLettre, versStyleLettreBrut } from "./style-lettre";

describe("le style de lettre", () => {
  it("se traduit dans les deux sens, et ignore l'inconnu", () => {
    expect(versStyleLettre("template")).toBe("modele");
    expect(versStyleLettre("plain")).toBe("sobre");
    expect(versStyleLettre(null)).toBeNull();
    expect(versStyleLettre(undefined)).toBeNull();
    expect(versStyleLettre("fancy")).toBeNull();
    expect(versStyleLettreBrut("modele")).toBe("template");
    expect(versStyleLettreBrut("sobre")).toBe("plain");
    expect(versStyleLettreBrut(null)).toBeNull();
  });

  it("ne promet la lettre du modèle que si le modèle en a une", () => {
    expect(styleLettreServi(null, false)).toBe("sobre");
    expect(styleLettreServi("modele", false)).toBe("sobre");
    expect(styleLettreServi(null, true)).toBe("modele");
    expect(styleLettreServi("sobre", true)).toBe("sobre");
    expect(styleLettreServi("modele", true)).toBe("modele");
  });
});
