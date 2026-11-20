/**
 * « Mes recherches » (`use-mes-recherches.ts`) : la liste lue au focus, la
 * bascule optimiste et son retour arrière, le `404` qui retire la ligne,
 * la suppression confirmée (et le fil prévenu quand c'était la recherche
 * en cours), l'état vide, rien sans compte.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

import type {
  RechercheEnregistree,
  RecherchesEnregistrees,
} from "@/features/assistant/types/recherches-enregistrees.types";
import { ErreurApi } from "@/lib/http";

import { useMesRecherches } from "./use-mes-recherches";

const mockLire = jest.fn<() => Promise<RecherchesEnregistrees>>();
const mockRegler =
  jest.fn<(id: string, actives: boolean) => Promise<RechercheEnregistree>>();
const mockSupprimer = jest.fn<(id: string) => Promise<void>>();
const mockSignaler = jest.fn<() => void>();
const mockRouter = {
  canDismiss: jest.fn(() => true),
  dismissAll: jest.fn(),
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  back: jest.fn(),
};
const mockRemplacer = jest.fn();
let mockInvite = false;

jest.mock("@/features/assistant/api/recherches-enregistrees.api", () => ({
  RECHERCHE_INTROUVABLE: "saved_search_not_found",
  lireRecherchesEnregistrees: () => mockLire(),
  reglerAlertesDeRecherche: (id: string, actives: boolean) => mockRegler(id, actives),
  supprimerRechercheEnregistree: (id: string) => mockSupprimer(id),
}));
jest.mock("@/features/offres/services/recherche-changee", () => ({
  signalerRechercheChangee: () => mockSignaler(),
}));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    // Sous test, le focus est le montage.
    useFocusEffect: (effet: () => void | (() => void)) => useEffect(effet, [effet]),
    useRouter: () => mockRouter,
  };
});
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: jest.fn(), remplacer: mockRemplacer }),
}));
jest.mock("@/features/auth/hooks/use-porte", () => ({
  usePorte: () => ({ exiger: jest.fn(() => !mockInvite), invite: mockInvite }),
}));

function recherche(
  id: string,
  utiliseeLe: string,
  surcharge: Partial<RechercheEnregistree> = {},
): RechercheEnregistree {
  return {
    id,
    resume: `Recherche ${id}`,
    demande: `je cherche ${id}`,
    metiers: [id],
    lieu: "Paris",
    touteLaFrance: false,
    contrats: [],
    alertes: true,
    enCours: false,
    creeeLe: utiliseeLe,
    utiliseeLe,
    derniereAlerteLe: null,
    ...surcharge,
  };
}

const COURANTE = recherche("a", "2026-11-20T08:00:00Z", { enCours: true });
const ANCIENNE = recherche("b", "2026-11-10T08:00:00Z");
const COUPEE = recherche("c", "2026-11-01T08:00:00Z", { alertes: false });

const introuvable = () =>
  new ErreurApi("Cette recherche n'existe plus.", 404, "saved_search_not_found");

async function monter() {
  const rendu = renderHook(() => useMesRecherches());
  await waitFor(() => expect(rendu.result.current.chargement).toBe(false));
  return rendu;
}

const alertesDe = (liste: RechercheEnregistree[], id: string) =>
  liste.find((r) => r.id === id)?.alertes;

/** Ouvre la confirmation de suppression et rend ses boutons. */
function confirmer(alerte: jest.SpiedFunction<typeof Alert.alert>): AlertButton {
  const boutons = alerte.mock.calls[alerte.mock.calls.length - 1]?.[2] as AlertButton[];
  return boutons.find((b) => b.style === "destructive")!;
}

