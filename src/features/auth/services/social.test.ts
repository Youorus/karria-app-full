import { beforeEach, describe, expect, it, jest } from "@jest/globals";

/**
 * L'obtention d'un justificatif auprès d'Apple et de Google.
 *
 * ═══ Ce qui est simulé, et ce qui ne l'est jamais ═══
 *
 * Les deux bibliothèques natives, parce qu'elles parlent au système.
 * **Jamais** les services d'Apple ou de Google eux-mêmes : un test qui
 * ouvrirait une vraie feuille de connexion serait ininterprétable, et
 * prouverait surtout qu'un humain est devant l'écran.
 *
 * ═══ Ce qu'on éprouve ═══
 *
 * Les chemins qu'on ne peut pas reproduire à la main de façon fiable :
 * l'annulation, le jeton absent, les Play Services manquants. Ce sont
 * exactement ceux qui échouent en silence en production.
 */

// Les SDK réels, jamais le justificatif simulé : c'est leur traduction
// qu'on éprouve ici, quoi que dise le `.env` du poste.
jest.mock("@/lib/config", () => ({ SIMULATION: false, API_URL: "http://test" }));

jest.mock("expo-apple-authentication", () => ({
  isAvailableAsync: jest.fn(),
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock("expo-crypto", () => ({
  digestStringAsync: jest.fn(async () => "sha256-du-nonce"),
  getRandomBytes: jest.fn(() => new Uint8Array(32).fill(7)),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  isErrorWithCode: (e: unknown) =>
    typeof e === "object" && e !== null && "code" in (e as object),
  statusCodes: {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  },
}));

const mockApple = jest.requireMock("expo-apple-authentication") as Record<
  string,
  jest.Mock
>;
const mockGoogle = (
  jest.requireMock("@react-native-google-signin/google-signin") as {
    GoogleSignin: Record<string, jest.Mock>;
  }
).GoogleSignin;

/* eslint-disable import/first -- après les `jest.mock`, qui doivent être
   posés avant le chargement du module testé. */
import { Platform } from "react-native";

import { connexionApple, connexionGoogle } from "./social";

const JETON = "eyJhbGciOiJSUzI1NiJ9.charge.signature";

beforeEach(() => {
  jest.clearAllMocks();
  mockGoogle.hasPlayServices.mockResolvedValue(true as never);
});

describe("Apple", () => {
  it("rend le jeton et le nonce en clair, sans demander le nom", async () => {
    mockApple.signInAsync.mockResolvedValue({
      identityToken: JETON,
      fullName: { givenName: "Marc", familyName: "Takoumba" },
    } as never);

    const resultat = await connexionApple();

    expect(resultat).toMatchObject({
      resultat: "obtenu",
      fournisseur: "apple",
      jeton: JETON,
    });
    // Karria ne stocke plus de nom : il n'est ni demandé, ni remonté.
    expect(resultat).not.toHaveProperty("prenom");
    expect(mockApple.signInAsync.mock.calls[0]![0]).toMatchObject({
      requestedScopes: [1],
    });
    // Le nonce transmis est celui **en clair** ; Apple, lui, reçoit son
    // haché. Confondre les deux ferait échouer la comparaison serveur.
    expect(resultat).toHaveProperty("nonce");
    expect((resultat as { nonce: string }).nonce).not.toBe("sha256-du-nonce");
    expect(mockApple.signInAsync.mock.calls[0]![0]).toMatchObject({
      nonce: "sha256-du-nonce",
    });
  });

  it("traite la fermeture de la feuille comme une annulation", async () => {
    // Et non comme une erreur : afficher « une erreur est survenue » à
    // quelqu'un qui a changé d'avis est le message le plus agaçant
    // qu'une application puisse produire.
    mockApple.signInAsync.mockRejectedValue({ code: "ERR_REQUEST_CANCELED" } as never);

    await expect(connexionApple()).resolves.toEqual({ resultat: "annulee" });
  });

  it("échoue proprement quand Apple ne transmet aucun jeton", async () => {
    mockApple.signInAsync.mockResolvedValue({ identityToken: null } as never);

    const resultat = await connexionApple();

    expect(resultat.resultat).toBe("echec");
  });
});

describe("Google", () => {
  it("rend le jeton d'identité", async () => {
    mockGoogle.signIn.mockResolvedValue({
      type: "success",
      data: { idToken: JETON },
    } as never);

    await expect(connexionGoogle()).resolves.toMatchObject({
      resultat: "obtenu",
      fournisseur: "google",
      jeton: JETON,
    });
  });

  it("ne remonte aucun nom", async () => {
    // Google les met dans le jeton, donc signés. Les remonter à part
    // reviendrait à préférer une valeur non vérifiée à une vérifiée.
    mockGoogle.signIn.mockResolvedValue({
      type: "success",
      data: { idToken: JETON, user: { givenName: "Marc", familyName: "Takoumba" } },
    } as never);

    const resultat = await connexionGoogle();

    expect(resultat).not.toHaveProperty("prenom");
  });

  it("traite l'annulation du sélecteur comme une annulation", async () => {
    mockGoogle.signIn.mockResolvedValue({ type: "cancelled" } as never);

    await expect(connexionGoogle()).resolves.toEqual({ resultat: "annulee" });
  });

  it("traite un second appui comme une annulation", async () => {
    mockGoogle.signIn.mockRejectedValue({ code: "IN_PROGRESS" } as never);

    await expect(connexionGoogle()).resolves.toEqual({ resultat: "annulee" });
  });

  it("échoue lisiblement quand l'idToken est absent", async () => {
    // Le symptôme d'un `webClientId` manquant : la connexion aboutit,
    // et le jeton vaut null. L'échec le plus déroutant qui soit.
    mockGoogle.signIn.mockResolvedValue({
      type: "success",
      data: { idToken: null },
    } as never);

    const resultat = await connexionGoogle();

    expect(resultat.resultat).toBe("echec");
  });

  it("oriente vers l'e-mail quand les Play Services manquent", async () => {
    // Sur un appareil sans services Google, aucune insistance ne peut
    // aboutir : on dit quoi faire à la place.
    //
    // La plateforme est forcée : le contrôle des Play Services n'existe
    // que sur Android, et le préréglage de test rend « ios ». Sans cette
    // ligne, le test passait à côté du chemin qu'il prétend éprouver.
    Object.defineProperty(Platform, "OS", { value: "android", configurable: true });
    mockGoogle.hasPlayServices.mockRejectedValue({
      code: "PLAY_SERVICES_NOT_AVAILABLE",
    } as never);

    try {
      const resultat = await connexionGoogle();

      expect(resultat.resultat).toBe("echec");
      expect((resultat as { message: string }).message).toContain("e-mail");
    } finally {
      Object.defineProperty(Platform, "OS", { value: "ios", configurable: true });
    }
  });
});
