import { describe, expect, it } from "@jest/globals";

import {
  formatDuLien,
  modeDAffichage,
  parametresDeLecture,
  sousTitreDeLecture,
  titreDeLecture,
} from "./lecteur";

describe("Le titre du lecteur", () => {
  it("nomme le CV par la personne, la lettre par l'entreprise", () => {
    expect(titreDeLecture("cv", "Awa  Diallo ")).toBe("CV · Awa Diallo");
    expect(titreDeLecture("lettre", "Maison Kayser")).toBe("Lettre · Maison Kayser");
  });

  it("reste neutre sans complément — jamais l'adresse du stockage", () => {
    expect(titreDeLecture("cv", null)).toBe("Mon CV");
    expect(titreDeLecture("cv", "  ")).toBe("Mon CV");
    expect(titreDeLecture("lettre", null)).toBe("Ma lettre");
  });

  it("dit le format et le modèle en sous-titre", () => {
    expect(sousTitreDeLecture("pdf", "Meridian")).toBe("PDF · Meridian");
    expect(sousTitreDeLecture("docx", null)).toBe("Word");
  });
});

describe("Le format et le mode d'affichage", () => {
  it("reconnaît un lien Word, même signé", () => {
    expect(formatDuLien("https://storage.karria.fr/x/cv.docx?X-Amz-Signature=abc")).toBe(
      "docx",
    );
    expect(formatDuLien("https://storage.karria.fr/x/cv.pdf")).toBe("pdf");
  });

  it("montre l'aperçu sur iOS, le lecteur du système sur Android, rien pour Word", () => {
    expect(modeDAffichage("ios", "pdf")).toBe("apercu");
    expect(modeDAffichage("android", "pdf")).toBe("lecteur-systeme");
    expect(modeDAffichage("ios", "docx")).toBe("sans-apercu");
    expect(modeDAffichage("android", "docx")).toBe("sans-apercu");
  });
});

describe("les paramètres du lecteur", () => {
  it("nomme un CV par la personne, et son fichier comme le serveur", () => {
    expect(
      parametresDeLecture({
        url: "https://storage.karria.fr/x/a.pdf?sig=1",
        genre: "cv",
        complement: "Awa Diallo",
        modele: "Meridian",
        retour: "Mes CV",
      }),
    ).toEqual({
      url: "https://storage.karria.fr/x/a.pdf?sig=1",
      genre: "cv",
      titre: "CV · Awa Diallo",
      sousTitre: "PDF · Meridian",
      fichier: "CV - Awa Diallo.pdf",
      retour: "Mes CV",
    });
  });

  it("nomme une lettre par l'entreprise, en Word si c'est le seul lien", () => {
    const p = parametresDeLecture({
      url: "https://storage.karria.fr/x/l.docx",
      genre: "lettre",
      complement: "Maison Kayser",
      modele: null,
      retour: "Dossier",
    });
    expect(p.titre).toBe("Lettre · Maison Kayser");
    expect(p.sousTitre).toBe("Word");
    expect(p.fichier).toBe("Lettre de motivation - Maison Kayser.docx");
  });

  it("reste neutre sans nom", () => {
    const p = parametresDeLecture({
      url: "https://storage.karria.fr/x/a.pdf",
      genre: "cv",
      complement: null,
      modele: null,
      retour: "Mes CV",
    });
    expect(p.titre).toBe("Mon CV");
    expect(p.fichier).toBe("CV - Karria.pdf");
  });
});
