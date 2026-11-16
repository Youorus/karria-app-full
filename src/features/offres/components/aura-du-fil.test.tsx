/**
 * L'aura du fil (`aura-du-fil.tsx`) : l'écran la suspend et la relance par
 * une référence, sans se redessiner lui-même.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { act, render } from "@testing-library/react-native";
import { createRef } from "react";

import { AuraDuFil, type PiloteAura } from "./aura-du-fil";

const visibles: boolean[] = [];
jest.mock("@/components/aura", () => ({
  Aura: ({ visible }: { visible: boolean }) => {
    visibles.push(visible);
    return null;
  },
}));

describe("L'aura du fil", () => {
  it("s'arrête au geste, attend l'inertie, puis repart", () => {
    jest.useFakeTimers();
    const pilote = createRef<PiloteAura>();
    render(<AuraDuFil ref={pilote} visible />);
    expect(visibles.at(-1)).toBe(true);

    act(() => pilote.current?.suspendre());
    expect(visibles.at(-1)).toBe(false);

    act(() => pilote.current?.relacher());
    expect(visibles.at(-1)).toBe(false);
    act(() => jest.advanceTimersByTime(150));
    expect(visibles.at(-1)).toBe(true);

    act(() => pilote.current?.suspendre());
    act(() => pilote.current?.reprendre());
    expect(visibles.at(-1)).toBe(true);
    jest.useRealTimers();
  });

  it("reste éteinte quand un panneau couvre le fond", () => {
    render(<AuraDuFil visible={false} />);
    expect(visibles.at(-1)).toBe(false);
  });
});
