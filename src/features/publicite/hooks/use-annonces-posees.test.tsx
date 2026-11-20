import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { useAnnoncesPosees } from "./use-annonces-posees";

const REGLE = { intervalle: 7, plafond: 8 };

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("Les annonces posées dans le fil", () => {
  it("une annonce arrivée pendant le défilement n'entre qu'à l'arrêt", () => {
    const vide: ReadonlyMap<number, string> = new Map();
    const { result, rerender } = renderHook(
      (pretes: ReadonlyMap<number, string>) => useAnnoncesPosees(pretes, REGLE),
      { initialProps: vide },
    );
    act(() => result.current.debutGlisse());
    rerender(new Map([[0, "a"]]));
    expect(result.current.annonces.size).toBe(0);

    // Le doigt se lève, un élan suit : toujours rien.
    act(() => result.current.finGlisse());
    act(() => result.current.debutElan());
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.annonces.size).toBe(0);

    act(() => result.current.finElan());
    expect(result.current.annonces.get(0)).toBe("a");
  });

  it("doigt levé sans élan : la liste est tenue pour arrêtée peu après", () => {
    const vide: ReadonlyMap<number, string> = new Map();
    const { result, rerender } = renderHook(
      (pretes: ReadonlyMap<number, string>) => useAnnoncesPosees(pretes, REGLE),
      { initialProps: vide },
    );
    act(() => result.current.debutGlisse());
    rerender(new Map([[0, "a"]]));
    act(() => result.current.finGlisse());
    expect(result.current.annonces.size).toBe(0);
    act(() => jest.advanceTimersByTime(300));
    expect(result.current.annonces.get(0)).toBe("a");
  });

  it("à l'arrêt, une annonce dont la place est déjà à l'écran attend la remontée", () => {
    const vide: ReadonlyMap<number, string> = new Map();
    const { result, rerender } = renderHook(
      (pretes: ReadonlyMap<number, string>) => useAnnoncesPosees(pretes, REGLE),
      { initialProps: vide },
    );
    act(() => result.current.noterVisibles(12));
    rerender(new Map([[0, "a"]]));
    expect(result.current.annonces.size).toBe(0);

    act(() => result.current.debutGlisse());
    act(() => result.current.noterVisibles(3));
    act(() => result.current.finElan());
    expect(result.current.annonces.get(0)).toBe("a");
  });
});
