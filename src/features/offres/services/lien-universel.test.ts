/**
 * Le lien partagé d'une offre est un lien universel : chez qui a Karria,
 * il ouvre l'app sur `/offre/<id>` (à froid comme à chaud, expo-router
 * lit l'URL de lancement et celles reçues ensuite) ; chez les autres, la
 * page publique du site. Ce que ces tests protègent : le lien que l'on
 * partage est bien celui que l'app sait router, et la déclaration native
 * (domaines associés iOS, filtre d'intention Android) reste en place.
 */

import { describe, expect, it } from "@jest/globals";
import { existsSync } from "node:fs";
import { join } from "node:path";

import app from "../../../../app.json";
import { cheminDepuisUrl } from "@/features/notifications/services/liens";

import { lienPublicOffre } from "./presentation";

describe("Le lien universel d'une offre", () => {
  it("mène à la route /offre/[id] de l'app, par le domaine ou le schéma", () => {
    expect(cheminDepuisUrl(lienPublicOffre("150279"))).toBe("/offre/150279");
    expect(cheminDepuisUrl("https://www.karria.fr/offre/150279")).toBe("/offre/150279");
    expect(cheminDepuisUrl("karria://offre/150279")).toBe("/offre/150279");
    expect(existsSync(join(__dirname, "../../../app/(app)/offre/[id].tsx"))).toBe(true);
  });

  it("est déclaré au système sur iOS et Android", () => {
    expect(app.expo.ios.associatedDomains).toEqual([
      "applinks:karria.fr",
      "applinks:www.karria.fr",
    ]);
    const filtre = app.expo.android.intentFilters[0]!;
    expect(filtre.autoVerify).toBe(true);
    expect(filtre.category).toEqual(["BROWSABLE", "DEFAULT"]);
    expect(filtre.data.map((d) => `${d.scheme}://${d.host}${d.pathPrefix}`)).toEqual([
      "https://karria.fr/offre",
      "https://www.karria.fr/offre",
    ]);
  });
});
