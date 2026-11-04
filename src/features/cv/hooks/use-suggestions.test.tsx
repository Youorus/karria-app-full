/**
 * Les suggestions à la saisie (`use-suggestions.ts`) : un appel après 200 ms
 * de calme, jamais pour un champ vide ou inactif, et une réponse en retard
 * n'écrase pas la dernière.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { TypeSuggestion } from "../types/cv.types";
import {
  DELAI_SUGGESTIONS_MS,
  useSuggestions,
  type Suggestions,
} from "./use-suggestions";

const mockLire = jest.fn<(kind: TypeSuggestion, q: string) => Promise<string[]>>();

jest.mock("../api/cv.api", () => ({
  lireSuggestions: (kind: TypeSuggestion, q: string) => mockLire(kind, q),
}));

describe("useSuggestions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockLire.mockReset();
  });

  it("attend 200 ms de calme, puis appelle une seule fois avec la saisie", async () => {
    mockLire.mockResolvedValue(["Paris", "Pau"]);
    const { result, rerender } = renderHook<Suggestions, { texte: string }>(
      ({ texte }) => useSuggestions("city", texte, true),
      { initialProps: { texte: "p" } },
    );
    rerender({ texte: "pa" });
    rerender({ texte: "par " });
    act(() => jest.advanceTimersByTime(DELAI_SUGGESTIONS_MS - 1));
    expect(mockLire).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    await waitFor(() => expect(result.current.suggestions).toEqual(["Paris", "Pau"]));
    expect(mockLire).toHaveBeenCalledTimes(1);
    expect(mockLire).toHaveBeenCalledWith("city", "par");
  });

  it("n'appelle pas pour un champ vide ni inactif, et vide la liste", async () => {
    mockLire.mockResolvedValue(["Paris"]);
    const { result, rerender } = renderHook<
      Suggestions,
      { texte: string; actif: boolean }
    >(({ texte, actif }) => useSuggestions("city", texte, actif), {
      initialProps: { texte: "pa", actif: true },
    });
    act(() => jest.advanceTimersByTime(DELAI_SUGGESTIONS_MS));
    await waitFor(() => expect(result.current.suggestions).toEqual(["Paris"]));

    rerender({ texte: "pa", actif: false });
    expect(result.current.suggestions).toEqual([]);
    rerender({ texte: "  ", actif: true });
    act(() => jest.advanceTimersByTime(DELAI_SUGGESTIONS_MS));
    expect(mockLire).toHaveBeenCalledTimes(1);
    expect(result.current.suggestions).toEqual([]);
  });

  it("ignore une réponse plus ancienne que la dernière demande", async () => {
    let repondreLent: (v: string[]) => void = () => undefined;
    mockLire.mockImplementationOnce(
      () =>
        new Promise<string[]>((resolve) => {
          repondreLent = resolve;
        }),
    );
    mockLire.mockResolvedValueOnce(["Lyon"]);
    const { result, rerender } = renderHook<Suggestions, { texte: string }>(
      ({ texte }) => useSuggestions("city", texte, true),
      { initialProps: { texte: "l" } },
    );
    act(() => jest.advanceTimersByTime(DELAI_SUGGESTIONS_MS));
    rerender({ texte: "ly" });
    act(() => jest.advanceTimersByTime(DELAI_SUGGESTIONS_MS));
    await waitFor(() => expect(result.current.suggestions).toEqual(["Lyon"]));

    await act(async () => {
      repondreLent(["Lille", "Le Mans"]);
      await Promise.resolve();
    });
    expect(result.current.suggestions).toEqual(["Lyon"]);
  });

  it("se tait en cas de panne : liste vide, pas d'erreur affichée", async () => {
    mockLire.mockRejectedValue(new Error("réseau"));
    const { result } = renderHook(() => useSuggestions("skill", "exc", true));
    act(() => jest.advanceTimersByTime(DELAI_SUGGESTIONS_MS));

    await waitFor(() => expect(result.current.enCours).toBe(false));
    expect(result.current.suggestions).toEqual([]);
  });
});
