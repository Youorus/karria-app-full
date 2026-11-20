/**
 * Les portraits du mois (`use-portraits.ts`) : le compteur, et la
 * proposition d'abonnement quand le quota est atteint — une fois par
 * lancement à l'ouverture, sur un refus du serveur, jamais pour un abonné
 * ni là où le paiement est coupé.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";

import type { QuotaPortraits } from "../types/cv.types";
import { oublierPropositionPortraits, usePortraits } from "./use-portraits";

const mockPousser = jest.fn();

const mockAcheter = jest.fn<() => Promise<"livre" | "non_confirme" | "echec">>();
jest.mock("@/features/soutien/services/achat-direct", () => ({
  acheterSansPub: () => mockAcheter(),
}));
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: mockPousser }),
}));

const mockQuota = jest.fn<() => Promise<QuotaPortraits>>();
jest.mock("../api/cv.api", () => ({
  lireQuotaPortraits: () => mockQuota(),
}));

const mockOffre =
  jest.fn<() => Promise<{ ouverte: boolean; prixCentimes: number | null }>>();
jest.mock("@/features/soutien/services/offre-disponible", () => ({
  offreSansPub: () => mockOffre(),
}));

function quota(partiel: Partial<QuotaPortraits> = {}): QuotaPortraits {
  return {
    abonne: false,
    limite: 3,
    utilises: 1,
    restants: 2,
    repartLe: "2026-12-01T00:00:00Z",
    ...partiel,
  };
}

const EPUISE = quota({ utilises: 3, restants: 0 });

function refus(subscriber: boolean): ErreurApi {
  return new ErreurApi(
    "Tu as utilisé tes 3 portraits du mois.",
    429,
    "portrait_quota_exceeded",
    undefined,
    { limit: 3, subscriber, resets_at: "2026-12-01T00:00:00Z" },
  );
}

describe("Les portraits du mois", () => {
  beforeEach(() => {
    oublierPropositionPortraits();
    mockPousser.mockReset();
    mockQuota.mockReset();
    mockQuota.mockResolvedValue(quota());
    mockOffre.mockReset();
    mockOffre.mockResolvedValue({ ouverte: true, prixCentimes: 499 });
  });

  it("tant qu'il en reste : le compteur, et aucune proposition", async () => {
    const { result } = renderHook(() => usePortraits());
    await waitFor(() =>
      expect(result.current.mention).toBe(
        "2 portraits retravaillés restants ce mois-ci.",
      ),
    );
    expect(result.current.epuises).toBe(false);
    expect(result.current.proposition.visible).toBe(false);
    expect(mockOffre).not.toHaveBeenCalled();
  });

  it("quota atteint à l'ouverture : la proposition monte, avec ses mots et un bouton pour fermer", async () => {
    mockQuota.mockResolvedValue(EPUISE);
    const { result } = renderHook(() => usePortraits());
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    expect(result.current.epuises).toBe(true);
    expect(result.current.proposition.textes).toEqual({
      titre: "Limite atteinte",
      texte:
        "Tu as utilisé tes 3 portraits IA du mois. Karria sans pub lève la limite : 4,99 € par mois.",
      accepter: "Lever la limite — 4,99 €/mois",
      refuser: "Fermer",
    });
    act(() => result.current.proposition.fermer());
    expect(result.current.proposition.visible).toBe(false);
    act(() => result.current.proposition.apresFermeture());
    expect(mockPousser).not.toHaveBeenCalled();
  });

  it("une seule fois par lancement : rouvrir la photo ne re-sollicite pas", async () => {
    mockQuota.mockResolvedValue(EPUISE);
    const premier = renderHook(() => usePortraits());
    await waitFor(() => expect(premier.result.current.proposition.visible).toBe(true));
    premier.unmount();
    const second = renderHook(() => usePortraits());
    await waitFor(() => expect(second.result.current.epuises).toBe(true));
    await act(async () => {});
    expect(second.result.current.proposition.visible).toBe(false);
  });

  it("le bouton ferme, puis ouvre directement le paiement", async () => {
    mockAcheter.mockResolvedValue("livre");
    mockQuota.mockResolvedValue(EPUISE);
    const { result } = renderHook(() => usePortraits());
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    act(() => result.current.proposition.accepter());
    expect(result.current.proposition.visible).toBe(false);
    expect(mockAcheter).not.toHaveBeenCalled();
    await act(async () => result.current.proposition.apresFermeture());
    expect(mockAcheter).toHaveBeenCalledTimes(1);
    expect(mockPousser).not.toHaveBeenCalled();
  });

  it("le paiement n'a pas pu s'ouvrir : l'offre du profil prend le relais", async () => {
    mockAcheter.mockResolvedValue("echec");
    mockQuota.mockResolvedValue(EPUISE);
    const { result } = renderHook(() => usePortraits());
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    act(() => result.current.proposition.accepter());
    await act(async () => result.current.proposition.apresFermeture());
    expect(mockPousser).toHaveBeenCalledWith({
      pathname: "/profil",
      params: { offre: "sans-pub" },
    });
  });

  it("ne propose rien à un abonné, ni là où le paiement est coupé", async () => {
    mockQuota.mockResolvedValue(quota({ abonne: true, limite: 30, restants: 0 }));
    const abonne = renderHook(() => usePortraits());
    await waitFor(() => expect(abonne.result.current.epuises).toBe(true));
    await act(async () => {});
    expect(abonne.result.current.proposition.visible).toBe(false);
    expect(mockOffre).not.toHaveBeenCalled();
    abonne.unmount();

    mockQuota.mockResolvedValue(EPUISE);
    mockOffre.mockResolvedValue({ ouverte: false, prixCentimes: null });
    const coupe = renderHook(() => usePortraits());
    await waitFor(() => expect(mockOffre).toHaveBeenCalled());
    await act(async () => {});
    expect(coupe.result.current.proposition.visible).toBe(false);
    // Le compteur, lui, se lit toujours.
    expect(coupe.result.current.mention).toContain("Tu as utilisé tes 3 portraits");
  });

  it("le troisième portrait vient d'arriver : la relecture ne sollicite pas", async () => {
    const { result } = renderHook(() => usePortraits());
    await waitFor(() => expect(result.current.mention).not.toBeNull());
    mockQuota.mockResolvedValue(EPUISE);
    act(() => result.current.rafraichir());
    await waitFor(() => expect(result.current.epuises).toBe(true));
    await act(async () => {});
    expect(result.current.proposition.visible).toBe(false);
  });

  it("un refus `portrait_quota_exceeded` du serveur fait monter la proposition", async () => {
    // Le compteur n'a pas pu prévenir.
    mockQuota.mockRejectedValue(new ErreurApi("Hors ligne", 0));
    const { result } = renderHook(() => usePortraits());
    await act(async () => {});
    expect(result.current.mention).toBeNull();
    act(() => result.current.signalerRefus(refus(false)));
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    expect(result.current.proposition.textes.texte).toBe(
      "Tu as utilisé tes 3 portraits IA du mois. Karria sans pub lève la limite : 4,99 € par mois.",
    );
  });

  it("un autre refus, ou celui d'un abonné, ne propose rien", async () => {
    const { result } = renderHook(() => usePortraits());
    await waitFor(() => expect(result.current.mention).not.toBeNull());
    act(() => result.current.signalerRefus(refus(true)));
    act(() =>
      result.current.signalerRefus(
        new ErreurApi("Refusée", 422, "photo_enhance_refused"),
      ),
    );
    act(() => result.current.signalerRefus(new Error("réseau")));
    await act(async () => {});
    expect(result.current.proposition.visible).toBe(false);
    expect(mockOffre).not.toHaveBeenCalled();
  });

  it("inactif (une autre section du CV) : rien n'est lu, rien n'est proposé", async () => {
    mockQuota.mockResolvedValue(EPUISE);
    const { result } = renderHook(() => usePortraits(false));
    await act(async () => {});
    expect(mockQuota).not.toHaveBeenCalled();
    expect(result.current.proposition.visible).toBe(false);
  });
});
