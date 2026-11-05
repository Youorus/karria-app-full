/**
 * Le calme tactile (`calme-tactile.ts`) : deux secondes après le dernier
 * toucher par défaut, moins si l'emplacement le demande — et jamais tant
 * qu'un doigt est posé.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  CALME_MS,
  DOIGT_OUBLIE_MS,
  delaiAvantCalme,
  noterFinDeToucher,
  noterToucher,
  oublierLesTouchersPourLesTests,
} from "./calme-tactile";

/** Un toucher bref : posé et levé au même instant. */
function taper(instant: number) {
  noterToucher(instant);
  noterFinDeToucher(instant);
}

describe("Le calme tactile", () => {
  beforeEach(() => oublierLesTouchersPourLesTests());

  it("ne fait rien attendre quand personne n'a touché", () => {
    expect(delaiAvantCalme(1_000)).toBe(0);
  });

  it("fait attendre ce qui reste des deux secondes", () => {
    taper(10_000);
    expect(delaiAvantCalme(10_000)).toBe(CALME_MS);
    expect(delaiAvantCalme(10_000 + 500)).toBe(CALME_MS - 500);
    expect(delaiAvantCalme(10_000 + CALME_MS)).toBe(0);
    expect(delaiAvantCalme(10_000 + CALME_MS + 1)).toBe(0);
  });

  it("repart à chaque toucher", () => {
    taper(10_000);
    taper(11_500);
    expect(delaiAvantCalme(12_000)).toBe(1_500);
  });

  it("accepte un délai plus court pour un emplacement", () => {
    taper(10_000);
    expect(delaiAvantCalme(10_000 + 300, 700)).toBe(400);
    expect(delaiAvantCalme(10_000 + 700, 700)).toBe(0);
    // Le délai par défaut, lui, court toujours.
    expect(delaiAvantCalme(10_000 + 700)).toBe(CALME_MS - 700);
  });

  it("n'est jamais calme tant que le doigt est posé, et repart au lever", () => {
    noterToucher(10_000);
    expect(delaiAvantCalme(10_000 + CALME_MS + 5_000)).toBe(CALME_MS);
    expect(delaiAvantCalme(10_000 + 3_000, 700)).toBe(700);

    noterFinDeToucher(20_000);
    expect(delaiAvantCalme(20_000 + 400, 700)).toBe(300);
    expect(delaiAvantCalme(20_000 + 700, 700)).toBe(0);
  });

  it("tient pour levé un doigt dont la fin de toucher n'est jamais venue", () => {
    noterToucher(10_000);
    expect(delaiAvantCalme(10_000 + DOIGT_OUBLIE_MS - 1)).toBe(CALME_MS);
    expect(delaiAvantCalme(10_000 + DOIGT_OUBLIE_MS)).toBe(0);
  });
});
