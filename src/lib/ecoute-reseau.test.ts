/**
 * L'écoute de l'appareil (`ecoute-reseau.ts`).
 *
 * Ce que ces tests protègent : l'état est lu au démarrage, suivi ensuite,
 * relu au retour au premier plan ; et une build sans le module natif ne
 * plante pas — elle se passe de cette source.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState, type AppStateStatus } from "react-native";

import { estSansReseau, lireAffichage, reinitialiserConnexion } from "./etat-connexion";
import { surveillerLeReseau } from "./ecoute-reseau";

interface Etat {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}

const mockLire = jest.fn<() => Promise<Etat>>();
const mockRetirer = jest.fn();
let mockEcouteur: ((etat: Etat) => void) | null = null;

jest.mock("expo-network", () => ({
  getNetworkStateAsync: () => mockLire(),
  addNetworkStateListener: (ecouteur: (etat: Etat) => void) => {
    mockEcouteur = ecouteur;
    return { remove: mockRetirer };
  },
}));

let surPremierPlan: ((etat: AppStateStatus) => void) | null = null;
const retirerPremierPlan = jest.fn();

const vider = () => new Promise<void>((resoudre) => setImmediate(resoudre));

beforeEach(() => {
  reinitialiserConnexion();
  mockLire.mockReset();
  mockLire.mockResolvedValue({ isConnected: true, isInternetReachable: true });
  mockEcouteur = null;
  surPremierPlan = null;
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, rappel) => {
    surPremierPlan = rappel as (etat: AppStateStatus) => void;
    return { remove: retirerPremierPlan } as unknown as ReturnType<
      typeof AppState.addEventListener
    >;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  reinitialiserConnexion();
});

describe("L'écoute de l'appareil", () => {
  it("lit l'état au démarrage : un téléphone ouvert en mode avion est hors ligne", async () => {
    mockLire.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const arreter = surveillerLeReseau();
    await vider();
    expect(lireAffichage()).toBe("hors-ligne");
    expect(estSansReseau()).toBe(true);
    arreter();
  });

  it("suit les changements que le système annonce", async () => {
    const arreter = surveillerLeReseau();
    await vider();
    expect(lireAffichage()).toBe("aucun");

    mockEcouteur?.({ isConnected: false });
    expect(lireAffichage()).toBe("hors-ligne");
    mockEcouteur?.({ isConnected: true, isInternetReachable: true });
    expect(lireAffichage()).toBe("retablie");
    arreter();
  });

  it("relit l'appareil au retour au premier plan", async () => {
    const maintenant = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    const arreter = surveillerLeReseau();
    await vider();
    expect(mockLire).toHaveBeenCalledTimes(1);

    mockLire.mockResolvedValue({ isConnected: false });
    maintenant.mockReturnValue(1_060_000);
    surPremierPlan?.("background");
    surPremierPlan?.("active");
    await vider();
    expect(mockLire).toHaveBeenCalledTimes(2);
    expect(lireAffichage()).toBe("hors-ligne");
    arreter();
  });

  it("ne relit pas deux fois coup sur coup", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1_000_000);
    const arreter = surveillerLeReseau();
    surPremierPlan?.("active");
    surPremierPlan?.("active");
    await vider();
    expect(mockLire).toHaveBeenCalledTimes(1);
    arreter();
  });

  it("se désabonne à l'arrêt, et n'écrit plus rien après", async () => {
    let repondre!: (etat: Etat) => void;
    mockLire.mockReturnValue(
      new Promise<Etat>((resoudre) => {
        repondre = resoudre;
      }),
    );
    const arreter = surveillerLeReseau();
    arreter();
    repondre({ isConnected: false });
    await vider();
    expect(mockRetirer).toHaveBeenCalledTimes(1);
    expect(retirerPremierPlan).toHaveBeenCalledTimes(1);
    expect(lireAffichage()).toBe("aucun");
  });

  it("une lecture qui échoue est journalisée, sans rien changer", async () => {
    mockLire.mockRejectedValue(new Error("indisponible"));
    const arreter = surveillerLeReseau();
    await vider();
    expect(lireAffichage()).toBe("aucun");
    expect(console.warn).toHaveBeenCalledWith(
      "[karria] état du réseau non relu",
      expect.any(Error),
    );
    arreter();
  });
});

describe("Sans le module natif (build d'avant expo-network)", () => {
  it("ne lève pas, le dit dans les journaux, et ne bloque aucune action", () => {
    const arreter = surveillerLeReseau(() => {
      throw new Error("Cannot find native module 'ExpoNetwork'");
    });
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("état du réseau illisible"),
      expect.any(Error),
    );
    expect(estSansReseau()).toBe(false);
    expect(mockLire).not.toHaveBeenCalled();
    expect(lireAffichage()).toBe("aucun");
    expect(() => arreter()).not.toThrow();
  });
});
