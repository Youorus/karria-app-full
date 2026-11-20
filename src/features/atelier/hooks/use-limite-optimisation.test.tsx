import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";

import { useLimiteOptimisation } from "./use-limite-optimisation";

const mockPousser = jest.fn();
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: mockPousser }),
}));

const mockAcheter = jest.fn<() => Promise<"livre" | "non_confirme" | "echec">>();
jest.mock("@/features/soutien/services/achat-direct", () => ({
  acheterSansPub: () => mockAcheter(),
}));

const mockOffre =
  jest.fn<() => Promise<{ ouverte: boolean; prixCentimes: number | null }>>();
jest.mock("@/features/soutien/services/offre-disponible", () => ({
  offreSansPub: () => mockOffre(),
}));

function limite(abonne = false): ErreurApi {
  return new ErreurApi("Limite atteinte", 429, "optimization_quota_exceeded", undefined, {
    limit: 3,
    subscriber: abonne,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockOffre.mockResolvedValue({ ouverte: true, prixCentimes: 499 });
});

describe("La limite des optimisations pour les ATS", () => {
  it("à la quatrième, la feuille propose l'abonnement avec son prix", async () => {
    const { result } = renderHook(() => useLimiteOptimisation(jest.fn()));
    let prise = false;
    await act(async () => {
      prise = await result.current.signaler(limite());
    });
    expect(prise).toBe(true);
    expect(result.current.proposition.visible).toBe(true);
    expect(result.current.proposition.textes.accepter).toBe(
      "Optimiser sans limite — 4,99 €/mois",
    );
    expect(result.current.proposition.textes.texte).toContain("3 optimisations du mois");
  });

  it("le bouton ouvre le paiement ; abonnée, l'optimisation repart seule", async () => {
    mockAcheter.mockResolvedValue("livre");
    const relancer = jest.fn();
    const { result } = renderHook(() => useLimiteOptimisation(relancer));
    await act(async () => {
      await result.current.signaler(limite());
    });
    act(() => result.current.proposition.accepter());
    expect(result.current.proposition.visible).toBe(false);
    expect(mockAcheter).not.toHaveBeenCalled();
    await act(async () => result.current.proposition.apresFermeture());
    expect(mockAcheter).toHaveBeenCalledTimes(1);
    expect(relancer).toHaveBeenCalledTimes(1);
  });

  it("une autre erreur, un abonné, ou une offre fermée : rien n'est proposé", async () => {
    const { result } = renderHook(() => useLimiteOptimisation(jest.fn()));
    await act(async () => {
      expect(await result.current.signaler(new Error("panne"))).toBe(false);
      expect(await result.current.signaler(limite(true))).toBe(false);
    });
    mockOffre.mockResolvedValue({ ouverte: false, prixCentimes: null });
    await act(async () => {
      expect(await result.current.signaler(limite())).toBe(false);
    });
    expect(result.current.proposition.visible).toBe(false);
  });
});
