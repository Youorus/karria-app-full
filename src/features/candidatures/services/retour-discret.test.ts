/**
 * Le retour discret (`retour-discret.ts`) : une phrase posée, lue, puis
 * effacée — et les abonnés prévenus.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import {
  effacerRetourDiscret,
  poserRetourDiscret,
  useRetourDiscret,
} from "./retour-discret";

describe("Le retour discret", () => {
  it("est vide, puis dit la phrase posée, puis s'efface", () => {
    effacerRetourDiscret();
    const { result } = renderHook(() => useRetourDiscret());
    expect(result.current).toBeNull();
    act(() => poserRetourDiscret("C'est noté."));
    expect(result.current).toBe("C'est noté.");
    act(() => effacerRetourDiscret());
    expect(result.current).toBeNull();
  });

  it("ne réveille personne quand il n'y a rien à effacer", () => {
    effacerRetourDiscret();
    const rendu = jest.fn(() => useRetourDiscret());
    renderHook(rendu);
    const rendus = rendu.mock.calls.length;
    act(() => effacerRetourDiscret());
    expect(rendu.mock.calls.length).toBe(rendus);
  });
});
