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

  it("reconnaît ses routes, la liste et la suppression des exports comprises", () => {
    expect(estUneRouteAtelier("POST", `/documents/${MERIDIAN}/render`)).toBe(true);
    expect(estUneRouteAtelier("POST", "/cv/me/generated-cvs")).toBe(true);
    expect(estUneRouteAtelier("GET", "/cv/me/generated-cvs?dossier_id=x")).toBe(true);
    expect(estUneRouteAtelier("DELETE", "/cv/me/generated-cvs/exp_1")).toBe(true);
    expect(estUneRouteAtelier("GET", "/user-templates/me/selected")).toBe(true);
    expect(estUneRouteAtelier("GET", "/cv/me")).toBe(false);
  });

  it("liste les CV libres semés avec ceux des dossiers, du plus récent au plus ancien", async () => {
    const tous = await lire(
      repondreAtelier("GET", "/cv/me/generated-cvs?kind=cv", undefined),
    );
    expect(tous.statut).toBe(200);
    const items = tous.corps?.items as {
      dossier_id: string | null;
      created_at: string;
    }[];
    const libres = items.filter((e) => e.dossier_id === null);
    expect(libres).toHaveLength(2);
    expect(items.some((e) => e.dossier_id !== null)).toBe(true);
    for (let i = 1; i < items.length; i += 1) {
      expect(items[i - 1].created_at >= items[i].created_at).toBe(true);
    }
    expect(
      (await lire(repondreAtelier("GET", "/cv/me/generated-cvs?kind=lettre", undefined)))
        .statut,
    ).toBe(422);
  });

  it("supprime un export, et refuse celui qu'il ne connaît pas", async () => {
    const avant = await lire(
      repondreAtelier("GET", "/cv/me/generated-cvs?kind=cv", undefined),
    );
    const items = avant.corps?.items as { id: string; dossier_id: string | null }[];
    const libre = items.find((e) => e.dossier_id === null)!;
    expect(
      (
        await lire(
          repondreAtelier("DELETE", `/cv/me/generated-cvs/${libre.id}`, undefined),
        )
      ).statut,
    ).toBe(204);
    expect(
      (await lire(repondreAtelier("GET", `/cv/me/generated-cvs/${libre.id}`, undefined)))
        .statut,
    ).toBe(404);
    expect(
      (
        await lire(
          repondreAtelier("DELETE", "/cv/me/generated-cvs/exp_inconnu", undefined),
        )
      ).statut,
    ).toBe(404);
  });

  it("exporte un CV libre (sans dossier) et l'envoie seul par e-mail", async () => {
    const exporte = await lire(
      repondreAtelier("POST", "/cv/me/generated-cvs", { cv, template_id: MERIDIAN }),
    );
    expect(exporte.statut).toBe(201);
    expect(exporte.corps?.dossier_id).toBeNull();
    const envoi = await lire(
      repondreAtelier("POST", `/documents/exports/${exporte.corps?.id}/send`, {
        to: null,
      }),
    );
    expect(envoi.statut).toBe(202);
    expect(envoi.corps?.generated_ids).toEqual([exporte.corps?.id]);
    expect(
      (await lire(repondreAtelier("POST", "/documents/exports/exp_inconnu/send", {})))
        .statut,
    ).toBe(404);
  });

  it("sans `cv` ni CV de base, l'export répond 409 cv_missing", async () => {
    const r = await lire(
      repondreAtelier("POST", "/cv/me/generated-cvs", { template_id: MERIDIAN }),
    );
    expect(r.statut).toBe(409);
    expect((r.corps?.error as { details: { reason: string } }).details.reason).toBe(
      "cv_missing",
    );
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
    expect(lettre.corps?.letter_style).toBe("template");

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

  it("rend et exporte dans la couleur choisie, la retient sur le choix, refuse un faux code", async () => {
    const cv = {
      identity: { first_name: "Awa", last_name: "Diallo", headline: "Vendeuse" },
    };
    const rendu = await lire(
      repondreAtelier("POST", `/documents/${MERIDIAN}/render`, {
        cv,
        primary_color: "7b1e2b",
      }),
    );
    expect(rendu.statut).toBe(200);
    expect(rendu.corps?.html).toContain("#7B1E2B");
    const faux = await lire(
      repondreAtelier("POST", `/documents/${MERIDIAN}/render`, {
        cv,
        primary_color: "bleu",
      }),
    );
    expect(faux.statut).toBe(422);

    const choix = await lire(
      repondreAtelier("PUT", "/user-templates/me/selected", {
        template_id: MERIDIAN,
        ats_safe: false,
        primary_color: "#2e7d32",
      }),
    );
    expect(choix.corps?.primary_color).toBe("#2E7D32");
    expect(typeof choix.corps?.default_primary_color).toBe("string");

    const exporte = await lire(
      repondreAtelier("POST", "/cv/me/generated-cvs", {
        template_id: MERIDIAN,
        cv,
        primary_color: "#7B1E2B",
      }),
    );
    expect(exporte.statut).toBe(201);
    expect(exporte.corps?.primary_color).toBe("#7B1E2B");
    const sansCouleur = await lire(
      repondreAtelier("POST", "/cv/me/generated-cvs", { template_id: MERIDIAN, cv }),
    );
    // Sans couleur dans le corps : celle du choix par défaut, comme le vrai serveur.
    expect(sansCouleur.corps?.primary_color).toBe("#2E7D32");
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

describe("le style de lettre (ADR-0036)", () => {
  const MARKETING = "9b2e7c41-3f6d-4a8b-b1c2-5e7f9a0d1b02";
  const lettre = {
    recipient: { company: "Acme" },
    subject: "Candidature",
    paragraphs: [{ kind: "libre", text: "x" }],
    sender: { first_name: "Awa", last_name: "Diallo" },
  };

  it("rend la lettre du modèle par défaut quand il en a une, la sobre sur demande, et dit le style servi", async () => {
    const parDefaut = await lire(
      repondreAtelier("POST", `/documents/${MERIDIAN}/render`, { letter: lettre }),
    );
    expect(parDefaut.statut).toBe(200);
    expect(parDefaut.corps?.letter_style_served).toBe("template");
    const sobre = await lire(
      repondreAtelier("POST", `/documents/${MERIDIAN}/render`, {
        letter: lettre,
        letter_style: "plain",
      }),
    );
    expect(sobre.corps?.letter_style_served).toBe("plain");
    expect(String(sobre.corps?.html)).toContain("Carlito");
    const faux = await lire(
      repondreAtelier("POST", `/documents/${MERIDIAN}/render`, {
        letter: lettre,
        letter_style: "fancy",
      }),
    );
    expect(faux.statut).toBe(422);
  });

  it("sert la lettre sobre quoi qu'on demande quand le modèle n'a pas de lettre assortie", async () => {
    const rendu = await lire(
      repondreAtelier("POST", `/documents/${MARKETING}/render`, {
        letter: lettre,
        letter_style: "template",
      }),
    );
    expect(rendu.corps?.letter_style_served).toBe("plain");
    const exporte = await lire(
      repondreAtelier("POST", "/documents/letters/export", {
        template_id: MARKETING,
        letter: lettre,
        letter_style: "template",
      }),
    );
    expect(exporte.statut).toBe(201);
    expect(exporte.corps?.letter_style).toBe("plain");
  });
});
