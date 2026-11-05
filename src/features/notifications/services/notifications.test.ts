/**
 * Les familles de notifications, selon la plateforme.
 *
 * Ce que ces tests protègent : sur Android, les familles sont des **canaux**
 * et rien d'autre — une catégorie sans action y est refusée par le système
 * (vu sur l'émulateur le 2026-11-05 : « Must provide at least one action »),
 * et l'avertissement aurait fait croire à un problème de notifications. Sur
 * iOS, les catégories restent posées, avec `customDismissAction`.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

// Les simulacres naissent dans la fabrique : les `import` sont hissés
// au-dessus de toute constante du fichier, une variable d'ici n'y serait pas
// encore définie quand le module testé la lirait.
jest.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  setNotificationCategoryAsync: jest.fn(async () => null),
}));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: null } }));
jest.mock("expo-device", () => ({ isDevice: false }));

/* eslint-disable import/first -- après les `jest.mock`, qui doivent être
   hissés avant tout import du module testé. */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { preparerLesFamilles } from "./notifications";
/* eslint-enable import/first */

const mockCanal = jest.mocked(Notifications.setNotificationChannelAsync);
const mockCategorie = jest.mocked(Notifications.setNotificationCategoryAsync);

const OS_INITIAL = Platform.OS;

function poserPlateforme(os: "ios" | "android") {
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
}

describe("preparerLesFamilles", () => {
  beforeEach(() => {
    mockCanal.mockClear();
    mockCategorie.mockClear();
  });

  afterEach(() => {
    poserPlateforme(OS_INITIAL as "ios" | "android");
  });

  it("sur Android, crée les canaux et ne pose aucune catégorie", async () => {
    poserPlateforme("android");
    await preparerLesFamilles();
    // Le canal par défaut, puis `offres`, `documents`, `compte`.
    expect(mockCanal).toHaveBeenCalledTimes(4);
    expect(mockCategorie).not.toHaveBeenCalled();
  });

  it("sur iOS, pose les trois catégories avec l'action d'effacement", async () => {
    poserPlateforme("ios");
    await preparerLesFamilles();
    expect(mockCanal).not.toHaveBeenCalled();
    expect(mockCategorie).toHaveBeenCalledTimes(3);
    expect(mockCategorie).toHaveBeenCalledWith("offres", [], {
      customDismissAction: true,
    });
  });
});
