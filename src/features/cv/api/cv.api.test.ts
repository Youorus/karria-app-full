/**
 * La traduction du CV (`cv.api.ts`), sur le champ ajouté par l'ADR-0040 de
 * l'API : la précision sous le poste visé (`identity.availability`). Elle
 * doit voyager partout où `identity.headline` voyage — lecture du CV,
 * brouillon, écriture d'une section — et un serveur qui ne la connaît pas
 * encore ne doit rien casser.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { CvBrut } from "../types/cv.types";
import { lireMonCv, modifierSection, versBrut, versCv, versJet } from "./cv.api";

const mockGet = jest.fn<(chemin: string) => Promise<unknown>>();
const mockPut = jest.fn<(chemin: string, corps?: unknown) => Promise<unknown>>();

jest.mock("@/lib/http", () => ({
  ...jest.requireActual<Record<string, unknown>>("@/lib/http"),
  http: {
    get: (chemin: string) => mockGet(chemin),
    put: (chemin: string, corps?: unknown) => mockPut(chemin, corps),
  },
}));

const PRECISION = "Recherche alternance 24 mois · Disponible immédiatement";

function cvBrut(identity: CvBrut["identity"]): CvBrut {
  return {
    id: "cv-1",
    updated_at: "2026-11-20T10:00:00Z",
    summary: null,
    image_url: null,
    identity,
    contact: null,
    experiences: [],
    educations: [],
    skills: [],
    languages: [],
    interests: [],
  };
}

describe("La précision sous le poste visé", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPut.mockReset();
  });

  it("se lit dans `GET /cv/me`", async () => {
    mockGet.mockResolvedValue(
      cvBrut({
        first_name: "Awa",
        last_name: "Diallo",
        headline: "Vendeuse",
        availability: PRECISION,
      }),
    );
    const cv = await lireMonCv();
    expect(mockGet).toHaveBeenCalledWith("/cv/me");
    expect(cv.identite).toEqual({
      prenom: "Awa",
      nom: "Diallo",
      titre: "Vendeuse",
      precision: PRECISION,
    });
  });

  it("vaut `null` quand le serveur ne l'envoie pas encore", () => {
    const cv = versCv(
      cvBrut({ first_name: "Awa", last_name: "Diallo", headline: "Vendeuse" }),
    );
    expect(cv.identite?.precision).toBeNull();
    expect(
      versJet("identity", { first_name: "Awa", last_name: "Diallo", headline: null }),
    ).toEqual({
      chapitre: "identity",
      donnees: { prenom: "Awa", nom: "Diallo", titre: null, precision: null },
    });
  });

  it("fait l'aller-retour d'un jet d'identité (brouillon et édition)", () => {
    const brut = {
      first_name: "Awa",
      last_name: "Diallo",
      headline: "Vendeuse",
      availability: PRECISION,
    };
    const jet = versJet("identity", brut);
    expect(jet).toEqual({
      chapitre: "identity",
      donnees: { prenom: "Awa", nom: "Diallo", titre: "Vendeuse", precision: PRECISION },
    });
    expect(versBrut(jet)).toEqual(brut);
  });

  it("part dans `PUT /cv/me/chapters/identity`, et s'efface par `null`", async () => {
    mockPut.mockResolvedValue(
      cvBrut({ first_name: "Awa", last_name: "Diallo", headline: null }),
    );
    await modifierSection("identity", {
      chapitre: "identity",
      donnees: { prenom: "Awa", nom: "Diallo", titre: null, precision: PRECISION },
    });
    expect(mockPut).toHaveBeenLastCalledWith("/cv/me/chapters/identity", {
      data: {
        first_name: "Awa",
        last_name: "Diallo",
        headline: null,
        availability: PRECISION,
      },
    });
    await modifierSection("identity", {
      chapitre: "identity",
      donnees: { prenom: "Awa", nom: "Diallo", titre: null, precision: null },
    });
    expect(mockPut).toHaveBeenLastCalledWith("/cv/me/chapters/identity", {
      data: {
        first_name: "Awa",
        last_name: "Diallo",
        headline: null,
        availability: null,
      },
    });
  });
});
