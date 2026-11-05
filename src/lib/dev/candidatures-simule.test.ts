/**
 * Le faux serveur des dossiers (`candidatures-simule.ts`) : la forme du
 * contrat `docs/contrat-api-candidatures.md`, les dossiers d'avance,
 * l'adaptation différée, les décisions, la lettre, « j'ai candidaté » et
 * les refus.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  DELAI_ADAPTATION_MS,
  estUneRouteCandidature,
  reinitialiserCandidatures,
  repondreCandidatures,
} from "./candidatures-simule";
import {
  accepterConsentementIa,
  retirerConsentementIa,
  VERSION_SIMULEE,
} from "./consentement-simule";
import { reinitialiserOffres, repondreOffres } from "./offres-simule";
import { repondreAtelier } from "./atelier-simule";

const T0 = Date.parse("2026-11-06T10:00:00Z");
const KAYSER = "0f1e2d3c-0000-4000-8000-000000000006";
const BNP = "0f1e2d3c-0000-4000-8000-000000000001";

async function lire(reponse: Response) {
  const texte = await reponse.text();
  return { statut: reponse.status, corps: texte === "" ? null : JSON.parse(texte) };
}

const appeler = (methode: string, chemin: string, corps?: unknown, maintenant = T0) =>
  lire(repondreCandidatures(methode, chemin, corps, maintenant));

describe("Le faux serveur des dossiers", () => {
  beforeEach(() => {
    reinitialiserOffres();
    reinitialiserCandidatures(T0);
    accepterConsentementIa(VERSION_SIMULEE);
  });

  it("reconnaît ses routes — les exports sont à l'atelier", () => {
    expect(estUneRouteCandidature("/applications?applied=true")).toBe(true);
    expect(estUneRouteCandidature("/applications/abc/letter")).toBe(true);
    expect(estUneRouteCandidature("/cv/me/generated-cvs?dossier_id=x")).toBe(false);
    expect(estUneRouteCandidature("/cv/me")).toBe(false);
  });

  it("sert trois dossiers d'avance : un candidaté, un prêt avec sa lettre, un en cours", async () => {
    const { statut, corps } = await appeler("GET", "/applications?applied=false");
    expect(statut).toBe(200);
    expect(corps.items).toHaveLength(3);
    const statuts = corps.items.map((c: { status: string }) => c.status).sort();
    expect(statuts).toEqual(["brouillon", "candidate", "pret"]);
    const candidate = corps.items.find(
      (c: { status: string }) => c.status === "candidate",
    );
    expect(candidate.applied_at).not.toBeNull();
    expect(candidate.has_letter).toBe(true);
    expect(candidate.offer).toMatchObject({ offer_id: KAYSER, company: "Maison Kayser" });
    expect(Object.keys(candidate.offer).sort()).toEqual(
      [
        "city",
        "company",
        "contract_label",
        "logo_url",
        "offer_id",
        "source_url",
        "title",
      ].sort(),
    );

    const candidatees = await appeler("GET", "/applications?applied=true");
    expect(candidatees.corps.items).toHaveLength(1);

    // Le fil sait que l'offre est postulée.
    const match = await lire(repondreOffres("GET", `/job-matches/${KAYSER}`, undefined));
    expect(match.corps.applied).toBe(true);
  });

  it("rend le dossier entier, avec l'offre figée, la couverture et le statut déduit", async () => {
    const liste = await appeler("GET", "/applications");
    const pret = liste.corps.items.find((c: { status: string }) => c.status === "pret");
    const { statut, corps } = await appeler("GET", `/applications/${pret.id}`);
    expect(statut).toBe(200);
    expect(corps.offer.description).toContain("Le poste");
    expect(corps.offer.keywords.length).toBeGreaterThan(0);
    expect(corps.cv.identity.headline).toBe("Développeur·se web full stack");
    expect(corps.cv.image_url).toBeUndefined();
    expect(
      corps.propositions.some((p: { state: string }) => p.state === "acceptee"),
    ).toBe(true);
    expect(corps.letter.paragraphs).toHaveLength(4);
    expect(corps.coverage).toMatchObject({ ratio: expect.any(Number) });
    expect(corps.status).toBe("pret");
  });

  it("refuse un dossier inconnu", async () => {
    const { statut, corps } = await appeler("GET", "/applications/inconnu");
    expect(statut).toBe(404);
    expect(corps.error.details.reason).toBe("dossier_not_found");
  });

  it("ouvre un dossier depuis une offre, en cours puis fait, et rend l'existant ensuite", async () => {
    // Pas de CV de base dans le faux serveur CV : `409 cv_missing`.
    const sansCv = await appeler("POST", "/applications", {
      offer_id: BNP,
      template_id: null,
    });
    expect(sansCv.statut).toBe(409);
    expect(sansCv.corps.error.details.reason).toBe("cv_missing");

    const inconnue = await appeler("POST", "/applications", {
      offer_id: "0f1e2d3c-0000-4000-8000-000000000099",
    });
    expect(inconnue.statut).toBe(404);
    expect(inconnue.corps.error.details.reason).toBe("offer_not_found");

    // Un dossier existant pour cette offre : `200`, rien n'est relancé.
    const existant = await appeler("POST", "/applications", { offer_id: KAYSER });
    expect(existant.statut).toBe(200);
    expect(existant.corps.status).toBe("candidate");
  });

  it("fait aboutir l'adaptation différée à la relecture, passé le délai", async () => {
    const liste = await appeler("GET", "/applications");
    const enCours = liste.corps.items.find(
      (c: { adaptation: string }) => c.adaptation === "en_cours",
    );
    expect(enCours).toBeDefined();
    const avant = await appeler(
      "GET",
      `/applications/${enCours.id}`,
      undefined,
      T0 + 1_000,
    );
    expect(avant.corps.adaptation).toBe("en_cours");
    expect(avant.corps.propositions).toEqual([]);

    const apres = await appeler(
      "GET",
      `/applications/${enCours.id}`,
      undefined,
      T0 + DELAI_ADAPTATION_MS + 1,
    );
    expect(apres.corps.adaptation).toBe("faite");
    expect(apres.corps.propositions.length).toBeGreaterThan(0);
    expect(apres.corps.status).toBe("brouillon");
    expect(apres.corps.cv.identity.headline).toBe("Serveur·se de restaurant");
  });

  it("refuse de retoucher ou d'ébaucher pendant l'adaptation, et de relancer sans échec", async () => {
    const liste = await appeler("GET", "/applications");
    const enCours = liste.corps.items.find(
      (c: { adaptation: string }) => c.adaptation === "en_cours",
    );
    const retouche = await appeler("PUT", `/applications/${enCours.id}/cv`, { cv: {} });
    expect(retouche.statut).toBe(409);
    expect(retouche.corps.error.details.reason).toBe("adaptation_in_progress");
    const lettre = await appeler("POST", `/applications/${enCours.id}/letter`, {});
    expect(lettre.corps.error.details.reason).toBe("adaptation_in_progress");
    const relance = await appeler("POST", `/applications/${enCours.id}/adapt`, {});
    expect(relance.statut).toBe(409);
    expect(relance.corps.error.details.reason).toBe("adaptation_not_failed");
  });

  it("applique, refuse et défait une proposition", async () => {
    const liste = await appeler("GET", "/applications");
    const enCours = liste.corps.items.find(
      (c: { adaptation: string }) => c.adaptation === "en_cours",
    );
    const t1 = T0 + DELAI_ADAPTATION_MS + 1;
    const dossier = (await appeler("GET", `/applications/${enCours.id}`, undefined, t1))
      .corps;
    const mission = dossier.propositions.find(
      (p: { path: string }) => p.path === "experiences.0.missions.0",
    );
    const chemin = `/applications/${enCours.id}/propositions/${mission.id}`;

    const acceptee = await appeler("POST", chemin, { decision: "accepter" }, t1);
    expect(acceptee.statut).toBe(200);
    expect(acceptee.corps.cv.experiences[0].missions[0]).toBe(mission.after);
    expect(
      acceptee.corps.propositions.find((p: { id: string }) => p.id === mission.id).state,
    ).toBe("acceptee");

    const revenue = await appeler("POST", chemin, { decision: "revenir" }, t1);
    expect(revenue.corps.cv.experiences[0].missions[0]).toBe(mission.before);
    expect(
      revenue.corps.propositions.find((p: { id: string }) => p.id === mission.id).state,
    ).toBe("proposee");

    const refusee = await appeler("POST", chemin, { decision: "refuser" }, t1);
    expect(
      refusee.corps.propositions.find((p: { id: string }) => p.id === mission.id).state,
    ).toBe("refusee");

    expect(
      (
        await appeler(
          "POST",
          `/applications/${enCours.id}/propositions/xx`,
          { decision: "accepter" },
          t1,
        )
      ).statut,
    ).toBe(404);
    expect((await appeler("POST", chemin, { decision: "peut-être" }, t1)).statut).toBe(
      422,
    );
  });

  it("signale un chemin disparu quand la retouche a retiré l'élément", async () => {
    const liste = await appeler("GET", "/applications");
    const pret = liste.corps.items.find((c: { status: string }) => c.status === "pret");
    const dossier = (await appeler("GET", `/applications/${pret.id}`)).corps;
    const mission = dossier.propositions.find(
      (p: { path: string }) => p.path === "experiences.0.missions.0",
    );
    const sansExperiences = { ...dossier.cv, experiences: [] };
    const retouche = await appeler("PUT", `/applications/${pret.id}/cv`, {
      cv: sansExperiences,
    });
    expect(retouche.statut).toBe(200);
    expect(retouche.corps.cv.experiences).toEqual([]);
    const decision = await appeler(
      "POST",
      `/applications/${pret.id}/propositions/${mission.id}`,
      { decision: "accepter" },
    );
    expect(decision.statut).toBe(409);
    expect(decision.corps.error.details.reason).toBe("proposition_path_invalid");
  });

  it("refuse un CV invalide avec ses champs", async () => {
    const liste = await appeler("GET", "/applications");
    const pret = liste.corps.items.find((c: { status: string }) => c.status === "pret");
    const dossier = (await appeler("GET", `/applications/${pret.id}`)).corps;
    const faux = {
      ...dossier.cv,
      identity: { first_name: "", last_name: "X", headline: null },
      skills: "non",
    };
    const { statut, corps } = await appeler("PUT", `/applications/${pret.id}/cv`, {
      cv: faux,
    });
    expect(statut).toBe(422);
    expect(corps.error.details.reason).toBe("cv_invalid");
    expect(corps.error.details.fields.map((f: { field: string }) => f.field)).toEqual(
      expect.arrayContaining(["identity.first_name", "skills"]),
    );
  });

  it("ébauche, retouche et réécrit la lettre, et refuse une lettre hors forme", async () => {
    const liste = await appeler("GET", "/applications");
    const pret = liste.corps.items.find((c: { status: string }) => c.status === "pret");
    const id = pret.id;

    const ebauche = await appeler("POST", `/applications/${id}/letter`, {});
    expect(ebauche.statut).toBe(200);
    expect(ebauche.corps.letter.subject).toContain("Candidature");
    expect(ebauche.corps.letter.paragraphs.map((p: { kind: string }) => p.kind)).toEqual([
      "interet_entreprise",
      "interet_poste",
      "competences",
      "pourquoi_moi",
    ]);

    const retouchee = { ...ebauche.corps.letter, subject: "Candidature spontanée" };
    const put = await appeler("PUT", `/applications/${id}/letter`, retouchee);
    expect(put.statut).toBe(200);
    expect(put.corps.letter.subject).toBe("Candidature spontanée");

    const trop = {
      ...retouchee,
      paragraphs: Array(7).fill({ kind: "libre", text: "x" }),
    };
    const refus = await appeler("PUT", `/applications/${id}/letter`, trop);
    expect(refus.statut).toBe(422);
    expect(refus.corps.error.details.reason).toBe("letter_invalid");
    expect(refus.corps.error.details.fields[0].field).toBe("paragraphs");

    const avant = put.corps.letter.paragraphs[1].text;
    const court = await appeler(
      "POST",
      `/applications/${id}/letter/paragraphs/1/regenerate`,
      { instruction: "plus court" },
    );
    expect(court.statut).toBe(200);
    expect(court.corps.letter.paragraphs[1].text.length).toBeLessThanOrEqual(
      avant.length,
    );
    expect(court.corps.letter.paragraphs[1].kind).toBe("interet_poste");
    expect(court.corps.letter.paragraphs[0].text).toBe(
      put.corps.letter.paragraphs[0].text,
    );

    expect(
      (
        await appeler("POST", `/applications/${id}/letter/paragraphs/9/regenerate`, {
          instruction: null,
        })
      ).corps.error.details.reason,
    ).toBe("paragraph_not_found");
    expect(
      (
        await appeler("POST", `/applications/${id}/letter/paragraphs/0/regenerate`, {
          instruction: "x".repeat(301),
        })
      ).statut,
    ).toBe(422);
  });

  it("dit letter_missing sans lettre", async () => {
    const liste = await appeler("GET", "/applications");
    const enCours = liste.corps.items.find(
      (c: { adaptation: string }) => c.adaptation === "en_cours",
    );
    const { statut, corps } = await appeler(
      "POST",
      `/applications/${enCours.id}/letter/paragraphs/0/regenerate`,
      { instruction: null },
    );
    expect(statut).toBe(404);
    expect(corps.error.details.reason).toBe("letter_missing");
  });

  it("marque et retire « j'ai candidaté », idempotent, et le fil suit", async () => {
    const liste = await appeler("GET", "/applications");
    const pret = liste.corps.items.find((c: { status: string }) => c.status === "pret");
    const id = pret.id;
    const offreId = pret.offer.offer_id;

    const une = await appeler("POST", `/applications/${id}/applied`, {}, T0 + 1_000);
    expect(une.corps.status).toBe("candidate");
    expect(une.corps.applied_at).toBe(new Date(T0 + 1_000).toISOString());
    const deux = await appeler("POST", `/applications/${id}/applied`, {}, T0 + 5_000);
    expect(deux.corps.applied_at).toBe(une.corps.applied_at);
    expect(
      (await lire(repondreOffres("GET", `/job-matches/${offreId}`, undefined))).corps
        .applied,
    ).toBe(true);

    const retire = await appeler("DELETE", `/applications/${id}/applied`);
    expect(retire.corps.status).toBe("pret");
    expect(retire.corps.applied_at).toBeNull();
    expect(
      (await lire(repondreOffres("GET", `/job-matches/${offreId}`, undefined))).corps
        .applied,
    ).toBe(false);
  });

  it("supprime un dossier, et ses exports restent chez documents", async () => {
    // La liste des exports est servie par le faux serveur de l'atelier, qui
    // lit ceux des dossiers (`exportsSimulesDesDossiers`).
    const exporter = (chemin: string) =>
      lire(repondreAtelier("GET", chemin, undefined, T0));
    const liste = await appeler("GET", "/applications");
    const candidate = liste.corps.items.find(
      (c: { status: string }) => c.status === "candidate",
    );
    const exports = await exporter(`/cv/me/generated-cvs?dossier_id=${candidate.id}`);
    expect(exports.corps.items).toHaveLength(2);
    expect(exports.corps.items.map((e: { kind: string }) => e.kind).sort()).toEqual([
      "cv",
      "letter",
    ]);
    const lettres = await exporter(
      `/cv/me/generated-cvs?dossier_id=${candidate.id}&kind=letter`,
    );
    expect(lettres.corps.items).toHaveLength(1);
    expect((await exporter("/cv/me/generated-cvs?kind=lm")).statut).toBe(422);

    const suppression = await appeler("DELETE", `/applications/${candidate.id}`);
    expect(suppression.statut).toBe(204);
    expect((await appeler("GET", `/applications/${candidate.id}`)).statut).toBe(404);
    expect((await appeler("GET", "/applications")).corps.items).toHaveLength(2);
    expect(
      (await exporter(`/cv/me/generated-cvs?dossier_id=${candidate.id}`)).corps.items,
    ).toHaveLength(2);
  });

  it("garde la porte du consentement sur les routes d'IA seulement", async () => {
    retirerConsentementIa();
    const liste = await appeler("GET", "/applications");
    expect(liste.statut).toBe(200);
    const pret = liste.corps.items.find((c: { status: string }) => c.status === "pret");
    const refus = await appeler("POST", `/applications/${pret.id}/letter`, {});
    expect(refus.statut).toBe(403);
    expect(refus.corps.error.details.reason).toBe("ai_consent_required");
    expect((await appeler("POST", "/applications", { offer_id: BNP })).statut).toBe(403);
    expect((await appeler("POST", `/applications/${pret.id}/applied`, {})).statut).toBe(
      200,
    );
  });
});
