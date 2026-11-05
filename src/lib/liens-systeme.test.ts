import { describe, expect, it } from "@jest/globals";

import { cheminSystemeRedirige } from "./liens-systeme";

describe("Les liens remis par le système", () => {
  it("laisse passer une offre partagée, par le domaine ou le schéma", () => {
    expect(cheminSystemeRedirige("https://karria.fr/offre/150279")).toBe(
      "https://karria.fr/offre/150279",
    );
    expect(cheminSystemeRedirige("karria://offre/150279")).toBe("karria://offre/150279");
    expect(cheminSystemeRedirige("/offre/150279")).toBe("/offre/150279");
  });

  it("n'ouvre jamais le lecteur de documents depuis l'extérieur", () => {
    expect(cheminSystemeRedirige("https://karria.fr/lecture-document?id=x")).toBe("/cv");
    expect(cheminSystemeRedirige("https://www.karria.fr/lecture-document")).toBe("/cv");
    expect(cheminSystemeRedirige("karria://lecture-document")).toBe("/cv");
    expect(cheminSystemeRedirige("karria:///lecture-document/")).toBe("/cv");
    expect(cheminSystemeRedirige("/lecture-document#x")).toBe("/cv");
  });
});
