/**
 * Les mises à jour EAS (`use-mise-a-jour.ts`), `expo-updates` simulé : la
 * bande n'apparaît qu'après un long moment, se ferme pour de bon, « Relancer »
 * recharge, et le retour au premier plan après six heures va revoir.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import { REVERIFICATION_MS } from "../services/version";
import { DELAI_BANDE_MS, useMiseAJour } from "./use-mise-a-jour";

const etatUpdates = { isUpdatePending: false };
const mockCheck = jest.fn<() => Promise<{ isAvailable: boolean }>>();
const mockFetch = jest.fn<() => Promise<unknown>>();
const mockReload = jest.fn<() => Promise<void>>();

jest.mock("expo-updates", () => ({
  isEnabled: true,
  useUpdates: () => etatUpdates,
  checkForUpdateAsync: () => mockCheck(),
  fetchUpdateAsync: () => mockFetch(),
  reloadAsync: () => mockReload(),
}));

let surChangement: (etat: string) => void = () => undefined;

describe("Les mises à jour toutes seules", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, rappel) => {
      surChangement = rappel as (etat: string) => void;
      return { remove: jest.fn() };
    });
    etatUpdates.isUpdatePending = false;
    mockCheck.mockReset();
    mockFetch.mockReset();
    mockReload.mockReset();
    mockReload.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("ne montre rien tant qu'aucune mise à jour n'est téléchargée", () => {
    const { result } = renderHook(() => useMiseAJour());
    act(() => jest.advanceTimersByTime(DELAI_BANDE_MS * 2));
    expect(result.current.prete).toBe(false);
    expect(result.current.bande).toBe(false);
  });

  it("montre la bande seulement si l'application reste ouverte longtemps", () => {
    etatUpdates.isUpdatePending = true;
    const { result } = renderHook(() => useMiseAJour());
    expect(result.current.prete).toBe(true);
    expect(result.current.bande).toBe(false);
    act(() => jest.advanceTimersByTime(DELAI_BANDE_MS - 1));
    expect(result.current.bande).toBe(false);
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.bande).toBe(true);
  });

  it("« Relancer » applique la mise à jour", () => {
    etatUpdates.isUpdatePending = true;
    const { result } = renderHook(() => useMiseAJour());
    act(() => jest.advanceTimersByTime(DELAI_BANDE_MS));
    act(() => result.current.relancer());
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("fermer la bande, c'est pour la session", () => {
    etatUpdates.isUpdatePending = true;
    const { result, rerender } = renderHook(() => useMiseAJour());
    act(() => jest.advanceTimersByTime(DELAI_BANDE_MS));
    act(() => result.current.fermerBande());
    expect(result.current.bande).toBe(false);
    rerender(undefined);
    act(() => jest.advanceTimersByTime(DELAI_BANDE_MS));
    expect(result.current.bande).toBe(false);
  });

  it("revérifie et télécharge au retour au premier plan après six heures", async () => {
    mockCheck.mockResolvedValue({ isAvailable: true });
    mockFetch.mockResolvedValue({});
    renderHook(() => useMiseAJour());

    act(() => surChangement("active"));
    expect(mockCheck).not.toHaveBeenCalled();

    jest.setSystemTime(Date.now() + REVERIFICATION_MS);
    act(() => surChangement("active"));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
  });

  it("ne télécharge rien quand rien n'est disponible", async () => {
    mockCheck.mockResolvedValue({ isAvailable: false });
    renderHook(() => useMiseAJour());
    jest.setSystemTime(Date.now() + REVERIFICATION_MS);
    act(() => surChangement("active"));
    await waitFor(() => expect(mockCheck).toHaveBeenCalledTimes(1));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
