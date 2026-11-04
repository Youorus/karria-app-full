/**
 * La configuration de visibilité du fil ne change jamais d'identité
 * (`use-visibilite-stable.ts`) — sinon `FlatList` lève un invariant, et
 * l'application devient noire.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import type { ViewToken } from "react-native";

import { useVisibiliteStable } from "./use-visibilite-stable";

function jeton(id: string): ViewToken<{ id: string }> {
  return { item: { id }, key: id, index: 0, isViewable: true };
}

describe("useVisibiliteStable", () => {
  it("garde la même paire quand le rappel change, et appelle le rappel courant", () => {
    const premier = jest.fn<(v: ViewToken<{ id: string }>[]) => void>();
    const second = jest.fn<(v: ViewToken<{ id: string }>[]) => void>();
    const { result, rerender } = renderHook(
      (props: { signaler: (v: ViewToken<{ id: string }>[]) => void }) =>
        useVisibiliteStable<{ id: string }>(props.signaler),
      { initialProps: { signaler: premier } },
    );
    const paires = result.current;

    rerender({ signaler: second });

    expect(result.current).toBe(paires);
    const rappel = paires[0]?.onViewableItemsChanged;
    expect(rappel).toBeDefined();
    rappel?.({ viewableItems: [jeton("a")], changed: [] });
    expect(premier).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith([jeton("a")]);
  });

  it("exige 60 % de la carte pendant 400 ms", () => {
    const { result } = renderHook(() =>
      useVisibiliteStable<{ id: string }>(() => undefined),
    );
    expect(result.current[0]?.viewabilityConfig).toEqual({
      itemVisiblePercentThreshold: 60,
      minimumViewTime: 400,
    });
  });
});
