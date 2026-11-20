/**
 * Le journal des sollicitations du lancement (`sollicitations.ts`) : chacun
 * note, la demande d'avis lit.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  derniereSollicitation,
  noterSollicitation,
  oublierLesSollicitations,
} from "./sollicitations";

describe("les sollicitations du lancement", () => {
  beforeEach(() => oublierLesSollicitations());

  it("ne sait rien tant que rien n'a été demandé", () => {
    expect(derniereSollicitation("consentement-pub")).toBeNull();
    expect(derniereSollicitation("proposition-abonnement")).toBeNull();
  });

  it("retient la dernière fois, par genre", () => {
    noterSollicitation("proposition-abonnement", 1_000);
    noterSollicitation("proposition-abonnement", 5_000);
    expect(derniereSollicitation("proposition-abonnement")).toBe(5_000);
    expect(derniereSollicitation("consentement-pub")).toBeNull();
    noterSollicitation("consentement-pub", 2_000);
    expect(derniereSollicitation("consentement-pub")).toBe(2_000);
  });
});
