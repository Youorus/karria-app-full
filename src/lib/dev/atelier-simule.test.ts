import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  estUneRouteAtelier,
  htmlDuCv,
  possederModeleAtelier,
  reinitialiserAtelier,
  repondreAtelier,
} from "./atelier-simule";

const MERIDIAN = "6f1c2b0e-8d4a-4c1e-9a57-0b3f1e2d4c01";
const MINIMALIST = "c4d81a93-7e25-4f0b-8c6d-2a9e4b7f3c03";

const cv = {
  summary: "Vendeuse depuis trois ans.",
  identity: { first_name: "Awa", last_name: "Diallo", headline: null },
  contact: { email: "awa@ex.fr", phone: null, city: "Montreuil", links: [] },
  experiences: [
    {
      position: "Vendeuse",
      company: "Zara",
      location: null,
      start_date: "2022-09",
      end_date: null,
      is_current: true,
      missions: ["Accueillir"],
    },
  ],
  educations: [],
  skills: [{ name: "Vente", level: "Avancé" }],
  languages: [],
  interests: [],
};

async function lire(r: Response) {
  return {
    statut: r.status,
    corps: r.status === 204 ? undefined : ((await r.json()) as Record<string, unknown>),
  };
}

describe("le faux serveur de l'atelier", () => {
  beforeEach(() => reinitialiserAtelier());

  it("reconnaît ses routes, et laisse la lecture des exports aux dossiers", () => {
    expect(estUneRouteAtelier("POST", `/documents/${MERIDIAN}/render`)).toBe(true);
    expect(estUneRouteAtelier("POST", "/cv/me/generated-cvs")).toBe(true);
    expect(estUneRouteAtelier("GET", "/cv/me/generated-cvs?dossier_id=x")).toBe(false);
    expect(estUneRouteAtelier("GET", "/user-templates/me/selected")).toBe(true);
  });

  it("rend un HTML ancré conforme au contrat", () => {
    const { html, pages, warnings } = htmlDuCv(cv, MERIDIAN);
    expect(html).toContain('data-chemin="identity.full_name"');
    expect(html).toContain('data-chemin="experiences.0.missions.0"');
    expect(html).toContain('data-chemin="experiences.0.dates"');
    expect(html).toContain('data-chemin="skills.0"');
    expect(html).toContain("window.karriaFit");
    expect(html).toContain('class="page"');
    expect(pages).toBe(1);
    expect(warnings).toContain("headline_missing");
  });

  it("refuse un Premium non possédé, puis le rend une fois livré", async () => {
    const refus = await lire(
      repondreAtelier("POST", `/documents/${MINIMALIST}/render`, { cv }),
    );
    expect(refus.statut).toBe(403);
    expect((refus.corps?.error as { details: { reason: string } }).details.reason).toBe(
      "template_not_owned",
    );
    const exemple = await lire(
      repondreAtelier("POST", `/documents/${MINIMALIST}/render?sample=true`, undefined),
    );
    expect(exemple.statut).toBe(200);
    possederModeleAtelier(MINIMALIST);
    expect(
      (await lire(repondreAtelier("POST", `/documents/${MINIMALIST}/render`, { cv })))
        .statut,
    ).toBe(200);
  });

  it("exporte un CV de dossier avec un score ATS, puis l'envoie, dans les quotas", async () => {
    const exporte = await lire(
      repondreAtelier("POST", "/cv/me/generated-cvs", {
        cv,
        template_id: MERIDIAN,
        dossier_id: "dos_1",
      }),
    );
    expect(exporte.statut).toBe(201);
    const ats = exporte.corps?.ats as { score: number; checks: { key: string }[] };
    expect(ats.score).toBeGreaterThan(0);
    expect(ats.checks.map((c) => c.key)).toContain("keywords");

    const lettre = await lire(
      repondreAtelier("POST", "/documents/letters/export", {
        template_id: MERIDIAN,
        dossier_id: "dos_1",
        letter: {
          recipient: { company: "Acme" },
          subject: "Candidature",
          paragraphs: [{ kind: "libre", text: "x" }],
        },
      }),
    );
    expect(lettre.statut).toBe(201);
    expect(lettre.corps?.kind).toBe("letter");

    const ids = [exporte.corps?.id, lettre.corps?.id];
    const envoi = await lire(
      repondreAtelier("POST", "/documents/exports/send", {
        generated_ids: ids,
        to: null,
      }),
    );
    expect(envoi.statut).toBe(202);
    expect(envoi.corps?.to).toBe("toi@exemple.fr");
    const relu = await lire(
      repondreAtelier("GET", `/documents/sends/${String(envoi.corps?.id)}`, undefined),
    );
    expect(relu.corps?.status).toBe("sent");

    for (let i = 0; i < 4; i += 1) {
      await repondreAtelier("POST", "/documents/exports/send", {
        generated_ids: ids,
        to: null,
      });
    }
    const refus = await lire(
      repondreAtelier("POST", "/documents/exports/send", {
        generated_ids: ids,
        to: null,
      }),
    );
    expect(refus.statut).toBe(429);
    expect((refus.corps?.error as { details: { scope: string } }).details.scope).toBe(
      "account",
    );
  });

  it("retient le modèle choisi", async () => {
    expect(
      (await lire(repondreAtelier("GET", "/user-templates/me/selected", undefined)))
        .statut,
    ).toBe(204);
    await repondreAtelier("PUT", "/user-templates/me/selected", {
      template_id: MERIDIAN,
      ats_safe: false,
    });
    const lu = await lire(
      repondreAtelier("GET", "/user-templates/me/selected", undefined),
    );
    expect((lu.corps?.template as { id: string }).id).toBe(MERIDIAN);
  });
});
