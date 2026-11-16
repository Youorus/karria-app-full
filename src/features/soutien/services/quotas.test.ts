/**
 * Les plafonds d'IA (`quotas.ts`) : reconnus à leur raison, et l'abonnement
 * n'est proposé qu'à qui ne l'a pas.
 */

import { describe, expect, it } from "@jest/globals";

import { ErreurApi } from "@/lib/http";

import { quotaAtteint } from "./quotas";

describe("Un plafond d'IA atteint", () => {
  it("se reconnaît à sa raison et garde le message du serveur", () => {
    const quota = quotaAtteint(
      new ErreurApi(
        "Tu as utilisé tes 20 dossiers du mois.",
        429,
        "dossier_quota_exceeded",
        undefined,
        {
          subscriber: false,
        },
      ),
    );
    expect(quota).toEqual({
      message: "Tu as utilisé tes 20 dossiers du mois.",
      proposerSansPub: true,
    });
    expect(
      quotaAtteint(new ErreurApi("x", 429, "assistant_rate_limited")),
    ).not.toBeNull();
  });

  it("ne propose pas l'abonnement à un abonné", () => {
    const quota = quotaAtteint(
      new ErreurApi("x", 429, "letter_quota_exceeded", undefined, { subscriber: true }),
    );
    expect(quota?.proposerSansPub).toBe(false);
  });

  it("ignore le frein de l'instant, les autres erreurs et ce qui n'est pas une erreur d'API", () => {
    expect(quotaAtteint(new ErreurApi("x", 429, "ai_rate_limited"))).toBeNull();
    expect(quotaAtteint(new ErreurApi("x", 404, "dossier_quota_exceeded"))).toBeNull();
    expect(quotaAtteint(new Error("boom"))).toBeNull();
  });
});
