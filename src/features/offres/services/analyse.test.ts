/**
 * Le découpage de l'analyse, tel que la V1 l'affiche.
 */

import { describe, expect, it } from "@jest/globals";

import { decouperAnalyse } from "./analyse";

describe("Le découpage de l'analyse", () => {
  it("ouvre une section à chaque titre en gras et reconnaît les trois puces", () => {
    const blocs = decouperAnalyse(
      "Intro libre\n**Missions**\n• Coder\n- Tester\n* Livrer\n---\n**Profil**\nRigoureux",
    );
    expect(blocs).toEqual([
      { titre: null, elements: [{ type: "texte", contenu: "Intro libre" }] },
      {
        titre: "Missions",
        elements: [
          { type: "puce", contenu: "Coder" },
          { type: "puce", contenu: "Tester" },
          { type: "puce", contenu: "Livrer" },
        ],
      },
      { titre: "Profil", elements: [{ type: "texte", contenu: "Rigoureux" }] },
    ]);
  });

  it("rend une liste vide pour un texte vide", () => {
    expect(decouperAnalyse("  \n ")).toEqual([]);
  });
});
