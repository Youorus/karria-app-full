/**
 * Le faux serveur du CV : il fige `docs/contrat-api-cv.md`.
 *
 * Ces tests protègent ce que le parcours suppose : un jet au format V1
 * pour une réponse claire, un recentrage (et jamais de jet) pour une
 * réponse hors sujet, et un CV qui n'existe qu'une fois tous les
 * chapitres validés ou passés.
 */

import { beforeAll, describe, expect, it } from "@jest/globals";

import {
  accepterConsentementIa,
  retirerConsentementIa,
  VERSION_SIMULEE,
} from "./consentement-simule";
import { estUneRouteCv, repondreCv } from "./cv-simule";

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = repondreCv(methode, chemin, corps);
  return {
    statut: reponse.status,
    corps: (await reponse.json()) as Record<string, unknown>,
  };
}

describe("Les routes en avance sur le backend", () => {
  it("couvrent le CV et la voix, rien d'autre", () => {
    expect(estUneRouteCv("/cv/draft")).toBe(true);
    expect(estUneRouteCv("/voice/transcribe")).toBe(true);
    expect(estUneRouteCv("/job-matches/me")).toBe(false);
  });
});

describe("La porte de l'IA (ADR-0025)", () => {
  it("refuse l'interprétation tant que l'accord n'est pas donné", async () => {
    retirerConsentementIa();
    const { statut, corps } = await appeler("POST", "/cv/draft/interpret", {
      chapter: "identity",
      answer: "Je suis Awa",
    });
    expect(statut).toBe(403);
    const details = (corps.error as { details: { reason: string; version: string } })
      .details;
    expect(details.reason).toBe("ai_consent_required");
    expect(details.version).toBe(VERSION_SIMULEE);
    expect(accepterConsentementIa("autre")).toBe(VERSION_SIMULEE);
    expect(accepterConsentementIa(VERSION_SIMULEE)).toBeNull();
  });
});

describe("L'interprétation simulée", () => {
  beforeAll(() => {
    accepterConsentementIa(VERSION_SIMULEE);
  });

  it("tire une expérience au format V1 d'une phrase libre", async () => {
    const { corps } = await appeler("POST", "/cv/draft/interpret", {
      chapter: "experiences",
      answer:
        "j'ai travaillé comme vendeuse chez Zara pendant 2 ans, je m'occupais de la caisse et du rayon",
    });
    expect(corps.off_topic).toBe(false);
    expect(corps.proposal).toMatchObject({
      position: "Vendeuse",
      company: "Zara",
      is_current: false,
    });
  });

  it("recentre une réponse vide de sens, sans inventer de jet", async () => {
    const { corps } = await appeler("POST", "/cv/draft/interpret", {
      chapter: "identity",
      answer: "bof",
    });
    expect(corps.off_topic).toBe(true);
    expect(corps.proposal).toBeNull();
    expect(typeof corps.follow_up).toBe("string");
  });
});

describe("L'import d'un CV existant", () => {
  beforeAll(() => {
    accepterConsentementIa(VERSION_SIMULEE);
  });

  const fichier = (type: string) => ({
    getParts: () => [{ fieldName: "file", uri: "file:///cv.pdf", type }],
  });

  it("refuse un type de fichier hors contrat avec la raison attendue", async () => {
    const refus = await appeler("POST", "/cv/import", fichier("application/zip"));
    expect(refus.statut).toBe(422);
    expect((refus.corps.error as { details: { reason: string } }).details.reason).toBe(
      "document_type_unsupported",
    );
  });

  it("pose des propositions, jamais des validations, et garde ce qui l'était", async () => {
    await appeler("POST", "/cv/draft");
    await appeler("PUT", "/cv/draft/chapters/identity", {
      data: { first_name: "Moussa", last_name: "KANE", headline: null },
    });
    const importe = await appeler("POST", "/cv/import", fichier("application/pdf"));
    expect(importe.statut).toBe(201);
    const chapitres = importe.corps.chapters as Record<
      string,
      { status: string; data?: unknown; items?: unknown[] }
    >;
    expect(chapitres.identity).toMatchObject({
      status: "validated",
      data: { first_name: "Moussa" },
    });
    expect(chapitres.contact.status).toBe("in_progress");
    expect(chapitres.experiences).toMatchObject({ status: "in_progress" });
    expect(chapitres.experiences.items).toHaveLength(2);
    expect(chapitres.photo).toBeUndefined();
    expect(importe.corps.current_chapter).toBe("contact");
    // Rien n'est validé à la place de l'utilisateur : le CV ne se crée pas.
    expect((await appeler("POST", "/cv/draft/finalize")).statut).toBe(409);
    // On range derrière soi : le brouillon simulé est partagé entre les
    // tests, et finaliser est la seule façon de le vider.
    for (const c of ORDRE_RESTANT) {
      await appeler("PUT", `/cv/draft/chapters/${c}`, { skipped: true });
    }
    expect((await appeler("POST", "/cv/draft/finalize")).statut).toBe(201);
  });
});

const ORDRE_RESTANT = [
  "contact",
  "summary",
  "experiences",
  "educations",
  "skills",
  "interests",
  "photo",
];

describe("Le brouillon", () => {
  it("ne devient un CV qu'une fois chaque chapitre validé ou passé", async () => {
    await appeler("POST", "/cv/draft");
    await appeler("PUT", "/cv/draft/chapters/identity", {
      data: { first_name: "Awa", last_name: "DIALLO", headline: "Vendeuse" },
    });
    expect((await appeler("POST", "/cv/draft/finalize")).statut).toBe(409);

    for (const c of [
      "contact",
      "summary",
      "experiences",
      "educations",
      "skills",
      "interests",
      "photo",
    ]) {
      await appeler("PUT", `/cv/draft/chapters/${c}`, { skipped: true });
    }
    const fin = await appeler("POST", "/cv/draft/finalize");
    expect(fin.statut).toBe(201);
    expect(fin.corps.identity).toMatchObject({ first_name: "Awa" });
    expect((await appeler("GET", "/cv/draft")).statut).toBe(404);
  });
});
