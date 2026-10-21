/**
 * Le lien d'une notification devient un chemin — ou rien.
 *
 * Ce que ces tests protègent : le schéma de l'application et le domaine
 * de Karria mènent au même écran ; tout autre lien est ignoré, pour qu'une
 * notification ne puisse jamais ouvrir autre chose qu'un écran à nous.
 */

import { describe, expect, it } from "@jest/globals";

import { cheminDepuisUrl } from "./liens";

describe("Le chemin d'une notification", () => {
  it("lit le schéma de l'application", () => {
    expect(cheminDepuisUrl("karria://offre/150279")).toBe("/offre/150279");
    expect(cheminDepuisUrl("karria:///cv")).toBe("/cv");
  });

  it("lit un lien universel vers le domaine de Karria, requête comprise", () => {
    expect(cheminDepuisUrl("https://karria.fr/offre/150279?source=push")).toBe(
      "/offre/150279?source=push",
    );
  });

  it("accepte un chemin déjà relatif", () => {
    expect(cheminDepuisUrl("/offres")).toBe("/offres");
  });

  it("refuse tout ce qui ne mène pas à un écran de Karria", () => {
    expect(cheminDepuisUrl("https://exemple.fr/piege")).toBeNull();
    expect(cheminDepuisUrl("karria://")).toBeNull();
    expect(cheminDepuisUrl("/")).toBeNull();
    expect(cheminDepuisUrl(42)).toBeNull();
    expect(cheminDepuisUrl(undefined)).toBeNull();
  });
});
