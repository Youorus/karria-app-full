/**
 * Le module `documents` vu de l'app (`documents.api.ts`), sur ce que
 * l'ADR-0040 de l'API ajoute : `watermarked` sur un export, `watermark` sur
 * un rendu, `GET /cv/me/generated-cvs/allowance`, et la précision sous le
 * poste visé dans le `cv` du rendu ancré et de l'export. Un serveur qui ne
 * connaît rien de tout cela ne doit rien casser.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { Cv } from "@/features/cv/types/cv.types";
import { ErreurApi } from "@/lib/http";

import type { ExportBrut } from "../types/atelier.types";
import {
  exporterCvDuDossier,
  exporterCvLibre,
  lireDroitsFiligrane,
  lireMesExports,
  rendreCv,
  rendreExemple,
  versExport,
} from "./documents.api";

const mockGet = jest.fn<(chemin: string, options?: unknown) => Promise<unknown>>();
const mockPost = jest.fn<(chemin: string, corps?: unknown) => Promise<unknown>>();

jest.mock("@/lib/http", () => ({
  ...jest.requireActual<Record<string, unknown>>("@/lib/http"),
  http: {
    get: (chemin: string, options?: unknown) => mockGet(chemin, options),
    post: (chemin: string, corps?: unknown) => mockPost(chemin, corps),
  },
}));

const exportBrut: ExportBrut = {
  id: "exp_1",
  kind: "cv",
  template: { id: "tpl", label: "Meridian", version: 1 },
  created_at: "2026-11-20T10:00:00Z",
  pdf_url: "https://s/cv.pdf",
  docx_url: "https://s/cv.docx",
};

const cv: Cv = {
  identite: {
    prenom: "Awa",
    nom: "Diallo",
    titre: "Vendeuse",
    precision: "Recherche alternance 24 mois · Disponible immédiatement",
  },
  contact: null,
  presentation: null,
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "",
};

describe("Le filigrane dans le contrat", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it("lit `watermarked` sur un export, et vaut faux quand le serveur ne le dit pas", () => {
    expect(versExport({ ...exportBrut, watermarked: true }).filigrane).toBe(true);
    expect(versExport({ ...exportBrut, watermarked: false }).filigrane).toBe(false);
    // Ancien serveur : le champ n'existe pas.
    expect(versExport(exportBrut).filigrane).toBe(false);
  });

  it("le lit aussi dans la liste des exports", async () => {
    mockGet.mockResolvedValue({
      items: [
        { ...exportBrut, watermarked: true },
        { ...exportBrut, id: "exp_2" },
      ],
      total: 2,
    });
    const liste = await lireMesExports();
    expect(liste.map((e) => e.filigrane)).toEqual([true, false]);
  });

  it("lit `watermark` sur un rendu : vrai, faux, ou inconnu", async () => {
    mockPost.mockResolvedValue({
      html: "<html/>",
      pages: 1,
      warnings: [],
      watermark: true,
    });
    expect((await rendreCv("tpl", cv)).filigrane).toBe(true);
    mockPost.mockResolvedValue({
      html: "<html/>",
      pages: 1,
      warnings: [],
      watermark: null,
    });
    expect((await rendreExemple("tpl")).filigrane).toBeNull();
    mockPost.mockResolvedValue({ html: "<html/>", pages: 1, warnings: [] });
    expect((await rendreCv("tpl", cv)).filigrane).toBeNull();
  });

  it("lit `/allowance` tel que le contrat l'écrit", async () => {
    mockGet.mockResolvedValue({
      subscriber: false,
      free_per_month: 3,
      used: 2,
      remaining: 1,
      watermark_next: false,
      resets_at: "2026-12-01T00:00:00Z",
    });
    expect(await lireDroitsFiligrane()).toEqual({
      abonne: false,
      gratuitsParMois: 3,
      utilises: 2,
      restants: 1,
      filigraneAuProchain: false,
      repartLe: "2026-12-01T00:00:00Z",
    });
    // Une lecture d'information : son échec n'entache pas la session.
    expect(mockGet).toHaveBeenCalledWith("/cv/me/generated-cvs/allowance", {
      facultatif: true,
    });
  });

  it("serveur plus ancien : `null`, sans lever", async () => {
    mockGet.mockRejectedValue(new ErreurApi("Introuvable", 404, "not_found"));
    expect(await lireDroitsFiligrane()).toBeNull();
    // Le serveur d'avant l'ADR-0040 prend « allowance » pour un identifiant
    // d'export mal formé (`/{generated_id}` attend un UUID) : `422`.
    mockGet.mockRejectedValue(
      new ErreurApi("Identifiant invalide", 422, "invalid_input", "generated_id"),
    );
    expect(await lireDroitsFiligrane()).toBeNull();
    mockGet.mockRejectedValue(
      new ErreurApi("Export inconnu", 404, "generated_cv_not_found"),
    );
    expect(await lireDroitsFiligrane()).toBeNull();
  });

  it("forme inattendue : `null`, sans lever", async () => {
    mockGet.mockResolvedValue({ id: "allowance" });
    expect(await lireDroitsFiligrane()).toBeNull();
    mockGet.mockResolvedValue(undefined);
    expect(await lireDroitsFiligrane()).toBeNull();
  });

  it("laisse remonter une autre panne : l'appelant la journalise", async () => {
    mockGet.mockRejectedValue(new ErreurApi("Indisponible", 503));
    await expect(lireDroitsFiligrane()).rejects.toBeInstanceOf(ErreurApi);
  });
});

describe("La précision sous le poste visé, dans le `cv` envoyé", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ html: "<html/>", pages: 1, warnings: [] });
  });

  const attendue = "Recherche alternance 24 mois · Disponible immédiatement";

  function identiteEnvoyee(): unknown {
    const corps = mockPost.mock.calls[mockPost.mock.calls.length - 1][1] as {
      cv: { identity: unknown };
    };
    return corps.cv.identity;
  }

  it("part dans le rendu ancré", async () => {
    await rendreCv("tpl", cv);
    expect(mockPost).toHaveBeenLastCalledWith("/documents/tpl/render", expect.anything());
    expect(identiteEnvoyee()).toEqual({
      first_name: "Awa",
      last_name: "Diallo",
      headline: "Vendeuse",
      availability: attendue,
    });
  });

  it("part dans l'export d'un dossier et dans l'export libre", async () => {
    mockPost.mockResolvedValue(exportBrut);
    await exporterCvDuDossier({ cv, modeleId: "tpl", dossierId: "dos_1" });
    expect(identiteEnvoyee()).toMatchObject({ availability: attendue });
    await exporterCvLibre({ cv, modeleId: "tpl" });
    expect(mockPost).toHaveBeenLastCalledWith("/cv/me/generated-cvs", expect.anything());
    expect(identiteEnvoyee()).toMatchObject({ availability: attendue });
  });
});
