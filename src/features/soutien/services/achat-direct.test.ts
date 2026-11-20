import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import { ErreurApi } from "@/lib/http";
import { poserSansPub } from "@/lib/sans-pub";

import { acheterSansPub } from "./achat-direct";

jest.mock("expo-web-browser", () => ({
  openAuthSessionAsync: jest.fn(async () => ({ type: "dismiss" })),
}));
jest.mock("@/lib/sans-pub", () => ({ poserSansPub: jest.fn() }));

const mockOuvrir = jest.fn<() => Promise<{ id: string; adresse: string }>>();
const mockStatut = jest.fn<() => Promise<{ livre: boolean }>>();
const mockFacturation = jest.fn<() => Promise<{ sansPub: { actif: boolean } }>>();
jest.mock("../api/soutien.api", () => ({
  RETOUR: "karria://paiement",
  ouvrirAbonnement: () => mockOuvrir(),
  lireStatut: () => mockStatut(),
  lireFacturation: () => mockFacturation(),
}));

const mockRetenir = jest.fn(async () => undefined);
const mockOublier = jest.fn(async () => undefined);
jest.mock("./achat-en-attente", () => ({
  retenirAchatEnAttente: () => mockRetenir(),
  oublierAchatEnAttente: () => mockOublier(),
}));

const mockAttendre = jest.fn<(lire: () => Promise<boolean>) => Promise<string>>();
jest.mock("./attente", () => ({
  attendreLaLivraison: (lire: () => Promise<boolean>) => mockAttendre(lire),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockOuvrir.mockResolvedValue({ id: "cs_1", adresse: "https://stripe.test/cs_1" });
  mockStatut.mockResolvedValue({ livre: true });
  mockFacturation.mockResolvedValue({ sansPub: { actif: true } });
  mockAttendre.mockImplementation(async (lire) =>
    (await lire()) ? "livre" : "en_attente",
  );
});

describe("L'abonnement pris sur place", () => {
  it("livré : la session est retenue puis oubliée, le drapeau sans pub est posé", async () => {
    await expect(acheterSansPub()).resolves.toBe("livre");
    expect(mockRetenir).toHaveBeenCalledTimes(1);
    expect(mockOublier).toHaveBeenCalledTimes(1);
    expect(poserSansPub).toHaveBeenLastCalledWith(true);
  });

  it("page refermée sans confirmation : la session reste retenue, rien n'est affirmé", async () => {
    mockStatut.mockResolvedValue({ livre: false });
    mockFacturation.mockResolvedValue({ sansPub: { actif: false } });
    await expect(acheterSansPub()).resolves.toBe("non_confirme");
    expect(mockOublier).not.toHaveBeenCalled();
    expect(poserSansPub).not.toHaveBeenCalledWith(true);
  });

  it("la page ne s'ouvre pas : échec, à l'appelant de montrer l'offre du profil", async () => {
    mockOuvrir.mockRejectedValue(new Error("réseau"));
    await expect(acheterSansPub()).resolves.toBe("echec");
    expect(mockRetenir).not.toHaveBeenCalled();
  });

  it("déjà abonné ailleurs : l'état du serveur fait foi", async () => {
    mockOuvrir.mockRejectedValue(
      new ErreurApi("Déjà abonné.", 409, "subscription_already_active"),
    );
    await expect(acheterSansPub()).resolves.toBe("livre");
    expect(poserSansPub).toHaveBeenCalledWith(true);
  });
});
