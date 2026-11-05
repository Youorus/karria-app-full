import { describe, expect, it } from "@jest/globals";

import { ecrireFichierSimule, estUnFichierSimule, pdfMinimal } from "./stockage-simule";

describe("le stockage simulé", () => {
  it("ne reconnaît que les liens du faux serveur", () => {
    expect(estUnFichierSimule("https://storage.karria.fr/simule/x.pdf")).toBe(true);
    expect(estUnFichierSimule("https://storage.karria.fr/karria-production/x.pdf")).toBe(
      false,
    );
  });

  it("écrit un PDF dont la table des objets pointe juste", () => {
    const pdf = pdfMinimal(["Titre (test)", "Ligne accentuée é"]);
    expect(pdf.startsWith("%PDF-1.4\n")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    const startxref = Number(/startxref\n(\d+)\n/.exec(pdf)![1]);
    expect(pdf.slice(startxref, startxref + 4)).toBe("xref");
    const premiere = Number(/\n(\d{10}) 00000 n/.exec(pdf)![1]);
    expect(pdf.slice(premiere, premiere + 7)).toBe("1 0 obj");
    // Les parenthèses sont échappées, les accents ôtés : la chaîne reste lisible.
    expect(pdf).toContain("(Titre \\(test\\))");
    expect(pdf).toContain("(Ligne accentuee e)");
  });

  it("écrit un Word en texte, un PDF sinon", () => {
    const ecrits: string[] = [];
    const fichier = { write: (c: string) => void ecrits.push(c) } as never;
    ecrireFichierSimule(fichier, "https://storage.karria.fr/simule/cv.docx");
    ecrireFichierSimule(fichier, "https://storage.karria.fr/simule/cv.pdf?signature=1");
    expect(ecrits[0]).toContain("cv.docx");
    expect(ecrits[1]!.startsWith("%PDF")).toBe(true);
    expect(ecrits[1]).toContain("cv.pdf");
  });
});
