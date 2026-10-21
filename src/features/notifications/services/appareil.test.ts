/**
 * La fiche de l'appareil.
 *
 * Ce que ces tests protègent : la région se déduit de la langue sans
 * jamais l'inventer, et la fiche porte la permission et le jeton qu'on lui
 * donne — c'est elle que le serveur lit pour décider d'envoyer ou non.
 */

import { describe, expect, it } from "@jest/globals";

import { decrireAppareil, regionDepuisLangue } from "./appareil";

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

describe("La fiche", () => {
  it("porte la permission et le jeton tels qu'on les lui donne", () => {
    const fiche = decrireAppareil("granted", "ExponentPushToken[abc]");
    expect(fiche.permissionPush).toBe("granted");
    expect(fiche.jetonPush).toBe("ExponentPushToken[abc]");
    expect(["ios", "android"]).toContain(fiche.plateforme);
    expect(typeof fiche.appareilPhysique).toBe("boolean");
  });

  it("accepte un appareil sans jeton", () => {
    expect(decrireAppareil("undetermined", null).jetonPush).toBeNull();
  });
});
