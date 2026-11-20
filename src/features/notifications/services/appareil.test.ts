/**
 * La fiche de l'appareil.
 *
 * Ce que ces tests protègent : la fiche porte la permission et le jeton
 * qu'on lui donne — c'est elle que le serveur lit pour décider d'envoyer
 * ou non — et sa région est celle que la connexion annonce
 * (`lib/localisation.ts`, où vit la lecture).
 */

import { describe, expect, it } from "@jest/globals";

import { lireLocalisation, regionDepuisLangue } from "@/lib/localisation";
import { decrireAppareil } from "./appareil";

describe("La fiche", () => {
  it("porte la permission et le jeton tels qu'on les lui donne", () => {
    const fiche = decrireAppareil("granted", "ExponentPushToken[abc]");
    expect(fiche.permissionPush).toBe("granted");
    expect(fiche.jetonPush).toBe("ExponentPushToken[abc]");
    expect(["ios", "android"]).toContain(fiche.plateforme);
    expect(typeof fiche.appareilPhysique).toBe("boolean");
  });

  it("porte la langue, le fuseau et la région lus une seule fois, au même endroit", () => {
    const fiche = decrireAppareil("granted", null);
    const { langue, fuseauHoraire } = lireLocalisation();
    expect(fiche.langue).toBe(langue);
    expect(fiche.fuseauHoraire).toBe(fuseauHoraire);
    expect(fiche.region).toBe(regionDepuisLangue(langue));
  });

  it("accepte un appareil sans jeton", () => {
    expect(decrireAppareil("undetermined", null).jetonPush).toBeNull();
  });
});
