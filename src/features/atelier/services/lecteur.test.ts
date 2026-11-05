import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  documentMemorise,
  estUnPdf,
  formatDuLien,
  lienDeStockageSur,
  memoriserDocument,
  modeDAffichage,
  nomDeFichierSur,
  oublierLesDocuments,
  presentationDeLecture,
  sousTitreDeLecture,
  titreDeLecture,
  type DocumentALire,
} from "./lecteur";

const DOCUMENT: DocumentALire = {
  id: "exp-1",
  url: "https://storage.karria.fr/x/a.pdf?X-Amz-Signature=1",
  genre: "cv",
  complement: "Awa Diallo",
  modele: "Meridian",
  retour: "Mes CV",
};

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

describe("Ce que le lecteur refuse", () => {
  it("n'accepte que https vers l'hôte du stockage de Karria", () => {
    expect(
      lienDeStockageSur("https://storage.karria.fr/b/cv.pdf?X-Amz-Signature=1"),
    ).toBe(true);
    expect(lienDeStockageSur("https://STORAGE.karria.fr/simule/cv.pdf")).toBe(true);
    expect(lienDeStockageSur("http://storage.karria.fr/b/cv.pdf")).toBe(false);
    expect(lienDeStockageSur("https://storage.karria.fr.evil.example/cv.pdf")).toBe(
      false,
    );
    expect(lienDeStockageSur("https://evil.example/storage.karria.fr/cv.pdf")).toBe(
      false,
    );
    expect(lienDeStockageSur("https://user:pass@storage.karria.fr/cv.pdf")).toBe(false);
    expect(lienDeStockageSur("https://storage.karria.fr:8443/cv.pdf")).toBe(false);
    expect(lienDeStockageSur("file:///etc/passwd")).toBe(false);
    expect(lienDeStockageSur("pas une url")).toBe(false);
  });

  it("refuse les noms de fichier qui sortent du répertoire des exports", () => {
    expect(nomDeFichierSur("CV - Awa Diallo.pdf", "pdf")).toBe(true);
    expect(nomDeFichierSur("../../brouillons/x.pdf", "pdf")).toBe(false);
    expect(nomDeFichierSur("..", "pdf")).toBe(false);
    expect(nomDeFichierSur("a/b.pdf", "pdf")).toBe(false);
    expect(nomDeFichierSur("a\\b.pdf", "pdf")).toBe(false);
    expect(nomDeFichierSur(".cache.pdf", "pdf")).toBe(false);
    expect(nomDeFichierSur("x\u0000.pdf", "pdf")).toBe(false);
    expect(nomDeFichierSur("", "pdf")).toBe(false);
    expect(nomDeFichierSur(`${"a".repeat(200)}.pdf`, "pdf")).toBe(false);
  });

  it("exige l'extension du format", () => {
    expect(nomDeFichierSur("CV.pdf", "docx")).toBe(false);
    expect(nomDeFichierSur("CV.docx", "docx")).toBe(true);
    expect(nomDeFichierSur("CV.pdf.html", "pdf")).toBe(false);
  });

  it("reconnaît un PDF à ses premiers octets", () => {
    expect(estUnPdf(new TextEncoder().encode("%PDF-1.4\n"))).toBe(true);
    expect(estUnPdf(new TextEncoder().encode("<html>"))).toBe(false);
    expect(estUnPdf(new Uint8Array([0x25, 0x50]))).toBe(false);
  });
});

describe("Les documents mémorisés", () => {
  beforeEach(() => oublierLesDocuments());

  it("retient un document sûr et le rend par son identifiant", () => {
    expect(memoriserDocument(DOCUMENT)).toBe("exp-1");
    expect(documentMemorise("exp-1")).toEqual(DOCUMENT);
  });

  it("ne retient rien d'un lien hors stockage, ni d'un identifiant vide", () => {
    expect(
      memoriserDocument({ ...DOCUMENT, url: "https://evil.example/cv.pdf" }),
    ).toBeNull();
    expect(memoriserDocument({ ...DOCUMENT, id: "" })).toBeNull();
    expect(documentMemorise("exp-1")).toBeNull();
  });

  it("ignore un identifiant inconnu ou d'un autre type — un lien externe forgé n'ouvre rien", () => {
    expect(documentMemorise("inconnu")).toBeNull();
    expect(documentMemorise(["exp-1"])).toBeNull();
    expect(documentMemorise(undefined)).toBeNull();
  });

  it("oublie tout à la déconnexion", () => {
    memoriserDocument(DOCUMENT);
    oublierLesDocuments();
    expect(documentMemorise("exp-1")).toBeNull();
  });
});

describe("La présentation d'un document", () => {
  it("nomme un CV par la personne, et son fichier comme le serveur", () => {
    expect(presentationDeLecture(DOCUMENT)).toEqual({
      format: "pdf",
      titre: "CV · Awa Diallo",
      sousTitre: "PDF · Meridian",
      fichier: "CV - Awa Diallo.pdf",
      retour: "Mes CV",
    });
  });

  it("nomme une lettre par l'entreprise, en Word si c'est le seul lien", () => {
    const p = presentationDeLecture({
      ...DOCUMENT,
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

  it("reste neutre sans nom, et le nom de fichier ne vient jamais de l'extérieur", () => {
    const p = presentationDeLecture({ ...DOCUMENT, complement: "../../x", modele: null });
    expect(p.titre).toBe("CV · ../../x");
    expect(p.fichier).toBe("CV - .. .. x.pdf");
    expect(presentationDeLecture({ ...DOCUMENT, complement: null }).titre).toBe("Mon CV");
  });
});
