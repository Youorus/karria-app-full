/**
 * L'annonce d'un emplacement (`use-annonce-emplacement.ts`) : chargée en
 * arrière-plan, montrée seulement au calme tactile, comptée à l'impression,
 * détruite en partant, jamais pour une personne sans pub.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { poserSansPub } from "@/lib/sans-pub";

import {
  CALME_MS,
  noterFinDeToucher,
  noterToucher,
  oublierLesTouchersPourLesTests,
} from "../services/calme-tactile";
import { CALME_PAR_EMPLACEMENT, useAnnonceEmplacement } from "./use-annonce-emplacement";

/** Un toucher bref : posé et levé. */
function taper() {
  noterToucher(Date.now());
  noterFinDeToucher(Date.now());
}

interface FausseAnnonce {
  destroy: jest.Mock;
  addAdEventListener: jest.Mock<(type: string, rappel: () => void) => void>;
  ecouteurs: Record<string, () => void>;
}

function fausseAnnonce(): FausseAnnonce {
  const ecouteurs: Record<string, () => void> = {};
  return {
    ecouteurs,
    destroy: jest.fn(),
    addAdEventListener: jest.fn((type: string, rappel: () => void) => {
      ecouteurs[type] = rappel;
    }),
  };
}

const mockCharger = jest.fn<() => Promise<FausseAnnonce | null>>();
jest.mock("../api/publicite.api", () => ({
  chargerAnnonce: () => mockCharger(),
}));
jest.mock("./reserve-annonces", () => ({
  demarrer: () => Promise.resolve({ peutDemander: true, personnalisees: false }),
}));
const mockCompter = jest.fn<(e: string) => void>();
jest.mock("../services/journal-impressions", () => ({
  compterImpression: (e: string) => mockCompter(e),
}));
jest.mock("react-native-google-mobile-ads", () => ({
  NativeAdEventType: { IMPRESSION: "impression" },
}));

/** Laisse les promesses du chargement se résoudre. */
async function laisserCharger() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("L'annonce d'un emplacement", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    oublierLesTouchersPourLesTests();
    poserSansPub(false);
    mockCharger.mockReset();
    mockCompter.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("montre l'annonce tout de suite quand personne n'a touché", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    const { result } = renderHook(() => useAnnonceEmplacement("galerie"));
    expect(result.current).toBeNull();
    await laisserCharger();
    expect(result.current).toBe(annonce);
  });

  it("attend deux secondes de calme après un toucher", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    taper();
    const { result } = renderHook(() => useAnnonceEmplacement("cv"));
    await laisserCharger();
    expect(result.current).toBeNull();
    act(() => jest.advanceTimersByTime(CALME_MS - 1));
    expect(result.current).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(annonce);
  });

  it("attend moins longtemps sur la fiche d'une offre, où l'arrivée est un toucher", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    taper();
    const { result } = renderHook(() => useAnnonceEmplacement("detail_offre"));
    await laisserCharger();
    expect(result.current).toBeNull();
    const calme = CALME_PAR_EMPLACEMENT.detail_offre ?? CALME_MS;
    expect(calme).toBeLessThan(CALME_MS);
    act(() => jest.advanceTimersByTime(calme - 1));
    expect(result.current).toBeNull();
    act(() => jest.advanceTimersByTime(1));
    expect(result.current).toBe(annonce);
  });

  it("ne paraît pas sous un doigt posé, même passé le délai", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    noterToucher(Date.now());
    const { result } = renderHook(() => useAnnonceEmplacement("detail_offre"));
    await laisserCharger();
    act(() => jest.advanceTimersByTime(CALME_MS * 2));
    expect(result.current).toBeNull();
    noterFinDeToucher(Date.now());
    act(() => jest.advanceTimersByTime(CALME_MS));
    expect(result.current).toBe(annonce);
  });

  it("repousse encore si l'on touche pendant l'attente", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    taper();
    const { result } = renderHook(() => useAnnonceEmplacement("cv"));
    await laisserCharger();
    act(() => jest.advanceTimersByTime(CALME_MS / 2));
    taper();
    act(() => jest.advanceTimersByTime(CALME_MS / 2));
    expect(result.current).toBeNull();
    act(() => jest.advanceTimersByTime(CALME_MS / 2));
    expect(result.current).toBe(annonce);
  });

  it("compte l'impression de l'emplacement sur l'événement du SDK", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    renderHook(() => useAnnonceEmplacement("attente_import"));
    await laisserCharger();
    act(() => annonce.ecouteurs.impression?.());
    expect(mockCompter).toHaveBeenCalledWith("attente_import");
  });

  it("détruit l'annonce en quittant l'écran", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    const { unmount } = renderHook(() => useAnnonceEmplacement("detail_offre"));
    await laisserCharger();
    unmount();
    expect(annonce.destroy).toHaveBeenCalledTimes(1);
  });

  it("ne demande rien tant que l'écran n'est pas actif, ni pour une personne sans pub", async () => {
    mockCharger.mockResolvedValue(fausseAnnonce());
    const { result, rerender } = renderHook(
      ({ actif }: { actif: boolean }) => useAnnonceEmplacement("cv", actif),
      { initialProps: { actif: false } },
    );
    await laisserCharger();
    expect(mockCharger).not.toHaveBeenCalled();
    expect(result.current).toBeNull();

    act(() => poserSansPub(true));
    rerender({ actif: true });
    await laisserCharger();
    expect(mockCharger).not.toHaveBeenCalled();
  });

  it("fait disparaître l'annonce dès que la personne passe sans pub", async () => {
    const annonce = fausseAnnonce();
    mockCharger.mockResolvedValue(annonce);
    const { result } = renderHook(() => useAnnonceEmplacement("galerie"));
    await laisserCharger();
    expect(result.current).toBe(annonce);
    act(() => poserSansPub(true));
    expect(result.current).toBeNull();
    expect(annonce.destroy).toHaveBeenCalled();
  });
});
