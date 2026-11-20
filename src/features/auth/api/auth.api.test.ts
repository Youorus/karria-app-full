/**
 * L'origine du compte (`auth.api.ts`) : la région et le fuseau du
 * téléphone partent avec les requêtes qui peuvent **créer** un compte —
 * la validation du code, Apple, Google — et avec elles seulement. Une
 * valeur inconnue ne part pas : la clé manque, et la connexion se fait
 * pareil (`docs/contrat-api-compte.md`, « D'où vient le compte »).
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import type { OrigineAppareil } from "@/lib/localisation";
import { connecterAvec, demanderCode, renvoyerCode, verifierCode } from "./auth.api";

const mockPost =
  jest.fn<
    (chemin: string, corps: Record<string, unknown>, options: unknown) => Promise<unknown>
  >();
const mockOrigine = jest.fn<() => OrigineAppareil>();

jest.mock("@/lib/http", () => ({
  http: {
    post: (chemin: string, corps: Record<string, unknown>, options: unknown) =>
      mockPost(chemin, corps, options),
  },
}));

jest.mock("@/lib/localisation", () => ({
  origineAppareil: () => mockOrigine(),
}));

const CONNEXION = {
  session: { access_token: "acces", refresh_token: "rafraichissement" },
  user: { id: "0b7e6c1a-52f4-4d0e-9a51-6a2f4f1d9c11", email: "awa@exemple.fr" },
  created_account: true,
};
const PARCOURS = {
  challenge_id: "c1",
  sent_to: "a•••@exemple.fr",
  expires_in: 600,
  seconds_before_resend: 30,
};

function corpsEnvoye(): Record<string, unknown> {
  return mockPost.mock.calls[0][1];
}

beforeEach(() => {
  mockPost.mockReset();
  mockOrigine.mockReset();
  mockOrigine.mockReturnValue({ region: "BE", timezone: "Europe/Brussels" });
});

describe("La validation du code", () => {
  it("joint la région et le fuseau du téléphone", async () => {
    mockPost.mockResolvedValue(CONNEXION);

    const connexion = await verifierCode("c1", "123456");

    expect(mockPost.mock.calls[0][0]).toBe("/auth/email/verify");
    expect(corpsEnvoye()).toEqual({
      challenge_id: "c1",
      code: "123456",
      region: "BE",
      timezone: "Europe/Brussels",
    });
    expect(connexion.compteCree).toBe(true);
  });

  it("n'envoie aucune clé quand l'appareil ne dit rien", async () => {
    mockOrigine.mockReturnValue({});
    mockPost.mockResolvedValue(CONNEXION);

    await verifierCode("c1", "123456");

    expect(corpsEnvoye()).toEqual({ challenge_id: "c1", code: "123456" });
  });

  it("n'envoie que ce qui est connu", async () => {
    mockOrigine.mockReturnValue({ timezone: "Africa/Douala" });
    mockPost.mockResolvedValue(CONNEXION);

    await verifierCode("c1", "123456");

    expect(corpsEnvoye()).not.toHaveProperty("region");
    expect(corpsEnvoye().timezone).toBe("Africa/Douala");
  });
});

describe("Apple et Google", () => {
  it("joignent la région et le fuseau, à côté du consentement", async () => {
    mockPost.mockResolvedValue(CONNEXION);

    await connecterAvec("google", "jeton", "nonce");

    expect(mockPost.mock.calls[0][0]).toBe("/auth/social/google");
    expect(corpsEnvoye()).toMatchObject({
      id_token: "jeton",
      nonce: "nonce",
      region: "BE",
      timezone: "Europe/Brussels",
    });
    expect(typeof corpsEnvoye().terms_version).toBe("string");
    expect(typeof corpsEnvoye().privacy_policy_version).toBe("string");
  });

  it("valent aussi pour Apple, sans nonce", async () => {
    mockPost.mockResolvedValue(CONNEXION);

    await connecterAvec("apple", "jeton");

    expect(mockPost.mock.calls[0][0]).toBe("/auth/social/apple");
    expect(corpsEnvoye()).toMatchObject({
      identity_token: "jeton",
      nonce: null,
      region: "BE",
      timezone: "Europe/Brussels",
    });
  });
});

describe("Les requêtes qui ne créent pas de compte", () => {
  it("ne portent ni région ni fuseau", async () => {
    mockPost.mockResolvedValue(PARCOURS);

    await demanderCode("awa@exemple.fr");
    await renvoyerCode("c1");

    for (const [, corps] of mockPost.mock.calls) {
      expect(corps).not.toHaveProperty("region");
      expect(corps).not.toHaveProperty("timezone");
    }
    expect(mockOrigine).not.toHaveBeenCalled();
  });
});
