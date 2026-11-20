/**
 * Les recherches enregistrées (`recherches-enregistrees.api.ts`) : la
 * traduction brut → app sur la forme exacte de `GET /search/saved`
 * (`docs/contrat-api-recherche.md`), et les trois appels tels qu'ils
 * partent.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { RechercheEnregistreeBrute } from "../types/recherches-enregistrees.types";
import {
  lireRecherchesEnregistrees,
  reglerAlertesDeRecherche,
  supprimerRechercheEnregistree,
  versRechercheEnregistree,
  versRecherchesEnregistrees,
} from "./recherches-enregistrees.api";

const mockGet = jest.fn<(chemin: string) => Promise<unknown>>();
const mockPut = jest.fn<(chemin: string, corps: unknown) => Promise<unknown>>();
const mockDelete = jest.fn<(chemin: string) => Promise<unknown>>();

jest.mock("@/lib/http", () => ({
  http: {
    get: (chemin: string) => mockGet(chemin),
    put: (chemin: string, corps: unknown) => mockPut(chemin, corps),
    delete: (chemin: string) => mockDelete(chemin),
  },
}));

const ID = "0b7e6c1a-52f4-4d0e-9a51-6a2f4f1d9c11";

const brute: RechercheEnregistreeBrute = {
  id: ID,
  summary: "Serveur · Paris (30 km) · CDI",
  query: "un poste de serveur à Paris en CDI",
  job_titles: ["Serveur"],
  location_label: "Paris",
  whole_france: false,
  contract_types: ["cdi"],
  alerts_enabled: true,
  is_current: true,
  created_at: "2026-11-18T09:00:00Z",
  last_used_at: "2026-11-20T08:30:00Z",
  last_alert_at: null,
};

beforeEach(() => {
  mockGet.mockReset();
  mockPut.mockReset();
  mockDelete.mockReset();
});

describe("La traduction d'une recherche enregistrée", () => {
  it("rend chaque champ du serveur sous son nom français", () => {
    expect(versRechercheEnregistree(brute)).toEqual({
      id: ID,
      resume: "Serveur · Paris (30 km) · CDI",
      demande: "un poste de serveur à Paris en CDI",
      metiers: ["Serveur"],
      lieu: "Paris",
      touteLaFrance: false,
      contrats: ["cdi"],
      alertes: true,
      enCours: true,
      creeeLe: "2026-11-18T09:00:00Z",
      utiliseeLe: "2026-11-20T08:30:00Z",
      derniereAlerteLe: null,
    });
  });

  it("garde `null` pour la France entière et la date de la dernière alerte", () => {
    const traduite = versRechercheEnregistree({
      ...brute,
      location_label: null,
      whole_france: true,
      alerts_enabled: false,
      is_current: false,
      last_alert_at: "2026-11-19T07:00:00Z",
    });
    expect(traduite.lieu).toBeNull();
    expect(traduite.touteLaFrance).toBe(true);
    expect(traduite.alertes).toBe(false);
    expect(traduite.enCours).toBe(false);
    expect(traduite.derniereAlerteLe).toBe("2026-11-19T07:00:00Z");
  });

  it("garde l'ordre du serveur et son plafond", () => {
    const liste = versRecherchesEnregistrees({
      items: [brute, { ...brute, id: "autre", is_current: false }],
      max: 10,
    });
    expect(liste.recherches.map((r) => r.id)).toEqual([ID, "autre"]);
    expect(liste.maximum).toBe(10);
    expect(versRecherchesEnregistrees({ items: [], max: 10 })).toEqual({
      recherches: [],
      maximum: 10,
    });
  });
});

describe("Les appels", () => {
  it("lit `GET /search/saved`", async () => {
    mockGet.mockResolvedValue({ items: [brute], max: 10 });
    const liste = await lireRecherchesEnregistrees();
    expect(mockGet).toHaveBeenCalledWith("/search/saved");
    expect(liste.recherches[0]!.resume).toBe("Serveur · Paris (30 km) · CDI");
  });

  it("bascule par `PUT /search/saved/{id}/alerts` et rend la recherche à jour", async () => {
    mockPut.mockResolvedValue({ ...brute, alerts_enabled: false });
    const aJour = await reglerAlertesDeRecherche(ID, false);
    expect(mockPut).toHaveBeenCalledWith(`/search/saved/${ID}/alerts`, {
      enabled: false,
    });
    expect(aJour.alertes).toBe(false);
  });

  it("supprime par `DELETE /search/saved/{id}`", async () => {
    mockDelete.mockResolvedValue(undefined);
    await supprimerRechercheEnregistree(ID);
    expect(mockDelete).toHaveBeenCalledWith(`/search/saved/${ID}`);
  });
});
