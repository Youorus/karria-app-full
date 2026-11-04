/**
 * Le compteur d'impressions (`journal-impressions.ts`) : par emplacement,
 * par jour, persistant, élagué à sept jours.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  compterImpression,
  jourDe,
  lireImpressions,
  reinitialiserImpressionsPourLesTests,
  type Journal,
} from "./journal-impressions";

const mockLocal = new Map<string, unknown>();
jest.mock("@/lib/magasin-local", () => ({
  lireLocal: (cle: string, parDefaut: unknown, valider: (v: unknown) => boolean) => {
    const valeur = mockLocal.get(cle);
    return Promise.resolve(mockLocal.has(cle) && valider(valeur) ? valeur : parDefaut);
  },
  ecrireLocal: (cle: string, valeur: unknown) => {
    mockLocal.set(cle, JSON.parse(JSON.stringify(valeur)));
    return Promise.resolve();
  },
}));

const JOUR = 24 * 60 * 60 * 1000;
const AUJOURDHUI = Date.UTC(2026, 10, 5, 12);

async function laisserEcrire() {
  await new Promise((r) => setTimeout(r, 0));
}

describe("Le compteur d'impressions", () => {
  beforeEach(() => {
    mockLocal.clear();
    reinitialiserImpressionsPourLesTests();
  });

  it("compte par emplacement et par jour", async () => {
    compterImpression("galerie", AUJOURDHUI);
    compterImpression("galerie", AUJOURDHUI);
    compterImpression("cv", AUJOURDHUI);
    compterImpression("galerie", AUJOURDHUI + JOUR);
    const journal = await lireImpressions();
    expect(journal.galerie).toEqual({
      [jourDe(AUJOURDHUI)]: 2,
      [jourDe(AUJOURDHUI + JOUR)]: 1,
    });
    expect(journal.cv).toEqual({ [jourDe(AUJOURDHUI)]: 1 });
  });

  it("écrit dans le magasin local et reprend ce qui y était", async () => {
    const ancien: Journal = { fil: { [jourDe(AUJOURDHUI)]: 4 } };
    mockLocal.set("karria.publicite.impressions", ancien);
    compterImpression("fil", AUJOURDHUI);
    await laisserEcrire();
    expect(await lireImpressions()).toEqual({ fil: { [jourDe(AUJOURDHUI)]: 5 } });
    expect(mockLocal.get("karria.publicite.impressions")).toEqual({
      fil: { [jourDe(AUJOURDHUI)]: 5 },
    });
  });

  it("oublie les jours au-delà de sept", async () => {
    mockLocal.set("karria.publicite.impressions", {
      fil: { [jourDe(AUJOURDHUI - 10 * JOUR)]: 9, [jourDe(AUJOURDHUI - 6 * JOUR)]: 2 },
    });
    compterImpression("fil", AUJOURDHUI);
    await laisserEcrire();
    expect(await lireImpressions()).toEqual({
      fil: { [jourDe(AUJOURDHUI - 6 * JOUR)]: 2, [jourDe(AUJOURDHUI)]: 1 },
    });
  });

  it("ignore un magasin corrompu", async () => {
    mockLocal.set("karria.publicite.impressions", { fil: "beaucoup" });
    compterImpression("fil", AUJOURDHUI);
    await laisserEcrire();
    expect(await lireImpressions()).toEqual({ fil: { [jourDe(AUJOURDHUI)]: 1 } });
  });
});
