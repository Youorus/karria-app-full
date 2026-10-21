/**
 * L'identité de l'installation et la mémoire de la question des
 * notifications.
 *
 * Ce que ces tests protègent :
 *
 * 1. **l'identifiant ne change jamais** : deux lectures, et deux
 *    démarrages, rendent la même valeur — sinon le serveur verrait un
 *    appareil neuf à chaque ouverture ;
 * 2. **un magasin indisponible ne fait pas planter** : on obtient quand
 *    même un identifiant, et toujours le même pendant la session ;
 * 3. **la réponse aux notifications se garde et s'oublie**, et une valeur
 *    inconnue dans le magasin se lit comme « jamais demandé ».
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";

import {
  lireInstallationId,
  lireReponseNotifications,
  oublierReponseNotifications,
  reinitialiserInstallationPourLesTests,
  retenirReponseNotifications,
} from "./installation";

const magasin = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-crypto", () => {
  let compteur = 0;
  return { randomUUID: () => `uuid-${++compteur}` };
});

beforeEach(() => {
  magasin.clear();
  reinitialiserInstallationPourLesTests();
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

describe("L'identifiant d'installation", () => {
  it("est tiré une fois, puis relu tel quel", async () => {
    const premier = await lireInstallationId();
    reinitialiserInstallationPourLesTests();
    const second = await lireInstallationId();

    expect(second).toBe(premier);
    expect(magasin.get("karria.installation")).toBe(premier);
  });

  it("reste stable pendant la session même si le magasin est indisponible", async () => {
    jest
      .mocked(SecureStore.getItemAsync)
      .mockRejectedValue(new Error("User interaction is not allowed"));

    const premier = await lireInstallationId();
    const second = await lireInstallationId();

    expect(premier).toMatch(/^uuid-/);
    expect(second).toBe(premier);
  });
});

describe("La réponse aux notifications", () => {
  it("n'existe pas tant que personne n'a répondu", async () => {
    await expect(lireReponseNotifications()).resolves.toBeNull();
  });

  it("se retient, puis s'oublie quand un compte est créé", async () => {
    await retenirReponseNotifications("plus_tard");
    await expect(lireReponseNotifications()).resolves.toBe("plus_tard");

    await oublierReponseNotifications();
    await expect(lireReponseNotifications()).resolves.toBeNull();
  });

  it("lit une valeur inconnue comme « jamais demandé »", async () => {
    magasin.set("karria.notifications.reponse", "peut-etre");
    await expect(lireReponseNotifications()).resolves.toBeNull();
  });
});
