/**
 * Le fil, ses vues, ses filtres et son tri (`use-fil-offres.ts`).
 *
 * Ces tests protègent la demande de Marc du 2026-10-31 : un filtre posé
 * sur « Ma recherche » ne s'applique qu'à « Ma recherche » ; la feuille
 * propose les options de la vue affichée ; le tri part avec chaque page.
 * La couche `api/` est simulée : on lit ce que le hook lui demande.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";

import {
  FILTRES_PAR_DEFAUT,
  type Fil,
  type ModeDuFil,
  type Tri,
} from "../types/offres.types";
import { useFilOffres } from "./use-fil-offres";

const mockLireFil =
  jest.fn<
    (
      filtres: typeof FILTRES_PAR_DEFAUT,
      offset: number,
      demande: ModeDuFil | null,
      tri: Tri | null,
    ) => Promise<Fil>
  >();
const mockLireOptions = jest.fn<(mode: ModeDuFil) => Promise<unknown>>();

jest.mock("../api/offres.api", () => ({
  lireFil: (...args: Parameters<typeof mockLireFil>) => mockLireFil(...args),
  lireOptionsDeFiltre: (mode: ModeDuFil) => mockLireOptions(mode),
  garderOffre: jest.fn(),
  marquerVues: jest.fn(),
}));
jest.mock("@/features/auth/hooks/use-porte", () => ({
  usePorte: () => ({ exiger: () => true, invite: false }),
  useReprise: () => undefined,
}));
jest.mock("./memoire-offres", () => ({ memoriser: () => undefined }));

/** Le serveur : sert le mode demandé, sinon la recherche (des critères existent). */
function servir(lieu = true) {
  mockLireFil.mockImplementation((_filtres, _offset, demande, tri) => {
    if (tri === "proches" && !lieu) {
      return Promise.reject(
        new ErreurApi("Pas de lieu.", 422, "nearest_unavailable", "sort"),
      );
    }
    const mode = demande ?? "recherche";
    return Promise.resolve({
      offres: [],
      total: 0,
      suivantes: false,
      mode,
      resumeRecherche: "infirmier · Beaumont sur Oise (30 km)",
      tri: tri ?? (mode === "recherche" ? "pertinence" : "recentes"),
      procheDisponible: lieu,
    });
  });
}

const dernierAppel = () => mockLireFil.mock.calls[mockLireFil.mock.calls.length - 1]!;

beforeEach(() => {
  mockLireFil.mockReset();
  mockLireOptions.mockReset();
  mockLireOptions.mockResolvedValue({ contrats: [], villes: [] });
  servir();
});

async function monter() {
  const rendu = renderHook(() => useFilOffres());
  await waitFor(() => expect(rendu.result.current.chargement).toBe(false));
  return rendu;
}

describe("Les filtres appartiennent à la vue affichée", () => {
  it("un filtre posé sur « Ma recherche » reste en mode recherche", async () => {
    const { result } = await monter();
    expect(result.current.vue).toBe("pour_toi");

    act(() =>
      result.current.appliquerFiltres({ ...FILTRES_PAR_DEFAUT, villes: ["Persan"] }),
    );
    await waitFor(() => expect(result.current.chargement).toBe(false));

    const [filtres, , demande] = dernierAppel();
    expect(filtres.villes).toEqual(["Persan"]);
    // Le mode déduit reste celui servi : la recherche.
    expect(demande === null || demande === "recherche").toBe(true);
    expect(result.current.vue).toBe("pour_toi");
  });

  it("chaque vue garde ses filtres et les retrouve au retour", async () => {
    const { result } = await monter();
    act(() =>
      result.current.appliquerFiltres({ ...FILTRES_PAR_DEFAUT, villes: ["Persan"] }),
    );
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.changerDeVue("toutes"));
    await waitFor(() => expect(result.current.vue).toBe("toutes"));
    expect(dernierAppel()[0].villes).toEqual([]);
    expect(dernierAppel()[2]).toBe("toutes");
    expect(result.current.filtres.villes).toEqual([]);

    act(() => result.current.changerDeVue("pour_toi"));
    await waitFor(() => expect(result.current.vue).toBe("pour_toi"));
    expect(dernierAppel()[0].villes).toEqual(["Persan"]);
    expect(result.current.filtres.villes).toEqual(["Persan"]);
  });

  it("les options de la feuille suivent la vue servie", async () => {
    const { result } = await monter();
    await waitFor(() => expect(mockLireOptions).toHaveBeenCalledWith("recherche"));

    act(() => result.current.changerDeVue("toutes"));
    await waitFor(() => expect(mockLireOptions).toHaveBeenLastCalledWith("toutes"));
  });
});

describe("Le tri", () => {
  it("par défaut rien n'est envoyé, puis le choix part avec chaque page", async () => {
    const { result } = await monter();
    expect(dernierAppel()[3]).toBeNull();
    expect(result.current.tri).toBe("pertinence");

    act(() => result.current.changerDeTri("proches"));
    await waitFor(() => expect(result.current.tri).toBe("proches"));
    expect(dernierAppel()[1]).toBe(0);
    expect(dernierAppel()[3]).toBe("proches");

    // Revenir au défaut ne l'envoie plus.
    act(() => result.current.changerDeTri("pertinence"));
    await waitFor(() => expect(result.current.tri).toBe("pertinence"));
    expect(dernierAppel()[3]).toBeNull();
  });

  it("« Toutes les offres » a son propre tri, « Plus récentes » par défaut", async () => {
    const { result } = await monter();
    act(() => result.current.changerDeTri("recentes"));
    await waitFor(() => expect(result.current.tri).toBe("recentes"));

    act(() => result.current.changerDeVue("toutes"));
    await waitFor(() => expect(result.current.vue).toBe("toutes"));
    expect(result.current.tri).toBe("recentes");
    expect(dernierAppel()[3]).toBeNull();
  });

  it("sans lieu de recherche, « Plus proches » revient à l'ordre par défaut", async () => {
    const { result } = await monter();
    servir(false);
    act(() => result.current.changerDeTri("proches"));
    await waitFor(() => expect(result.current.procheDisponible).toBe(false));
    await waitFor(() => expect(result.current.tri).toBe("pertinence"));
    expect(dernierAppel()[3]).toBeNull();
    expect(result.current.erreur).toBeNull();
  });
});
