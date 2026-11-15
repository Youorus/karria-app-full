import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AccessibilityInfo, AppState, type AppStateStatus } from "react-native";

import { useAnimationActive } from "./use-qualite-visuelle";

jest.mock("react-native-reanimated", () => ({ useReducedMotion: () => false }));

let mockEcranActif = true;
jest.mock("expo-router", () => ({ useIsFocused: () => mockEcranActif }));

describe("Animation de l’aura", () => {
  const etatInitial = AppState.currentState;
  beforeEach(() => {
    AppState.currentState = "active";
    mockEcranActif = true;
  });
  afterEach(() => {
    AppState.currentState = etatInitial;
  });

  it("suspend l’animation dès que le fond est masqué, quitte l’écran ou passe en arrière-plan", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    let etatApp: (etat: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, "addEventListener").mockImplementation((_evenement, rappel) => {
      etatApp = rappel as (etat: AppStateStatus) => void;
      return { remove: jest.fn() };
    });

    const { result, rerender } = renderHook(useAnimationActive, { initialProps: false });
    await act(async () => {});
    expect(result.current).toBe(false);
    rerender(true);
    expect(result.current).toBe(true);
    mockEcranActif = false;
    rerender(true);
    expect(result.current).toBe(false);
    mockEcranActif = true;
    rerender(true);
    act(() => etatApp("background"));
    expect(result.current).toBe(false);
    act(() => etatApp("active"));
    expect(result.current).toBe(true);
  });

  it("applique immédiatement le réglage de mouvement réduit, même si sa lecture initiale arrive en retard", async () => {
    let terminerLecture: (reduit: boolean) => void = () => undefined;
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockReturnValue(
      new Promise((resolve) => {
        terminerLecture = resolve;
      }),
    );
    let changerMouvement: (reduit: boolean) => void = () => undefined;
    const remove = jest.fn();
    // L'API a deux surcharges. Ici seule la surcharge booléenne est appelée.
    jest
      .spyOn(AccessibilityInfo, "addEventListener")
      .mockImplementation((_evenement, rappel) => {
        changerMouvement = (reduit) => Reflect.apply(rappel, undefined, [reduit]);
        return { remove } as unknown as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });

    const { result, unmount } = renderHook(useAnimationActive, { initialProps: true });
    act(() => changerMouvement(true));
    expect(result.current).toBe(false);
    await act(async () => terminerLecture(false));
    expect(result.current).toBe(false);
    act(() => changerMouvement(false));
    expect(result.current).toBe(true);
    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
