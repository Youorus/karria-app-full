/**
 * Le téléchargement d'un export, hors ligne (`telechargement.ts`).
 *
 * `File.downloadFileAsync` n'a pas de délai maximal : sans aucun réseau, on
 * ne le lance pas, et l'appelant reçoit tout de suite l'erreur réseau qu'il
 * sait déjà dire.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { noterAppareil, reinitialiserConnexion } from "@/lib/etat-connexion";
import { ErreurApi } from "@/lib/http";

import { telechargerFichier } from "./telechargement";

const mockTelecharger =
  jest.fn<(url: string, destination: unknown) => Promise<unknown>>();

jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(...morceaux: unknown[]) {
      this.uri = `file:///${morceaux.map(String).join("/")}`;
    }
  }
  class File {
    static downloadFileAsync = (url: string, destination: unknown) =>
      mockTelecharger(url, destination);
  }
  return { Directory, File, Paths: { cache: "cache" } };
});
jest.mock("expo-sharing", () => ({}));
jest.mock("@/lib/config", () => ({
  API_URL: "https://api.test/api/v1",
  SIMULATION: false,
}));
jest.mock("./brouillon-atelier", () => ({
  fichierDExport: (nom: string) => ({ uri: `file:///cache/atelier/exports/${nom}` }),
  supprimerExport: jest.fn(),
}));

const URL_EXPORT = "https://storage.test/exports/cv.pdf";
const NOM = "CV - Awa Diallo.pdf";

beforeEach(() => {
  reinitialiserConnexion();
  mockTelecharger.mockReset();
  mockTelecharger.mockResolvedValue({ uri: "file:///cache/atelier/exports/cv.pdf" });
});

afterEach(() => reinitialiserConnexion());

describe("Télécharger un export", () => {
  it("sans aucun réseau : rien ne part, l'erreur réseau tout de suite", async () => {
    noterAppareil("sans-reseau");
    const echec = await telechargerFichier(URL_EXPORT, NOM, "pdf").catch(
      (cause: unknown) => cause,
    );
    expect(echec).toBeInstanceOf(ErreurApi);
    expect((echec as ErreurApi).estReseau).toBe(true);
    expect(mockTelecharger).not.toHaveBeenCalled();
  });

  it("en ligne : le téléchargement part", async () => {
    noterAppareil("en-ligne");
    await telechargerFichier(URL_EXPORT, NOM, "pdf");
    expect(mockTelecharger).toHaveBeenCalledTimes(1);
    expect(mockTelecharger.mock.calls[0]?.[0]).toBe(URL_EXPORT);
  });
});
