/**
 * La langue, la région et le fuseau de l'appareil.
 *
 * Ce que ces tests protègent : la région se déduit de la langue sans
 * jamais l'inventer, et ce qui part vers le serveur à la connexion a la
 * forme exacte qu'il attend — ou ne part pas.
 */

import { describe, expect, it } from "@jest/globals";

import { lireLocalisation, origineAppareil, regionDepuisLangue } from "./localisation";

describe("La région", () => {
  it("se lit dans la langue quand elle y est", () => {
    expect(regionDepuisLangue("fr-FR")).toBe("FR");
    expect(regionDepuisLangue("fr_BE")).toBe("BE");
    expect(regionDepuisLangue("zh-Hant-TW")).toBe("TW");
  });

  it("n'est pas inventée quand la langue ne la dit pas", () => {
    expect(regionDepuisLangue("fr")).toBeNull();
    expect(regionDepuisLangue(null)).toBeNull();
  });
});

describe("La localisation", () => {
  it("se lit sans permission, et rend toujours les deux clés", () => {
    const localisation = lireLocalisation();
    expect(Object.keys(localisation).sort()).toEqual(["fuseauHoraire", "langue"]);
  });
});

describe("L'origine jointe à la connexion", () => {
  it("porte la région en deux majuscules et le fuseau tel quel", () => {
    expect(
      origineAppareil({ langue: "fr-BE", fuseauHoraire: "Europe/Brussels" }),
    ).toEqual({
      region: "BE",
      timezone: "Europe/Brussels",
    });
    expect(
      origineAppareil({
        langue: "es-ar",
        fuseauHoraire: "America/Argentina/Buenos_Aires",
      }),
    ).toEqual({ region: "AR", timezone: "America/Argentina/Buenos_Aires" });
  });

  it("omet la région que la langue ne dit pas, sans toucher au fuseau", () => {
    expect(origineAppareil({ langue: "fr", fuseauHoraire: "Africa/Douala" })).toEqual({
      timezone: "Africa/Douala",
    });
    // « es-419 » : l'Amérique latine n'est pas un pays.
    expect(origineAppareil({ langue: "es-419", fuseauHoraire: null })).toEqual({});
    // « ZZ » : la « région inconnue » d'Unicode.
    expect(origineAppareil({ langue: "en-ZZ", fuseauHoraire: "UTC" })).toEqual({
      timezone: "UTC",
    });
  });

  it("omet un fuseau hors forme ou trop long plutôt que de l'envoyer", () => {
    for (const fuseauHoraire of [
      "",
      "+02:00",
      "Europe/",
      "Europe Paris",
      "E".repeat(65),
    ]) {
      expect(origineAppareil({ langue: "fr-FR", fuseauHoraire })).toEqual({
        region: "FR",
      });
    }
  });

  it("ne dit rien quand l'appareil ne dit rien", () => {
    expect(origineAppareil({ langue: null, fuseauHoraire: null })).toEqual({});
  });

  it("lit l'appareil quand on ne lui donne rien", () => {
    const origine = origineAppareil();
    for (const cle of Object.keys(origine)) {
      expect(["region", "timezone"]).toContain(cle);
    }
  });
});
