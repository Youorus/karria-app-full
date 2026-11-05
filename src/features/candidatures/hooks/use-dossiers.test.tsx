/**
 * L'onglet Candidatures (`use-dossiers.ts`) : la liste lue au focus et
 * triée par génération, les deux segments, le retour discret, la
 * suppression confirmée (et rendue si le serveur refuse), rien sans compte.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";

import { ErreurApi } from "@/lib/http";

import { poserRetourDiscret } from "../services/retour-discret";
import type { CarteDossier } from "../types/candidatures.types";
import { useDossiers } from "./use-dossiers";

const mockLire = jest.fn<() => Promise<CarteDossier[]>>();
const mockSupprimer = jest.fn<(id: string) => Promise<void>>();
let mockInvite = false;

jest.mock("../api/candidatures.api", () => ({
  lireDossiers: () => mockLire(),
  supprimerDossier: (id: string) => mockSupprimer(id),
}));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    // Sous test, le focus est le montage.
    useFocusEffect: (effet: () => void | (() => void)) => useEffect(effet, [effet]),
  };
});
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: jest.fn(), remplacer: jest.fn() }),
}));
jest.mock("@/features/auth/hooks/use-porte", () => ({
  usePorte: () => ({ exiger: jest.fn(() => !mockInvite), invite: mockInvite }),
}));
jest.mock("@/features/publicite/hooks/use-annonce-emplacement", () => ({
  useAnnonceEmplacement: () => null,
}));

function carte(
  id: string,
  creeLe: string,
  statut: CarteDossier["statut"] = "pret",
): CarteDossier {
  return {
    id,
    offre: {
      id: `offre-${id}`,
      titre: `Offre ${id}`,
      entreprise: "Zara",
      logo: null,
      siteEntreprise: null,
      ville: "Paris",
      contrat: "CDI",
      lienCandidature: null,
      extrait: null,
      description: null,
      motsCles: [],
      publieeLe: null,
    },
    modeleId: null,
    statut,
    adaptation: "faite",
    couverture: 0.5,
    propositionsEnAttente: 0,
    aUneLettre: false,
    candidateLe: statut === "candidate" ? "2026-11-05T10:00:00Z" : null,
    creeLe,
    modifieLe: creeLe,
  };
}

describe("L'onglet Candidatures", () => {
  beforeEach(() => {
    mockInvite = false;
    mockLire.mockResolvedValue([
      carte("a", "2026-11-01T10:00:00Z"),
      carte("b", "2026-11-05T10:00:00Z", "candidate"),
      carte("c", "2026-11-03T10:00:00Z"),
    ]);
    mockSupprimer.mockResolvedValue(undefined);
  });

  it("lit les dossiers au focus, du plus récemment généré au plus ancien", async () => {
    const { result } = renderHook(() => useDossiers());
    expect(result.current.chargement).toBe(true);
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(
      result.current.elements.map((e) => (e.type === "dossier" ? e.carte.id : "annonce")),
    ).toEqual(["b", "c", "a"]);
    expect(result.current.sousTitre).toBe("3 dossiers, 1 candidature");
    expect(result.current.effectifs).toEqual({ toutes: 3, candidatees: 1 });
  });

  it("filtre les candidatées sans relire le serveur", async () => {
    const { result } = renderHook(() => useDossiers());
    await waitFor(() => expect(result.current.chargement).toBe(false));
    act(() => result.current.changerDeSegment("candidatees"));
    expect(result.current.elements).toHaveLength(1);
    expect(mockLire).toHaveBeenCalledTimes(1);
  });

  it("dit l'erreur, réseau ou non", async () => {
    mockLire.mockRejectedValueOnce(new ErreurApi("x", 0, "reseau_injoignable"));
    const { result } = renderHook(() => useDossiers());
    await waitFor(() => expect(result.current.erreur).toMatch(/Pas de connexion/));
  });

  it("supprime après confirmation, et rend la carte si le serveur refuse", async () => {
    const alerte = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    mockSupprimer.mockRejectedValueOnce(new ErreurApi("non", 500));
    const { result } = renderHook(() => useDossiers());
    await waitFor(() => expect(result.current.chargement).toBe(false));
    const cible = carte("c", "2026-11-03T10:00:00Z");

    act(() => result.current.supprimer(cible));
    const boutons = alerte.mock.calls[0]?.[2] as AlertButton[];
    act(() => boutons.find((b) => b.style === "destructive")?.onPress?.());
    expect(result.current.elements).toHaveLength(2);
    await waitFor(() => expect(result.current.elements).toHaveLength(3));
    expect(mockSupprimer).toHaveBeenCalledWith("c");
    expect(alerte).toHaveBeenCalledTimes(2);
  });

  it("dit la phrase du retour discret", async () => {
    poserRetourDiscret("C'est noté. Bonne chance !");
    const { result } = renderHook(() => useDossiers());
    expect(result.current.note).toBe("C'est noté. Bonne chance !");
    await waitFor(() => expect(result.current.chargement).toBe(false));
  });

  it("ne lit rien sans compte", async () => {
    mockInvite = true;
    const { result } = renderHook(() => useDossiers());
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(mockLire).not.toHaveBeenCalled();
    expect(result.current.invite).toBe(true);
    expect(result.current.elements).toEqual([]);
  });
});
