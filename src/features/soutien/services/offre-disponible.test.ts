/**
 * « Masquer les annonces » n'apparaît que si le paiement est ouvert ici,
 * et le catalogue n'est lu qu'une fois, quel que soit le nombre d'annonces.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { offreSansPubDisponible, oublierOffreDisponible } from "./offre-disponible";

const mockLireCatalogue = jest.fn<(plateforme: string) => Promise<{ actif: boolean }>>();
jest.mock("../api/soutien.api", () => ({
  lireCatalogue: (p: string) => mockLireCatalogue(p),
}));

describe("offreSansPubDisponible", () => {
  beforeEach(() => {
    oublierOffreDisponible();
    mockLireCatalogue.mockReset();
  });

  it("dit oui quand le serveur a ouvert le paiement, en une seule lecture", async () => {
    mockLireCatalogue.mockResolvedValue({ actif: true });
    const [a, b] = await Promise.all([
      offreSansPubDisponible(),
      offreSansPubDisponible(),
    ]);
    expect(a && b).toBe(true);
    expect(mockLireCatalogue).toHaveBeenCalledTimes(1);
  });

  it("dit non quand l'interrupteur est éteint", async () => {
    mockLireCatalogue.mockResolvedValue({ actif: false });
    expect(await offreSansPubDisponible()).toBe(false);
  });

  it("dit non sur un échec, et retentera plus tard", async () => {
    mockLireCatalogue.mockRejectedValueOnce(new Error("réseau"));
    expect(await offreSansPubDisponible()).toBe(false);
    mockLireCatalogue.mockResolvedValue({ actif: true });
    expect(await offreSansPubDisponible()).toBe(true);
  });
});
