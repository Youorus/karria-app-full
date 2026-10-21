/**
 * Les raisons de départ proposées à l'écran sont exactement celles du
 * contrat : une raison inventée côté app serait refusée par le serveur,
 * et la personne ne pourrait plus partir.
 */

import { describe, expect, it } from "@jest/globals";

import { RAISONS_DE_DEPART } from "@/features/auth/types/auth.types";

import {
  bornerDetails,
  DETAILS_MAX,
  proposeLesNotifications,
  RAISONS,
  reactionA,
} from "./raisons-depart";

describe("Les raisons de départ", () => {
  it("couvrent toute la liste du contrat, une fois chacune", () => {
    expect(RAISONS.map((r) => r.code).sort()).toEqual([...RAISONS_DE_DEPART].sort());
  });

  it("félicitent quand on a trouvé un emploi, et proposent de régler les notifications", () => {
    expect(reactionA("found_job")).toMatch(/Félicitations/);
    expect(proposeLesNotifications("too_many_notifications")).toBe(true);
    expect(proposeLesNotifications("other")).toBe(false);
    expect(reactionA(null)).toBeNull();
  });

  it("bornent le détail à la limite du contrat sans refuser la saisie", () => {
    expect(bornerDetails("x".repeat(DETAILS_MAX + 50))).toHaveLength(DETAILS_MAX);
    expect(bornerDetails("court")).toBe("court");
  });
});
