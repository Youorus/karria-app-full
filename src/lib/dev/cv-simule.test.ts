/**
 * Le faux serveur du CV : il fige `docs/contrat-api-cv.md`.
 *
 * Ces tests protègent ce que le parcours suppose : un jet au format V1
 * pour une réponse claire, un recentrage (et jamais de jet) pour une
 * réponse hors sujet, et un CV qui n'existe qu'une fois tous les
 * chapitres validés ou passés.
 */

import { describe, expect, it } from "@jest/globals";

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

describe("L'interprétation simulée", () => {
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
