import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import type { ScoreAts } from "../types/atelier.types";
import {
  conseilsDe,
  correctionDe,
  messageDEnvoi,
  nomDeFichier,
  phraseAts,
  pointsAAmeliorer,
} from "./presentation";

describe("le score ATS", () => {
  const score: ScoreAts = {
    score: 72,
    niveau: "moyen",
    conseilAtsSafe: true,
    controles: [
      {
        cle: "fonts",
        libelle: "Polices",
        points: 4,
        maxPoints: 8,
        constat: null,
        conseil: "Active la variante.",
      },
      {
        cle: "contact",
        libelle: "Contact",
        points: 10,
        maxPoints: 10,
        constat: null,
        conseil: null,
      },
      {
        cle: "content",
        libelle: "Contenu",
        points: 2,
        maxPoints: 12,
        constat: "court",
        conseil: "Développe.",
      },
      {
        cle: "sections",
        libelle: "Rubriques",
        points: 5,
        maxPoints: 6,
        constat: null,
        conseil: "Nomme-les.",
      },
      {
        cle: "layout",
        libelle: "Mise en page",
        points: 0,
        maxPoints: 5,
        constat: null,
        conseil: "Une colonne.",
      },
    ],
  };

  it("retient trois points, les plus payants d'abord, jamais sans conseil", () => {
    expect(pointsAAmeliorer(score).map((c) => c.cle)).toEqual([
      "content",
      "layout",
      "fonts",
    ]);
  });

  it("motive sans chiffre d'entreprises", () => {
    for (const niveau of ["bon", "moyen", "faible"] as const)
      expect(phraseAts(niveau)).not.toMatch(/\d/);
  });

  it("sait où mène « Je corrige »", () => {
    expect(correctionDe("contact")).toEqual({ geste: "modifier", section: "contact" });
    expect(correctionDe("keywords")).toEqual({ geste: "karria" });
    expect(correctionDe("fonts")).toEqual({ geste: "ats-safe" });
    expect(correctionDe("layout")).toEqual({ geste: "modele" });
  });
});

describe("les conseils et les refus", () => {
  it("traduit les avertissements connus et tait les autres", () => {
    expect(conseilsDe(["subject_not_explicit", "inconnu"])).toEqual([
      "Commence l'objet par « Candidature » : c'est ce que les recruteurs cherchent.",
    ]);
  });

  it("explique un quota d'envoi humainement", () => {
    const refus = new ErreurApi("quota", 429, "send_quota_exceeded", undefined, {
      scope: "account",
      retry_after: 7200,
    });
    expect(messageDEnvoi(refus)).toMatch(/cinq envois du jour.*dans 2 heures/);
    const tiers = new ErreurApi("quota", 429, "send_quota_exceeded", undefined, {
      scope: "recipient",
    });
    expect(messageDEnvoi(tiers)).toMatch(/deux envois aujourd'hui/);
  });

  it("nomme les fichiers sans caractères interdits", () => {
    expect(nomDeFichier("cv", "Awa Diallo", null, "pdf")).toBe("CV - Awa Diallo.pdf");
    expect(nomDeFichier("lettre", "x", "Acme / Inc: Lyon", "docx")).toBe(
      "Lettre de motivation - Acme Inc Lyon.docx",
    );
  });
});
