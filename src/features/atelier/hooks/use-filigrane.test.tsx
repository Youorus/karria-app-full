/**
 * Le filigrane sur Finaliser (`use-filigrane.ts`) : la ligne tirée de
 * `/allowance`, la proposition d'abonnement montrée une seule fois par
 * export — et jamais quand les paiements sont coupés, ni sur un serveur
 * plus ancien —, puis « Régénérer sans filigrane » après l'abonnement.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";
import { poserSansPub } from "@/lib/sans-pub";
import { derniereSollicitation, oublierLesSollicitations } from "@/lib/sollicitations";

import { oublierPropositions } from "../services/filigrane";
import type { DroitsFiligrane } from "../types/atelier.types";
import { useFiligrane } from "./use-filigrane";

const mockPousser = jest.fn();
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: mockPousser }),
}));

const mockAcheter = jest.fn<() => Promise<"livre" | "non_confirme" | "echec">>();
jest.mock("@/features/soutien/services/achat-direct", () => ({
  acheterSansPub: () => mockAcheter(),
}));

const mockDroits = jest.fn<() => Promise<DroitsFiligrane | null>>();
jest.mock("../api/documents.api", () => ({
  lireDroitsFiligrane: () => mockDroits(),
}));

const mockOffre =
  jest.fn<() => Promise<{ ouverte: boolean; prixCentimes: number | null }>>();
jest.mock("@/features/soutien/services/offre-disponible", () => ({
  offreSansPub: () => mockOffre(),
}));

function droits(partiel: Partial<DroitsFiligrane> = {}): DroitsFiligrane {
  return {
    abonne: false,
    gratuitsParMois: 3,
    utilises: 1,
    restants: 2,
    filigraneAuProchain: false,
    repartLe: "2026-12-01T00:00:00Z",
    ...partiel,
  };
}

const EPUISES = droits({ utilises: 3, restants: 0, filigraneAuProchain: true });

interface Props {
  exporte: { id: string; filigrane: boolean } | null;
  enAttente: boolean;
}

function monter(initial: Props) {
  const regenerer = jest.fn();
  const rendu = renderHook((p: Props) => useFiligrane({ ...p, regenerer }), {
    initialProps: initial,
  });
  return { ...rendu, regenerer };
}

describe("Le filigrane sur Finaliser", () => {
  beforeEach(() => {
    oublierPropositions();
    oublierLesSollicitations();
    poserSansPub(false);
    mockPousser.mockReset();
    mockDroits.mockReset();
    mockDroits.mockResolvedValue(droits());
    mockOffre.mockReset();
    mockOffre.mockResolvedValue({ ouverte: true, prixCentimes: 499 });
  });

  it("avant l'export, dit ce qu'il reste — puis le fait, une fois le CV là", async () => {
    const { result, rerender } = monter({ exporte: null, enAttente: true });
    expect(result.current.ligne).toBeNull();
    await waitFor(() =>
      expect(result.current.ligne).toBe("Il te reste 2 CV sans filigrane ce mois-ci"),
    );

    // Le CV arrive sans filigrane : la lecture d'avant ne vaut plus, on relit.
    mockDroits.mockResolvedValue(droits({ utilises: 2, restants: 1 }));
    rerender({ exporte: { id: "exp_1", filigrane: false }, enAttente: false });
    expect(result.current.ligne).toBeNull();
    await waitFor(() =>
      expect(result.current.ligne).toBe("Il te reste 1 CV sans filigrane ce mois-ci"),
    );
    expect(mockDroits).toHaveBeenCalledTimes(2);
    expect(result.current.proposition.visible).toBe(false);
    expect(mockOffre).not.toHaveBeenCalled();
  });

  it("à zéro : « Ce CV portera le filigrane Karria »", async () => {
    mockDroits.mockResolvedValue(EPUISES);
    const { result } = monter({ exporte: null, enAttente: true });
    await waitFor(() =>
      expect(result.current.ligne).toBe("Ce CV portera le filigrane Karria"),
    );
  });

  it("ne dit rien à un abonné", async () => {
    mockDroits.mockResolvedValue(droits({ abonne: true, restants: 0 }));
    const { result } = monter({ exporte: null, enAttente: true });
    await waitFor(() => expect(mockDroits).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.ligne).toBeNull();
  });

  it("ancien serveur : `/allowance` absent et `watermarked` absent — rien, et rien de cassé", async () => {
    mockDroits.mockResolvedValue(null);
    const { result, rerender } = monter({ exporte: null, enAttente: true });
    await act(async () => {});
    expect(result.current.ligne).toBeNull();
    rerender({ exporte: { id: "exp_1", filigrane: false }, enAttente: false });
    await act(async () => {});
    expect(result.current.ligne).toBeNull();
    expect(result.current.proposition.visible).toBe(false);
    expect(result.current.regenerable).toBe(false);
    expect(mockOffre).not.toHaveBeenCalled();
  });

  it("une panne de `/allowance` n'affiche rien et ne lève rien", async () => {
    mockDroits.mockRejectedValue(new ErreurApi("Serveur indisponible", 503));
    const { result } = monter({ exporte: null, enAttente: true });
    await act(async () => {});
    expect(result.current.ligne).toBeNull();
  });

  it("CV filigrané : la feuille monte une fois le document prêt, une seule fois par export", async () => {
    mockDroits.mockResolvedValue(EPUISES);
    const { result, rerender, unmount } = monter({ exporte: null, enAttente: true });
    await act(async () => {});
    expect(result.current.proposition.visible).toBe(false);
    expect(derniereSollicitation("proposition-abonnement")).toBeNull();

    rerender({ exporte: { id: "exp_1", filigrane: true }, enAttente: false });
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    expect(result.current.proposition.textes).toEqual({
      titre: "Ton CV est prêt",
      texte:
        "Il porte le filigrane Karria. Pour le retirer et soutenir Karria, passe à Karria sans pub : 4,99 € par mois, sans engagement.",
      accepter: "Retirer le filigrane — 4,99 €/mois",
      refuser: "Garder mon CV avec le filigrane",
    });
    expect(result.current.ligne).toBe("Ce CV porte le filigrane Karria");
    // Notée : la demande d'avis ne suivra pas cette feuille.
    expect(derniereSollicitation("proposition-abonnement")).not.toBeNull();

    // « Garder mon CV avec le filigrane » : elle se ferme, et ne revient pas.
    act(() => result.current.proposition.fermer());
    expect(result.current.proposition.visible).toBe(false);
    act(() => result.current.proposition.apresFermeture());
    expect(mockPousser).not.toHaveBeenCalled();
    unmount();

    const retour = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: false,
    });
    await act(async () => {});
    expect(retour.result.current.proposition.visible).toBe(false);
    // La ligne, elle, reste.
    expect(retour.result.current.ligne).toBe("Ce CV porte le filigrane Karria");

    // Un nouvel export filigrané est une nouvelle occasion.
    retour.rerender({ exporte: { id: "exp_2", filigrane: true }, enAttente: false });
    await waitFor(() => expect(retour.result.current.proposition.visible).toBe(true));
  });

  it("« Retirer le filigrane » ferme la feuille, ouvre le paiement, puis refait le CV", async () => {
    mockAcheter.mockResolvedValue("livre");
    const { result, regenerer } = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: false,
    });
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    act(() => result.current.proposition.accepter());
    expect(result.current.proposition.visible).toBe(false);
    // Rien ne s'ouvre tant que la fenêtre native n'a pas rendu la main.
    expect(mockAcheter).not.toHaveBeenCalled();
    await act(async () => result.current.proposition.apresFermeture());
    expect(mockAcheter).toHaveBeenCalledTimes(1);
    // Abonnée : le CV se régénère seul, sans détour par le profil.
    expect(regenerer).toHaveBeenCalledTimes(1);
    expect(mockPousser).not.toHaveBeenCalled();
    // Une seule fois.
    await act(async () => result.current.proposition.apresFermeture());
    expect(mockAcheter).toHaveBeenCalledTimes(1);
  });

  it("le paiement n'a pas pu s'ouvrir : l'offre du profil prend le relais", async () => {
    mockAcheter.mockResolvedValue("echec");
    const { result, regenerer } = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: false,
    });
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    act(() => result.current.proposition.accepter());
    await act(async () => result.current.proposition.apresFermeture());
    expect(mockPousser).toHaveBeenCalledWith({
      pathname: "/profil",
      params: { offre: "sans-pub" },
    });
    expect(regenerer).not.toHaveBeenCalled();
  });

  it("paiement refermé sans confirmation : rien n'est affirmé, rien n'est refait", async () => {
    mockAcheter.mockResolvedValue("non_confirme");
    const { result, regenerer } = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: false,
    });
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    act(() => result.current.proposition.accepter());
    await act(async () => result.current.proposition.apresFermeture());
    expect(regenerer).not.toHaveBeenCalled();
    expect(mockPousser).not.toHaveBeenCalled();
  });

  it("paiements coupés sur la plateforme : pas de feuille, seulement la ligne", async () => {
    mockOffre.mockResolvedValue({ ouverte: false, prixCentimes: null });
    mockDroits.mockResolvedValue(EPUISES);
    const { result } = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: false,
    });
    await waitFor(() => expect(mockOffre).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.proposition.visible).toBe(false);
    expect(result.current.ligne).toBe("Ce CV porte le filigrane Karria");
  });

  it("la feuille attend la fin de la génération", async () => {
    const { result, rerender } = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: true,
    });
    await act(async () => {});
    expect(result.current.proposition.visible).toBe(false);
    expect(mockOffre).not.toHaveBeenCalled();
    rerender({ exporte: { id: "exp_1", filigrane: true }, enAttente: false });
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
  });

  it("après l'abonnement : la feuille se retire et « Régénérer sans filigrane » relance l'export", async () => {
    const { result, regenerer, rerender } = monter({
      exporte: { id: "exp_1", filigrane: true },
      enAttente: false,
    });
    await waitFor(() => expect(result.current.proposition.visible).toBe(true));
    expect(result.current.regenerable).toBe(false);

    act(() => poserSansPub(true));
    expect(result.current.proposition.visible).toBe(false);
    expect(result.current.regenerable).toBe(true);
    act(() => result.current.regenerer());
    expect(regenerer).toHaveBeenCalledTimes(1);

    // Le nouveau CV sort sans filigrane : plus rien à régénérer, plus de feuille.
    mockDroits.mockResolvedValue(droits({ abonne: true, restants: 0 }));
    rerender({ exporte: { id: "exp_2", filigrane: false }, enAttente: false });
    await act(async () => {});
    expect(result.current.regenerable).toBe(false);
    expect(result.current.proposition.visible).toBe(false);
    expect(result.current.ligne).toBeNull();
  });
});
