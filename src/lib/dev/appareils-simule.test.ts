/**
 * Le faux serveur des appareils : il fige le contrat `/devices`.
 *
 * Ce que ces tests protègent : une fiche complète est acceptée et
 * `push_enabled` ne vaut vrai qu'avec permission **et** jeton ; une fiche
 * bancale est refusée en nommant le champ ; la désinscription est
 * idempotente — elle réussit même pour un inconnu, pour ne jamais bloquer
 * une déconnexion.
 */

import { describe, expect, it } from "@jest/globals";

import {
  appareilSimule,
  estUneRouteAppareil,
  repondreAppareils,
} from "./appareils-simule";

const FICHE = {
  platform: "ios",
  push_token: "ExponentPushToken[abc]",
  push_permission: "granted",
  os_name: "iOS",
  os_version: "26.0",
  device_brand: "Apple",
  device_manufacturer: "Apple",
  device_model: "iPhone 17",
  device_model_id: "iPhone18,3",
  device_year_class: 2025,
  is_physical_device: true,
  app_version: "0.1.0",
  app_build: "12",
  locale: "fr-FR",
  timezone: "Europe/Paris",
  region: "FR",
};

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = repondreAppareils(methode, chemin, corps);
  const texte = await reponse.text();
  return {
    statut: reponse.status,
    corps: texte === "" ? null : (JSON.parse(texte) as Record<string, unknown>),
  };
}

describe("Les routes des appareils", () => {
  it("se reconnaissent à leur préfixe", () => {
    expect(estUneRouteAppareil("/devices/abc-123")).toBe(true);
    expect(estUneRouteAppareil("/auth/me")).toBe(false);
  });
});

describe("L'enregistrement d'un appareil", () => {
  it("accepte une fiche complète et active le push", async () => {
    const { statut, corps } = await appeler("PUT", "/devices/inst-1", FICHE);
    expect(statut).toBe(200);
    expect(corps).toEqual({ installation_id: "inst-1", push_enabled: true });
    expect(appareilSimule("inst-1")).toMatchObject({ device_model: "iPhone 17" });
  });

  it("n'active pas le push sans jeton, même si la permission est accordée", async () => {
    const { corps } = await appeler("PUT", "/devices/inst-2", {
      ...FICHE,
      push_token: null,
    });
    expect(corps).toMatchObject({ push_enabled: false });
  });

  it("n'active pas le push quand la permission est refusée", async () => {
    const { corps } = await appeler("PUT", "/devices/inst-3", {
      ...FICHE,
      push_permission: "denied",
    });
    expect(corps).toMatchObject({ push_enabled: false });
  });

  it("refuse une fiche bancale en nommant le champ", async () => {
    const { statut, corps } = await appeler("PUT", "/devices/inst-4", {
      ...FICHE,
      platform: "web",
    });
    expect(statut).toBe(422);
    expect(corps).toMatchObject({ error: { details: { field: "platform" } } });
  });
});

describe("La désinscription", () => {
  it("efface la fiche et réussit même pour un inconnu", async () => {
    await appeler("PUT", "/devices/inst-5", FICHE);
    expect((await appeler("DELETE", "/devices/inst-5")).statut).toBe(204);
    expect(appareilSimule("inst-5")).toBeNull();
    expect((await appeler("DELETE", "/devices/jamais-vu")).statut).toBe(204);
  });
});
