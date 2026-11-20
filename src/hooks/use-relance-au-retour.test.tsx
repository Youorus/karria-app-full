/**
 * La relance au retour de la connexion (`use-relance-au-retour.ts`).
 *
 * Ce que ces tests protègent : un écran resté en erreur se relit seul quand
 * la connexion revient ; un écran qui a ses données ne redemande rien ; et
 * rien ne part au montage.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { ECART_RELANCES_MS } from "@/lib/connexion";
import { noterAppareil, reinitialiserConnexion } from "@/lib/etat-connexion";

import { useRelanceAuRetour } from "./use-relance-au-retour";

function coupurePuisRetour() {
  act(() => noterAppareil("sans-reseau"));
  act(() => noterAppareil("en-ligne"));
}

beforeEach(() => {
  jest.useFakeTimers();
  reinitialiserConnexion();
  noterAppareil("en-ligne");
  jest.advanceTimersByTime(ECART_RELANCES_MS);
});

afterEach(() => {
  reinitialiserConnexion();
  jest.useRealTimers();
});

describe("La relance au retour de la connexion", () => {
  it("relance un écran resté en panne, une fois", () => {
    const relancer = jest.fn();
    renderHook(() => useRelanceAuRetour(true, relancer));
    expect(relancer).not.toHaveBeenCalled();

    coupurePuisRetour();
    expect(relancer).toHaveBeenCalledTimes(1);
  });

  it("ne relance pas un écran qui a ses données", () => {
    const relancer = jest.fn();
    renderHook(() => useRelanceAuRetour(false, relancer));
    coupurePuisRetour();
    expect(relancer).not.toHaveBeenCalled();
  });

  it("lit l'état de l'écran au moment du retour, pas au montage", () => {
    const relancer = jest.fn();
    const { rerender } = renderHook(
      ({ enPanne }: { enPanne: boolean }) => useRelanceAuRetour(enPanne, relancer),
      { initialProps: { enPanne: false } },
    );
    rerender({ enPanne: true });
    expect(relancer).not.toHaveBeenCalled();
    coupurePuisRetour();
    expect(relancer).toHaveBeenCalledTimes(1);
  });

  it("un réseau qui va et vient ne relance pas à chaque battement", () => {
    const relancer = jest.fn();
    renderHook(() => useRelanceAuRetour(true, relancer));
    coupurePuisRetour();
    coupurePuisRetour();
    coupurePuisRetour();
    expect(relancer).toHaveBeenCalledTimes(1);

    act(() => jest.advanceTimersByTime(ECART_RELANCES_MS));
    coupurePuisRetour();
    expect(relancer).toHaveBeenCalledTimes(2);
  });

  it("ne relance pas quand un état instable est seulement oublié", () => {
    const relancer = jest.fn();
    renderHook(() => useRelanceAuRetour(true, relancer));
    act(() => noterAppareil("sans-internet"));
    act(() => noterAppareil("sans-reseau"));
    expect(relancer).not.toHaveBeenCalled();
  });
});