describe("« Mes recherches »", () => {
  let alerte: jest.SpiedFunction<typeof Alert.alert>;

  beforeEach(() => {
    mockInvite = false;
    mockLire.mockReset();
    mockRegler.mockReset();
    mockSupprimer.mockReset();
    mockSignaler.mockReset();
    mockRemplacer.mockReset();
    Object.values(mockRouter).forEach((f) => f.mockClear());
    mockLire.mockResolvedValue({ recherches: [COURANTE, ANCIENNE, COUPEE], maximum: 10 });
    mockRegler.mockImplementation((id, actives) =>
      Promise.resolve({
        ...[COURANTE, ANCIENNE, COUPEE].find((r) => r.id === id)!,
        alertes: actives,
      }),
    );
    mockSupprimer.mockResolvedValue(undefined);
    alerte = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  });

  describe("le chargement", () => {
    it("lit la liste au focus, dans l'ordre du serveur, avec son plafond", async () => {
      const { result } = renderHook(() => useMesRecherches());
      expect(result.current.chargement).toBe(true);
      expect(result.current.maximum).toBeNull();
      await waitFor(() => expect(result.current.chargement).toBe(false));
      expect(result.current.recherches.map((r) => r.id)).toEqual(["a", "b", "c"]);
      expect(result.current.maximum).toBe(10);
      expect(result.current.erreur).toBeNull();
    });

    it("relit au retour sur l'écran et en tirant", async () => {
      const { result, rerender } = await monter();
      expect(mockLire).toHaveBeenCalledTimes(1);
      mockLire.mockResolvedValue({ recherches: [ANCIENNE], maximum: 10 });
      act(() => result.current.actualiser());
      expect(result.current.actualisation).toBe(true);
      await waitFor(() => expect(result.current.actualisation).toBe(false));
      expect(result.current.recherches.map((r) => r.id)).toEqual(["b"]);
      rerender({});
      expect(mockLire).toHaveBeenCalledTimes(2);
    });

    it("dit l'erreur, réseau ou non", async () => {
      mockLire.mockRejectedValueOnce(new ErreurApi("x", 0, "reseau_injoignable"));
      const { result } = renderHook(() => useMesRecherches());
      await waitFor(() => expect(result.current.erreur).toMatch(/Pas de connexion/));
      expect(result.current.chargement).toBe(false);

      mockLire.mockRejectedValueOnce(new ErreurApi("x", 500));
      act(() => result.current.actualiser());
      await waitFor(() => expect(result.current.erreur).toMatch(/n'ont pas pu être/));
    });

    it("rend une liste vide tant que la personne n'a rien cherché", async () => {
      mockLire.mockResolvedValue({ recherches: [], maximum: 10 });
      const { result } = await monter();
      expect(result.current.recherches).toEqual([]);
      expect(result.current.erreur).toBeNull();
      expect(result.current.maximum).toBe(10);
    });

    it("ne lit rien sans compte", async () => {
      mockInvite = true;
      const { result } = await monter();
      expect(mockLire).not.toHaveBeenCalled();
      expect(result.current.recherches).toEqual([]);
    });
  });

  describe("la bascule", () => {
    it("change l'interrupteur tout de suite, puis garde la réponse du serveur", async () => {
      let repondre!: (r: RechercheEnregistree) => void;
      mockRegler.mockImplementationOnce(
        () =>
          new Promise<RechercheEnregistree>((resolve) => {
            repondre = resolve;
          }),
      );
      const { result } = await monter();

      act(() => result.current.basculer(ANCIENNE, false));
      // Avant toute réponse : déjà coupé.
      expect(alertesDe(result.current.recherches, "b")).toBe(false);
      expect(mockRegler).toHaveBeenCalledWith("b", false);

      await act(async () => {
        repondre({
          ...ANCIENNE,
          alertes: false,
          derniereAlerteLe: "2026-11-19T07:00:00Z",
        });
        await Promise.resolve();
      });
      const aJour = result.current.recherches.find((r) => r.id === "b")!;
      expect(aJour.alertes).toBe(false);
      expect(aJour.derniereAlerteLe).toBe("2026-11-19T07:00:00Z");
      expect(result.current.note).toBeNull();
      // Les autres lignes n'ont pas bougé, et le fil n'est pas dérangé.
      expect(alertesDe(result.current.recherches, "a")).toBe(true);
      expect(mockSignaler).not.toHaveBeenCalled();
    });

    it("revient en arrière avec une phrase si l'appel échoue", async () => {
      mockRegler.mockRejectedValueOnce(new ErreurApi("non", 500));
      const { result } = await monter();

      act(() => result.current.basculer(COUPEE, true));
      expect(alertesDe(result.current.recherches, "c")).toBe(true);
      await waitFor(() =>
        expect(result.current.note).toMatch(/n'a pas pu être modifiée/),
      );
      expect(alertesDe(result.current.recherches, "c")).toBe(false);
      expect(result.current.recherches).toHaveLength(3);
      expect(mockLire).toHaveBeenCalledTimes(1);
    });

    it("distingue la panne de réseau", async () => {
      mockRegler.mockRejectedValueOnce(new ErreurApi("x", 0, "reseau_injoignable"));
      const { result } = await monter();
      act(() => result.current.basculer(ANCIENNE, false));
      await waitFor(() => expect(result.current.note).toMatch(/Pas de connexion/));
      expect(alertesDe(result.current.recherches, "b")).toBe(true);
    });

    it("efface la phrase d'elle-même", async () => {
      mockRegler.mockRejectedValueOnce(new ErreurApi("non", 500));
      const { result } = await monter();
      jest.useFakeTimers();
      try {
        act(() => result.current.basculer(ANCIENNE, false));
        await act(async () => {
          await Promise.resolve();
          await Promise.resolve();
        });
        expect(result.current.note).not.toBeNull();
        act(() => {
          jest.advanceTimersByTime(3_500);
        });
        expect(result.current.note).toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it("sur un 404, retire la ligne et relit la liste", async () => {
      mockRegler.mockRejectedValueOnce(introuvable());
      const { result } = await monter();
      mockLire.mockResolvedValue({ recherches: [COURANTE, COUPEE], maximum: 10 });

      act(() => result.current.basculer(ANCIENNE, false));
      await waitFor(() => expect(mockLire).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.actualisation).toBe(false));
      expect(result.current.recherches.map((r) => r.id)).toEqual(["a", "c"]);
      expect(result.current.note).toBe("Cette recherche n'existe plus.");
      // Ce n'était pas la recherche en cours : le fil n'a rien à relire.
      expect(mockSignaler).not.toHaveBeenCalled();
    });

    it("sur un 404 de la recherche en cours, prévient aussi le fil", async () => {
      mockRegler.mockRejectedValueOnce(introuvable());
      const { result } = await monter();
      mockLire.mockResolvedValue({ recherches: [ANCIENNE, COUPEE], maximum: 10 });
      act(() => result.current.basculer(COURANTE, false));
      await waitFor(() => expect(mockSignaler).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.actualisation).toBe(false));
      expect(result.current.recherches.map((r) => r.id)).toEqual(["b", "c"]);
    });

    it("de deux bascules rapprochées, seule la dernière réponse compte", async () => {
      const reponses: ((r: RechercheEnregistree) => void)[] = [];
      mockRegler.mockImplementation(
        () =>
          new Promise<RechercheEnregistree>((resolve) => {
            reponses.push(resolve);
          }),
      );
      const { result } = await monter();
      act(() => result.current.basculer(ANCIENNE, false));
      act(() => result.current.basculer({ ...ANCIENNE, alertes: false }, true));
      await act(async () => {
        reponses[1]!({ ...ANCIENNE, alertes: true });
        reponses[0]!({ ...ANCIENNE, alertes: false });
        await Promise.resolve();
      });
      expect(alertesDe(result.current.recherches, "b")).toBe(true);
    });
  });

  describe("la suppression", () => {
    it("demande confirmation, et ne fait rien tant qu'on n'a pas confirmé", async () => {
      const { result } = await monter();
      act(() => result.current.supprimer(ANCIENNE));
      expect(alerte).toHaveBeenCalledWith(
        "Supprimer cette recherche ?",
        "Karria ne la surveillera plus.",
        expect.any(Array),
      );
      expect(mockSupprimer).not.toHaveBeenCalled();
      expect(result.current.recherches).toHaveLength(3);
    });

    it("retire la ligne aussitôt confirmée, sans déranger le fil", async () => {
      const { result } = await monter();
      act(() => result.current.supprimer(ANCIENNE));
      await act(async () => {
        confirmer(alerte).onPress?.();
        await Promise.resolve();
      });
      expect(mockSupprimer).toHaveBeenCalledWith("b");
      expect(result.current.recherches.map((r) => r.id)).toEqual(["a", "c"]);
      expect(mockSignaler).not.toHaveBeenCalled();
    });

    it("prévient que le fil change pour la recherche en cours, puis prévient le fil", async () => {
      const { result } = await monter();
      act(() => result.current.supprimer(COURANTE));
      expect(alerte).toHaveBeenCalledWith(
        "Supprimer cette recherche ?",
        "Karria ne la surveillera plus. Ton fil redeviendra toutes les offres.",
        expect.any(Array),
      );
      await act(async () => {
        confirmer(alerte).onPress?.();
        await Promise.resolve();
      });
      expect(mockSupprimer).toHaveBeenCalledWith("a");
      expect(result.current.recherches.map((r) => r.id)).toEqual(["b", "c"]);
      expect(mockSignaler).toHaveBeenCalledTimes(1);
    });

    it("rend la ligne à sa place si le serveur refuse, et le dit", async () => {
      mockSupprimer.mockRejectedValueOnce(new ErreurApi("non", 500));
      const { result } = await monter();
      act(() => result.current.supprimer(ANCIENNE));
      act(() => confirmer(alerte).onPress?.());
      expect(result.current.recherches.map((r) => r.id)).toEqual(["a", "c"]);
      await waitFor(() =>
        expect(result.current.recherches.map((r) => r.id)).toEqual(["a", "b", "c"]),
      );
      expect(alerte).toHaveBeenLastCalledWith(
        "La recherche n'a pas été supprimée",
        "Réessaie dans un instant.",
      );
      expect(mockSignaler).not.toHaveBeenCalled();
    });

    it("sur un 404, la ligne ne revient pas et la liste se relit", async () => {
      mockSupprimer.mockRejectedValueOnce(introuvable());
      const { result } = await monter();
      mockLire.mockResolvedValue({ recherches: [COURANTE, COUPEE], maximum: 10 });
      act(() => result.current.supprimer(ANCIENNE));
      act(() => confirmer(alerte).onPress?.());
      await waitFor(() => expect(mockLire).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.actualisation).toBe(false));
      expect(result.current.recherches.map((r) => r.id)).toEqual(["a", "c"]);
      // Une seule alerte : la confirmation, pas d'échec annoncé.
      expect(alerte).toHaveBeenCalledTimes(1);
    });
  });

  describe("la navigation", () => {
    it("« Parler à Karria » revient aux onglets et ouvre le rideau du fil", async () => {
      const { result } = await monter();
      act(() => result.current.parlerAKarria());
      expect(mockRouter.dismissAll).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith({
        pathname: "/offres",
        params: { karria: "1" },
      });
    });

    it("le retour revient en arrière, ou aux paramètres s'il n'y a rien dessous", async () => {
      const { result } = await monter();
      act(() => result.current.retour());
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
      mockRouter.canGoBack.mockReturnValueOnce(false);
      act(() => result.current.retour());
      expect(mockRemplacer).toHaveBeenCalledWith("/parametres");
    });
  });
});
