/**
 * Le consentement à l'IA : l'état partagé, la reprise après accord, les textes.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import {
  abonnerConsentementIa,
  ceQuiPart,
  consentementIa,
  dateLisible,
  demanderConsentementIa,
  disclosureIa,
  estConsentementIaRequis,
  fermerFeuilleIa,
  feuilleIa,
  fournisseursLisibles,
  ouvrirConsultationIa,
  poserConsentementIa,
  poserDisclosureIa,
  reprendreApresAccord,
  versionDisclosureAffichee,
} from "./consentement-ia";

describe("l'état partagé", () => {
  afterEach(() => {
    poserConsentementIa(null);
    fermerFeuilleIa();
  });

  it("ne sait rien tant que le serveur n'a pas parlé, puis recopie", () => {
    expect(consentementIa()).toBeNull();
    const rappel = jest.fn();
    const desabonner = abonnerConsentementIa(rappel);

    poserConsentementIa({
      requis: true,
      version: "2026-10.abc",
      fournisseurs: [],
      usages: [],
      versionAcceptee: null,
      accepteLe: null,
      retireLe: null,
    });

    expect(consentementIa()?.requis).toBe(true);
    expect(rappel).toHaveBeenCalledTimes(1);
    desabonner();
  });

  it("demande avant un geste, et reprend le geste après l'accord", () => {
    const action = jest.fn();
    demanderConsentementIa("assistant", action);

    expect(feuilleIa()).toEqual({ mode: "demande", usage: "assistant" });
    expect(action).not.toHaveBeenCalled();

    reprendreApresAccord();

    expect(feuilleIa()).toBeNull();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("« pas maintenant » laisse tomber le geste", () => {
    const action = jest.fn();
    demanderConsentementIa("cv_import", action);
    fermerFeuilleIa();
    reprendreApresAccord();

    expect(action).not.toHaveBeenCalled();
    expect(feuilleIa()).toBeNull();
  });

  it("la consultation s'ouvre sans geste en attente", () => {
    ouvrirConsultationIa();
    expect(feuilleIa()).toEqual({ mode: "consultation", usage: null });
  });

  it("reconnaît le 403 du serveur et rien d'autre", () => {
    expect(estConsentementIaRequis(new ErreurApi("x", 403, "ai_consent_required"))).toBe(
      true,
    );
    expect(estConsentementIaRequis(new ErreurApi("x", 403, "forbidden"))).toBe(false);
    expect(estConsentementIaRequis(new Error("x"))).toBe(false);
  });
});

describe("l'information avant la connexion", () => {
  // Elle survit volontairement aux autres tests : on repart de rien ici.
  beforeEach(() => {
    poserDisclosureIa(null);
    poserConsentementIa(null);
  });
  afterEach(() => {
    poserDisclosureIa(null);
    poserConsentementIa(null);
  });

  it("n'envoie aucune version tant que rien n'a été montré", () => {
    expect(disclosureIa()).toBeNull();
    expect(versionDisclosureAffichee()).toBeNull();
  });

  it("renvoie la version de l'information chargée par la feuille de connexion", () => {
    const rappel = jest.fn();
    const desabonner = abonnerConsentementIa(rappel);
    poserDisclosureIa({
      version: "2026-10.abc",
      fournisseurs: [{ id: "gemini", nom: "Google Gemini" }],
      usages: ["assistant"],
    });

    expect(versionDisclosureAffichee()).toBe("2026-10.abc");
    expect(rappel).toHaveBeenCalledTimes(1);
    desabonner();
  });

  it("suit ce que /auth/me dit une fois connecté, et survit à la déconnexion", () => {
    poserConsentementIa({
      requis: false,
      version: "2026-10.def",
      fournisseurs: [{ id: "gemini", nom: "Google Gemini" }],
      usages: ["assistant"],
      versionAcceptee: "2026-10.def",
      accepteLe: "2026-11-05T10:00:00Z",
      retireLe: null,
    });
    expect(versionDisclosureAffichee()).toBe("2026-10.def");

    poserConsentementIa(null);

    expect(consentementIa()).toBeNull();
    expect(versionDisclosureAffichee()).toBe("2026-10.def");
  });
});

describe("les textes", () => {
  it("met l'envoi de l'outil courant en tête, puis le reste", () => {
    const phrases = ceQuiPart(
      ["assistant", "transcription", "cv_creation"],
      "transcription",
    );
    expect(phrases[0]).toBe("ta voix, le temps de la transcrire");
    expect(phrases).toHaveLength(3);
  });

  it("ignore un usage inconnu et tolère l'absence d'outil", () => {
    const usages = ["assistant", "inconnu"] as unknown as Parameters<typeof ceQuiPart>[0];
    expect(ceQuiPart(usages, null)).toEqual(["tes messages à Karria"]);
  });

  it("énumère les fournisseurs en français", () => {
    expect(fournisseursLisibles([])).toBe("nos fournisseurs d'IA");
    expect(fournisseursLisibles([{ nom: "Google Gemini" }])).toBe("Google Gemini");
    expect(
      fournisseursLisibles([
        { nom: "Google Gemini" },
        { nom: "OpenAI" },
        { nom: "Anthropic Claude" },
      ]),
    ).toBe("Google Gemini, OpenAI et Anthropic Claude");
  });

  it("rend une date lisible, ou rien", () => {
    expect(dateLisible(null)).toBeNull();
    expect(dateLisible("pas une date")).toBeNull();
    expect(dateLisible("2026-10-30T09:00:00Z")).toContain("2026");
  });
});
