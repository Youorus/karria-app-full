/**
 * Le calme tactile (`calme-tactile.ts`) : deux secondes après le dernier
 * toucher, pas une de moins.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  CALME_MS,
  delaiAvantCalme,
  noterToucher,
  oublierLesTouchersPourLesTests,
} from "./calme-tactile";

describe("Le calme tactile", () => {
  beforeEach(() => oublierLesTouchersPourLesTests());

  it("ne fait rien attendre quand personne n'a touché", () => {
    expect(delaiAvantCalme(1_000)).toBe(0);
  });

  it("fait attendre ce qui reste des deux secondes", () => {
    noterToucher(10_000);
    expect(delaiAvantCalme(10_000)).toBe(CALME_MS);
    expect(delaiAvantCalme(10_000 + 500)).toBe(CALME_MS - 500);
    expect(delaiAvantCalme(10_000 + CALME_MS)).toBe(0);
    expect(delaiAvantCalme(10_000 + CALME_MS + 1)).toBe(0);
  });

  it("repart à chaque toucher", () => {
    noterToucher(10_000);
    noterToucher(11_500);
    expect(delaiAvantCalme(12_000)).toBe(1_500);
  });
});
