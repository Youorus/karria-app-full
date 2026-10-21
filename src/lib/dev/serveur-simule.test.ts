/**
 * Le faux serveur : il fige le contrat du futur backend.
 *
 * Ces tests protègent ce que les écrans supposent — le code 000000 ouvre
 * une session, un autre code produit l'erreur que `erreurs-auth.ts` sait
 * traduire — et le fait qu'aucune réponse ne contienne de nom.
 */

import { describe, expect, it, jest } from "@jest/globals";

import { CODE_SIMULATION, repondreEnSimulation } from "./serveur-simule";

jest.setTimeout(10_000);

/** Ce que ces tests lisent dans les réponses — et rien d'autre. */
interface Corps {
  challenge_id: string;
  session: { access_token: string };
  user: Record<string, string>;
  error: { details: { reason: string } };
}

async function appeler(methode: string, chemin: string, corps?: unknown) {
  const reponse = await repondreEnSimulation({ chemin, methode, corps, jeton: null });
  return { statut: reponse.status, corps: (await reponse.json()) as Corps };
}

describe("La connexion par e-mail simulée", () => {
  it("ouvre une session avec le code de simulation, sans nom ni téléphone", async () => {
    const depart = await appeler("POST", "/auth/email/start", { email: "a@b.fr" });
    expect(depart.statut).toBe(200);

    const fin = await appeler("POST", "/auth/email/verify", {
      challenge_id: depart.corps.challenge_id,
      code: CODE_SIMULATION,
    });
    expect(fin.statut).toBe(200);
    expect(fin.corps.session.access_token).toEqual(expect.any(String));
    expect(Object.keys(fin.corps.user).sort()).toEqual(["email", "id"]);
  });

  it("refuse un mauvais code avec la raison que l'application sait lire", async () => {
    const depart = await appeler("POST", "/auth/email/start", { email: "a@b.fr" });
    const fin = await appeler("POST", "/auth/email/verify", {
      challenge_id: depart.corps.challenge_id,
      code: "123456",
    });
    expect(fin.statut).toBe(400);
    expect(fin.corps.error.details.reason).toBe("auth_code_invalid");
  });
});

describe("La suppression du compte simulée", () => {
  async function ouvrirUneSession(): Promise<string> {
    const depart = await appeler("POST", "/auth/email/start", { email: "a@b.fr" });
    const fin = await appeler("POST", "/auth/email/verify", {
      challenge_id: depart.corps.challenge_id,
      code: CODE_SIMULATION,
    });
    return fin.corps.session.access_token;
  }

  it("répond 204 sans corps, et la session ne connaît plus le compte", async () => {
    const jeton = await ouvrirUneSession();
    const reponse = await repondreEnSimulation({
      chemin: "/auth/me",
      methode: "DELETE",
      corps: { reason: "found_job", details: "Merci pour tout !" },
      jeton,
    });
    expect(reponse.status).toBe(204);
    expect(await reponse.text()).toBe("");
  });

  it("accepte un détail absent", async () => {
    const reponse = await repondreEnSimulation({
      chemin: "/auth/me",
      methode: "DELETE",
      corps: { reason: "other", details: null },
      jeton: await ouvrirUneSession(),
    });
    expect(reponse.status).toBe(204);
  });

  it("refuse une raison hors de la liste du contrat", async () => {
    const fin = await appeler("DELETE", "/auth/me", { reason: "bored", details: null });
    expect(fin.statut).toBe(422);
    expect(fin.corps.error.details.reason).toBe("account_deletion_reason_invalid");
  });

  it("refuse un détail de plus de 1 000 caractères", async () => {
    const fin = await appeler("DELETE", "/auth/me", {
      reason: "other",
      details: "x".repeat(1_001),
    });
    expect(fin.statut).toBe(422);
    expect(fin.corps.error.details.reason).toBe("account_deletion_details_too_long");
  });
});
