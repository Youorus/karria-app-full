/**
 * L'achat en attente : retenu, revérifié, oublié quand le serveur a livré —
 * et le merci posé une fois.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";
import { estSansPub, poserSansPub } from "@/lib/sans-pub";

import {
  DUREE_MAX_MS,
  effacerRemerciement,
  lireAchatEnAttente,
  poserRemerciement,
  reverifierAchatEnAttente,
  retenirAchatEnAttente,
  useRemerciement,
} from "./achat-en-attente";
import type { SessionPaiement, StatutPaiement } from "../types/soutien.types";

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

const T0 = Date.UTC(2026, 10, 5, 8, 15);
const CAFE: SessionPaiement = {
  id: "cs_live_a1SD",
  adresse: "https://checkout.stripe.com/x",
  type: "coffee",
  montantCentimes: 299,
};
const MODELE: SessionPaiement = { ...CAFE, id: "cs_modele", type: "template" };
const SANS_PUB: SessionPaiement = { ...CAFE, id: "cs_abo", type: "ad_free" };

function statut(livre: boolean): (id: string) => Promise<StatutPaiement> {
  return (id) => Promise.resolve({ id, paye: true, livre });
}

describe("L'achat en attente", () => {
  beforeEach(() => {
    mockLocal.clear();
    effacerRemerciement();
    poserSansPub(false);
  });

  it("n'a rien à revérifier quand rien n'est retenu", async () => {
    await expect(reverifierAchatEnAttente({ lireStatut: statut(true) })).resolves.toBe(
      "aucun",
    );
  });

  it("reste retenu tant que le serveur n'a pas livré", async () => {
    await retenirAchatEnAttente(CAFE, null, T0);
    const lire = jest.fn(statut(false));

    await expect(
      reverifierAchatEnAttente({ lireStatut: lire, maintenant: () => T0 + 60_000 }),
    ).resolves.toBe("en_attente");

    expect(lire).toHaveBeenCalledWith("cs_live_a1SD");
    expect(await lireAchatEnAttente()).toMatchObject({
      sessionId: "cs_live_a1SD",
      type: "coffee",
    });
  });

  it("pose le merci et oublie la session quand le serveur a livré — une seule fois", async () => {
    await retenirAchatEnAttente(MODELE, "modele-premium", T0);
    const lire = jest.fn(statut(true));

    await expect(
      reverifierAchatEnAttente({ lireStatut: lire, maintenant: () => T0 + 1_000 }),
    ).resolves.toBe("livre");
    expect(await lireAchatEnAttente()).toBeNull();
    // Le second passage ne trouve plus rien : pas de second merci.
    await expect(
      reverifierAchatEnAttente({ lireStatut: lire, maintenant: () => T0 + 2_000 }),
    ).resolves.toBe("aucun");
    expect(lire).toHaveBeenCalledTimes(1);
    const { result } = renderHook(() => useRemerciement());
    expect(result.current).toEqual({ type: "template", modeleId: "modele-premium" });
  });

  it("coupe la publicité sans attendre quand c'est le sans pub qui arrive", async () => {
    await retenirAchatEnAttente(SANS_PUB, null, T0);
    await reverifierAchatEnAttente({
      lireStatut: statut(true),
      maintenant: () => T0 + 1,
    });
    expect(estSansPub()).toBe(true);
  });

  it("oublie une session expirée sans la relire", async () => {
    await retenirAchatEnAttente(CAFE, null, T0);
    const lire = jest.fn(statut(true));
    await expect(
      reverifierAchatEnAttente({
        lireStatut: lire,
        maintenant: () => T0 + DUREE_MAX_MS + 1,
      }),
    ).resolves.toBe("perime");
    expect(lire).not.toHaveBeenCalled();
    expect(await lireAchatEnAttente()).toBeNull();
  });

  it("oublie une session que le serveur ne connaît pas, garde celle qu'il n'a pas pu lire", async () => {
    await retenirAchatEnAttente(CAFE, null, T0);
    const inconnue = () =>
      Promise.reject(new ErreurApi("Paiement introuvable.", 404, "not_found"));
    await expect(
      reverifierAchatEnAttente({ lireStatut: inconnue, maintenant: () => T0 + 1 }),
    ).resolves.toBe("perime");
    expect(await lireAchatEnAttente()).toBeNull();

    await retenirAchatEnAttente(CAFE, null, T0);
    const reseau = () => Promise.reject(new Error("réseau"));
    await expect(
      reverifierAchatEnAttente({ lireStatut: reseau, maintenant: () => T0 + 1 }),
    ).resolves.toBe("illisible");
    expect(await lireAchatEnAttente()).not.toBeNull();
  });

  it("ne relit qu'une fois à la fois", async () => {
    await retenirAchatEnAttente(CAFE, null, T0);
    const lire = jest.fn(statut(false));
    await Promise.all([
      reverifierAchatEnAttente({ lireStatut: lire, maintenant: () => T0 + 1 }),
      reverifierAchatEnAttente({ lireStatut: lire, maintenant: () => T0 + 1 }),
    ]);
    expect(lire).toHaveBeenCalledTimes(1);
  });

  it("ignore une valeur locale qui n'a pas la forme attendue", async () => {
    mockLocal.set("karria.achat-en-attente", { sessionId: 42 });
    await expect(reverifierAchatEnAttente({ lireStatut: statut(true) })).resolves.toBe(
      "aucun",
    );
    poserRemerciement(null);
  });
});
