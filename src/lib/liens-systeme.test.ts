import { describe, expect, it } from "@jest/globals";

import { cheminCanonique, cheminSystemeRedirige } from "./liens-systeme";

describe("Les liens remis par le système", () => {
  it("ouvrent une offre partagée, par le domaine, le www ou le schéma", () => {
    expect(cheminSystemeRedirige("https://karria.fr/offre/150279")).toBe("/offre/150279");
    expect(cheminSystemeRedirige("https://www.karria.fr/offre/150279?utm_source=x")).toBe(
      "/offre/150279",
    );
    expect(cheminSystemeRedirige("karria://offre/150279")).toBe("/offre/150279");
    expect(cheminSystemeRedirige("/offre/150279")).toBe("/offre/150279");
  });

  it("ouvrent les écrans prévus pour l'extérieur, et gardent la requête du retour de paiement", () => {
    expect(cheminSystemeRedirige("karria:///cv/mes-cv")).toBe("/cv/mes-cv");
    expect(cheminSystemeRedirige("karria:///dossiers")).toBe("/dossiers");
    expect(cheminSystemeRedirige("karria://modele/abc-1")).toBe("/modele/abc-1");
    expect(cheminSystemeRedirige("karria:///atelier/libre/finaliser")).toBe(
      "/atelier/libre/finaliser",
    );
    expect(cheminSystemeRedirige("karria://paiement/retour?session_id=cs_1")).toBe(
      "/paiement/retour?session_id=cs_1",
    );
  });

  it("renvoient au fil tout ce qui n'est pas dans la liste — dont le lecteur de documents", () => {
    for (const lien of [
      "https://karria.fr/lecture-document?id=x",
      "karria://lecture-document",
      "karria:///lecture-document/",
      "https://karria.fr/app?utm_source=document",
      "https://karria.fr/",
      "https://karria.fr/cv/modifier/contact",
      "https://karria.fr/compte/supprimer",
      "https://karria.fr/atelier/abc",
      "https://karria.fr/offre/150279/../../lecture-document",
      "https://karria.fr/%6Cecture-document",
      "https://karria.fr/offres%2F..%2Flecture-document",
      "https://karria.fr/%252Flecture-document",
      "https://karria.fr/(app)/lecture-document",
      "https://karria.fr//lecture-document",
      "https://karria.fr/offre/150279/x",
      "https://karria.fr/offre/%2e%2e",
      "https://evil.example/offre/150279",
      "javascript:alert(1)",
      "pas un lien",
    ]) {
      expect(cheminSystemeRedirige(lien)).toBe("/offres");
    }
  });

  it("ne peuvent au mieux qu'ouvrir une offre inexistante quand les points remontent", () => {
    expect(
      cheminSystemeRedirige("https://karria.fr/offre/150279/../lecture-document"),
    ).toBe("/offre/lecture-document");
  });

  it("normalisent avant de décider : décodage, points, groupes, barres doublées", () => {
    expect(cheminCanonique("https://karria.fr/(app)//offre/./150279/")).toEqual({
      chemin: "/offre/150279",
      requete: "",
    });
    expect(cheminCanonique("https://karria.fr/offre/%31%35")).toEqual({
      chemin: "/offre/15",
      requete: "",
    });
    expect(cheminCanonique("https://evil.example/offre/1")).toBeNull();
    expect(cheminCanonique("https://karria.fr/%zz")).toBeNull();
  });
});
