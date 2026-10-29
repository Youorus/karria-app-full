/**
 * L'attente de la livraison : on croit le serveur, pas le navigateur.
 */

import { describe, expect, it, jest } from "@jest/globals";

import { attendreLaLivraison } from "./attente";

const immediat = () => Promise.resolve();

describe("attendreLaLivraison", () => {
  it("rend « livré » dès que le serveur le dit, sans attendre la fin", async () => {
    const reponses = [false, false, true];
    const lire = jest.fn(async () => reponses.shift() ?? true);
    const dormir = jest.fn(immediat);

    await expect(attendreLaLivraison(lire, { dormir })).resolves.toBe("livre");
    expect(lire).toHaveBeenCalledTimes(3);
    expect(dormir).toHaveBeenCalledTimes(2);
  });

  it("rend « en attente » quand le serveur répond sans livrer", async () => {
    const lire = jest.fn(async () => false);
    await expect(
      attendreLaLivraison(lire, { dormir: immediat, delaisMs: [1, 1] }),
    ).resolves.toBe("en_attente");
    expect(lire).toHaveBeenCalledTimes(3);
  });

  it("rend « inconnu » quand aucune lecture n'aboutit", async () => {
    const lire = jest.fn(async () => {
      throw new Error("réseau");
    });
    await expect(
      attendreLaLivraison(lire, { dormir: immediat, delaisMs: [1] }),
    ).resolves.toBe("inconnu");
  });

  it("une panne passagère n'arrête pas l'attente", async () => {
    let tour = 0;
    const lire = jest.fn(async () => {
      tour += 1;
      if (tour === 1) throw new Error("réseau");
      return tour === 2;
    });
    await expect(attendreLaLivraison(lire, { dormir: immediat })).resolves.toBe("livre");
  });
});
