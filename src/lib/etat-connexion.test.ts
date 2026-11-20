/**
 * L'état vivant de la connexion (`etat-connexion.ts`) : ce que le bandeau
 * affiche au fil des événements, et le signal de retour.
 *
 * Ce que ces tests protègent : « Connexion rétablie » dure deux secondes et
 * ne s'affiche que pour un retour **constaté** ; un état instable oublié
 * s'efface sans rien annoncer ni relancer ; un réseau qui va et vient ne
 * déclenche pas une relance à chaque battement.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  DUREE_RETABLIE_MS,
  ECART_RELANCES_MS,
  FENETRE_SALVE_MS,
  OUBLI_INSTABLE_MS,
} from "./connexion";
import {
  auMomentDeRelireAppareil,
  estSansReseau,
  lireAffichage,
  lireVersionRetour,
  masquerBandeauConnexion,
  noterAppareil,
  noterEchecReseau,
  noterSuccesReseau,
  reinitialiserConnexion,
} from "./etat-connexion";

/** Deux incidents distincts : de quoi passer à « instable ». */
function deuxIncidents() {
  noterEchecReseau();
  jest.advanceTimersByTime(FENETRE_SALVE_MS);
  noterEchecReseau();
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-11-20T10:00:00Z"));
  reinitialiserConnexion();
  noterAppareil("en-ligne");
  // Chaque test repart d'un passé sans relance récente.
  jest.advanceTimersByTime(ECART_RELANCES_MS);
});

afterEach(() => {
  auMomentDeRelireAppareil(null);
  reinitialiserConnexion();
  jest.useRealTimers();
});

describe("Hors ligne", () => {
  it("s'affiche dès que l'appareil le dit, puis « rétablie » deux secondes", () => {
    expect(lireAffichage()).toBe("aucun");
    noterAppareil("sans-reseau");
    expect(lireAffichage()).toBe("hors-ligne");

    noterAppareil("en-ligne");
    expect(lireAffichage()).toBe("retablie");
    jest.advanceTimersByTime(DUREE_RETABLIE_MS - 1);
    expect(lireAffichage()).toBe("retablie");
    jest.advanceTimersByTime(1);
    expect(lireAffichage()).toBe("aucun");
  });

  it("une rechute pendant « rétablie » reprend la main, sans minuterie fantôme", () => {
    noterAppareil("sans-reseau");
    noterAppareil("en-ligne");
    noterAppareil("sans-reseau");
    jest.advanceTimersByTime(DUREE_RETABLIE_MS * 2);
    expect(lireAffichage()).toBe("hors-ligne");
  });

  it("refuse les actions sans aucun réseau, et fait relire l'appareil", () => {
    const relire = jest.fn();
    auMomentDeRelireAppareil(relire);
    expect(estSansReseau()).toBe(false);
    expect(relire).not.toHaveBeenCalled();

    noterAppareil("sans-reseau");
    expect(estSansReseau()).toBe(true);
    expect(relire).toHaveBeenCalledTimes(1);

    noterAppareil("sans-internet");
    expect(estSansReseau()).toBe(false);
  });
});

describe("Instable", () => {
  it("ne s'affiche qu'au deuxième incident, et part au premier succès", () => {
    noterEchecReseau();
    expect(lireAffichage()).toBe("aucun");
    jest.advanceTimersByTime(FENETRE_SALVE_MS);
    noterEchecReseau();
    expect(lireAffichage()).toBe("instable");

    noterSuccesReseau();
    expect(lireAffichage()).toBe("retablie");
    jest.advanceTimersByTime(DUREE_RETABLIE_MS);
    expect(lireAffichage()).toBe("aucun");
  });

  it("s'efface sans rien annoncer quand plus rien ne l'étaye", () => {
    deuxIncidents();
    const avant = lireVersionRetour();
    jest.advanceTimersByTime(OUBLI_INSTABLE_MS - 1);
    expect(lireAffichage()).toBe("instable");
    jest.advanceTimersByTime(1);
    expect(lireAffichage()).toBe("aucun");
    expect(lireVersionRetour()).toBe(avant);
  });

  it("chaque nouvel échec repousse l'oubli", () => {
    deuxIncidents();
    jest.advanceTimersByTime(OUBLI_INSTABLE_MS - 1_000);
    noterEchecReseau();
    jest.advanceTimersByTime(OUBLI_INSTABLE_MS - 1_000);
    expect(lireAffichage()).toBe("instable");
    jest.advanceTimersByTime(1_000);
    expect(lireAffichage()).toBe("aucun");
  });

  it("devient « hors ligne » si l'appareil perd le réseau", () => {
    deuxIncidents();
    noterAppareil("sans-reseau");
    expect(lireAffichage()).toBe("hors-ligne");
  });
});

describe("Le signal de retour", () => {
  it("bouge une fois par retour constaté", () => {
    const depart = lireVersionRetour();
    noterAppareil("sans-reseau");
    expect(lireVersionRetour()).toBe(depart);
    noterAppareil("en-ligne");
    expect(lireVersionRetour()).toBe(depart + 1);
    noterSuccesReseau();
    expect(lireVersionRetour()).toBe(depart + 1);
  });

  it("ne bouge pas deux fois en moins de cinq secondes", () => {
    const depart = lireVersionRetour();
    noterAppareil("sans-reseau");
    noterAppareil("en-ligne");
    noterAppareil("sans-reseau");
    noterAppareil("en-ligne");
    expect(lireVersionRetour()).toBe(depart + 1);

    jest.advanceTimersByTime(ECART_RELANCES_MS);
    noterAppareil("sans-reseau");
    noterAppareil("en-ligne");
    expect(lireVersionRetour()).toBe(depart + 2);
  });
});

describe("Fermer le bandeau", () => {
  it("le fait taire jusqu'au prochain changement d'état", () => {
    noterAppareil("sans-reseau");
    masquerBandeauConnexion();
    expect(lireAffichage()).toBe("aucun");
    // Le même état redit par l'appareil ne le fait pas reparaître.
    noterAppareil("sans-reseau");
    expect(lireAffichage()).toBe("aucun");

    noterAppareil("en-ligne");
    expect(lireAffichage()).toBe("retablie");
    jest.advanceTimersByTime(DUREE_RETABLIE_MS);
    noterAppareil("sans-reseau");
    expect(lireAffichage()).toBe("hors-ligne");
  });
});
