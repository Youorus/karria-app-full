/**
 * La porte de mise à jour (`use-porte-de-version.ts`) : ce que chaque
 * réponse du serveur produit, le « jamais bloquer sur une panne », la
 * bande une fois par jour, et la nouvelle demande au retour au premier plan.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, Linking } from "react-native";

import { ErreurApi } from "@/lib/http";

import { poserVersionConnue } from "../services/etat-version";
import { REVERIFICATION_MS, UN_JOUR_MS, type Version } from "../services/version";
import { usePorteDeVersion } from "./use-porte-de-version";

const mockLireVersion = jest.fn<(p: "ios" | "android", b: number) => Promise<Version>>();
jest.mock("../api/version.api", () => ({
  lireVersion: (p: "ios" | "android", b: number) => mockLireVersion(p, b),
}));

let mockBuild: string | null = "3";
jest.mock("expo-application", () => ({
  get nativeBuildVersion() {
    return mockBuild;
  },
}));

/** Le magasin local, en mémoire : la date de la dernière bande. */
const mockLocal = new Map<string, unknown>();
jest.mock("@/lib/magasin-local", () => ({
  lireLocal: (cle: string, parDefaut: unknown) =>
    Promise.resolve(mockLocal.has(cle) ? mockLocal.get(cle) : parDefaut),
  ecrireLocal: (cle: string, valeur: unknown) => {
    mockLocal.set(cle, valeur);
    return Promise.resolve();
  },
  estUnNombre: (v: unknown) => typeof v === "number",
}));

const STORE = "https://apps.apple.com/fr/app/karria/id1";
const reponse = (etat: Version["etat"], urlStore: string | null = STORE): Version => ({
  etat,
  derniereBuild: 9,
  buildMinimale: 2,
  derniereVersion: "1.1.0",
  urlStore,
});

let surChangement: (etat: string) => void = () => undefined;

describe("La porte de mise à jour", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-11-05T10:00:00Z"));
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, rappel) => {
      surChangement = rappel as (etat: string) => void;
      return { remove: jest.fn() };
    });
    jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    mockLireVersion.mockReset();
    mockLocal.clear();
    mockBuild = "3";
    poserVersionConnue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("demande avec la plateforme et le numéro de build, et ne montre rien pour « ok »", async () => {
    mockLireVersion.mockResolvedValue(reponse("ok"));
    const { result } = renderHook(() => usePorteDeVersion());
    await waitFor(() => expect(mockLireVersion).toHaveBeenCalledWith("ios", 3));
    expect(result.current.etat).toBe("ok");
    expect(result.current.bande).toBe(false);
  });

  it("bloque pour « requise », et le bouton ouvre le magasin", async () => {
    mockLireVersion.mockResolvedValue(reponse("requise"));
    const { result } = renderHook(() => usePorteDeVersion());
    await waitFor(() => expect(result.current.etat).toBe("requise"));
    act(() => result.current.ouvrirStore());
    expect(Linking.openURL).toHaveBeenCalledWith(STORE);
  });

  it("montre la bande pour « disponible », et retient la date", async () => {
    mockLireVersion.mockResolvedValue(reponse("disponible"));
    const { result } = renderHook(() => usePorteDeVersion());
    await waitFor(() => expect(result.current.bande).toBe(true));
    expect(mockLocal.get("karria.version.bande")).toBe(Date.now());
    act(() => result.current.fermerBande());
    expect(result.current.bande).toBe(false);
    expect(result.current.etat).toBe("disponible");
  });

  it("ne remontre pas la bande le même jour", async () => {
    mockLocal.set("karria.version.bande", Date.now() - UN_JOUR_MS / 2);
    mockLireVersion.mockResolvedValue(reponse("disponible"));
    const { result } = renderHook(() => usePorteDeVersion());
    await waitFor(() => expect(result.current.etat).toBe("disponible"));
    expect(result.current.bande).toBe(false);
  });

  it("laisse entrer quand la route est injoignable", async () => {
    mockLireVersion.mockRejectedValue(new ErreurApi("Introuvable.", 404));
    const { result } = renderHook(() => usePorteDeVersion());
    await waitFor(() => expect(mockLireVersion).toHaveBeenCalled());
    expect(result.current.etat).toBe("ok");
    expect(result.current.bande).toBe(false);
  });

  it("ne demande rien quand le numéro de build est illisible", async () => {
    mockBuild = null;
    const { result } = renderHook(() => usePorteDeVersion());
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockLireVersion).not.toHaveBeenCalled();
    expect(result.current.etat).toBe("ok");
  });

  it("redemande au retour au premier plan après six heures, pas avant", async () => {
    mockLireVersion.mockResolvedValue(reponse("ok"));
    renderHook(() => usePorteDeVersion());
    await waitFor(() => expect(mockLireVersion).toHaveBeenCalledTimes(1));

    jest.setSystemTime(Date.now() + REVERIFICATION_MS / 2);
    act(() => surChangement("active"));
    expect(mockLireVersion).toHaveBeenCalledTimes(1);

    jest.setSystemTime(Date.now() + REVERIFICATION_MS);
    act(() => surChangement("active"));
    await waitFor(() => expect(mockLireVersion).toHaveBeenCalledTimes(2));
  });
});
