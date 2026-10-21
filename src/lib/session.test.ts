/**
 * Le stockage des jetons dans le magasin sécurisé.
 *
 * Ce que ces tests protègent :
 *
 * 1. **une demi-session n'est pas une session** : un seul des deux
 *    jetons présent se lit comme « personne n'est connecté », au lieu de
 *    produire des 401 en boucle ;
 * 2. **un magasin indisponible ne fait pas planter le lancement** ;
 * 3. la déconnexion n'oublie rien derrière elle.
 *
 * `expo-secure-store` est remplacé par un dictionnaire en mémoire.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";

import { ecrireJetons, lireJetons, oublierSession } from "./session";

const magasin = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

beforeEach(() => {
  magasin.clear();
  jest
    .mocked(SecureStore.getItemAsync)
    .mockImplementation((cle) => Promise.resolve(magasin.get(cle) ?? null));
  jest.mocked(SecureStore.setItemAsync).mockImplementation((cle, valeur) => {
    magasin.set(cle, valeur);
    return Promise.resolve();
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation((cle) => {
    magasin.delete(cle);
    return Promise.resolve();
  });
});

describe("Les jetons", () => {
  it("ne rend rien tant que personne ne s'est connecté", async () => {
    await expect(lireJetons()).resolves.toBeNull();
  });

  it("relit les deux jetons qu'on vient d'écrire", async () => {
    await ecrireJetons({ acces: "acces-1", rafraichissement: "rafraichissement-1" });

    await expect(lireJetons()).resolves.toEqual({
      acces: "acces-1",
      rafraichissement: "rafraichissement-1",
    });
    expect(magasin.size).toBe(2);
  });

  it("traite un seul jeton présent comme aucun : une demi-session n'en est pas une", async () => {
    await ecrireJetons({ acces: "acces-1", rafraichissement: "rafraichissement-1" });
    const [uneCle] = [...magasin.keys()];
    magasin.delete(uneCle ?? "");

    await expect(lireJetons()).resolves.toBeNull();
  });

  it("se comporte comme « déconnecté » quand le magasin est indisponible, sans planter", async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockRejectedValue(new Error("User interaction is not allowed"));

    await expect(lireJetons()).resolves.toBeNull();
  });
});

describe("La déconnexion", () => {
  it("efface les deux jetons : rien ne reste dans le magasin", async () => {
    await ecrireJetons({ acces: "acces-1", rafraichissement: "rafraichissement-1" });

    await oublierSession();

    expect(magasin.size).toBe(0);
    await expect(lireJetons()).resolves.toBeNull();
  });
});
