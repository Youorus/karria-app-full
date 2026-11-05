/**
 * L'achat en attente : retenu au nom d'un compte, revérifié, oublié quand
 * le serveur a livré — le merci posé une fois, les droits relus au serveur,
 * et rien qui survive à un changement de compte.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";
import { estSansPub, poserSansPub } from "@/lib/sans-pub";

import {
  DUREE_MAX_MS,
  effacerRemerciement,
  lireAchatEnAttente,
  purgerAchatALaDeconnexion,
  reverifierAchatEnAttente,
  retenirAchatEnAttente,
  useRemerciement,
  type Dependances,
} from "./achat-en-attente";
import type {
  Facturation,
  SessionPaiement,
  StatutPaiement,
} from "../types/soutien.types";

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

function statut(livre: boolean): Dependances["lireStatut"] {
  return (id) => Promise.resolve({ id, paye: true, livre } satisfies StatutPaiement);
}

function facturation(actif: boolean): Facturation {
  return {
    sansPub: {
      actif,
      statut: actif ? "actif" : "aucun",
      jusquAu: null,
      resiliationEnFinDePeriode: false,
      gerable: actif,
    },
    cafes: { nombre: 0, dernierLe: null },
    actif: true,
  };
}

/** Le compte A est connecté, ses droits sont « sans pub : non ». */
function deps(surcharges: Partial<Dependances> = {}): Partial<Dependances> {
  return {
    lireMoi: () => Promise.resolve({ id: "compte-A" }),
    lireFacturation: () => Promise.resolve(facturation(false)),
    maintenant: () => T0 + 60_000,
    ...surcharges,
  };
}

describe("L'achat en attente", () => {
  beforeEach(async () => {
    mockLocal.clear();
    effacerRemerciement();
    poserSansPub(false);
    await purgerAchatALaDeconnexion();
  });

  it("n'a rien à revérifier quand rien n'est retenu", async () => {
    await expect(
      reverifierAchatEnAttente(deps({ lireStatut: statut(true) })),
    ).resolves.toBe("aucun");
  });

  it("est retenu au nom du compte courant — et pas du tout si le compte ne se lit pas", async () => {
    await retenirAchatEnAttente(CAFE, null, deps());
    expect(await lireAchatEnAttente()).toMatchObject({
      sessionId: "cs_live_a1SD",
      type: "coffee",
      userId: "compte-A",
      depuis: T0 + 60_000,
    });

    mockLocal.clear();
    await retenirAchatEnAttente(
      CAFE,
      null,
      deps({ lireMoi: () => Promise.reject(new Error("401")) }),
    );
    expect(await lireAchatEnAttente()).toBeNull();
  });

  it("reste retenu tant que le serveur n'a pas livré", async () => {
    await retenirAchatEnAttente(CAFE, null, deps({ maintenant: () => T0 }));
    const lire = jest.fn(statut(false));

    await expect(reverifierAchatEnAttente(deps({ lireStatut: lire }))).resolves.toBe(
      "en_attente",
    );

    expect(lire).toHaveBeenCalledWith("cs_live_a1SD");
    expect(await lireAchatEnAttente()).not.toBeNull();
  });

  it("pose le merci et oublie la session quand le serveur a livré — une seule fois", async () => {
    await retenirAchatEnAttente(MODELE, "modele-premium", deps({ maintenant: () => T0 }));
    const lire = jest.fn(statut(true));

    await expect(reverifierAchatEnAttente(deps({ lireStatut: lire }))).resolves.toBe(
      "livre",
    );
    expect(await lireAchatEnAttente()).toBeNull();
    const { result } = renderHook(() => useRemerciement());
    expect(result.current).toEqual({ type: "template", modeleId: "modele-premium" });
    // Le second passage ne trouve plus rien : pas de second merci.
    await expect(reverifierAchatEnAttente(deps({ lireStatut: lire }))).resolves.toBe(
      "aucun",
    );
    expect(lire).toHaveBeenCalledTimes(1);
  });

  it("jette l'achat d'un autre compte sans le relire, et ne lui applique rien", async () => {
    await retenirAchatEnAttente(SANS_PUB, null, deps({ maintenant: () => T0 }));
    const lire = jest.fn(statut(true));

    await expect(
      reverifierAchatEnAttente(
        deps({ lireStatut: lire, lireMoi: () => Promise.resolve({ id: "compte-B" }) }),
      ),
    ).resolves.toBe("autre_compte");

    expect(lire).not.toHaveBeenCalled();
    expect(await lireAchatEnAttente()).toBeNull();
    expect(estSansPub()).toBe(false);
    expect(renderHook(() => useRemerciement()).result.current).toBeNull();
  });

  it("purge l'achat et le merci à la déconnexion, et abandonne une relecture en vol", async () => {
    await retenirAchatEnAttente(SANS_PUB, null, deps({ maintenant: () => T0 }));
    let repondre: (s: StatutPaiement) => void = () => undefined;
    const lire = () =>
      new Promise<StatutPaiement>((resoudre) => {
        repondre = resoudre;
      });
    const enVol = reverifierAchatEnAttente(
      deps({
        lireStatut: lire,
        lireFacturation: () => Promise.resolve(facturation(true)),
      }),
    );
    await new Promise((r) => setTimeout(r, 0));

    // A se déconnecte pendant que sa session se relit…
    await purgerAchatALaDeconnexion();
    expect(await lireAchatEnAttente()).toBeNull();
    // …et le serveur répond « livré » après coup.
    repondre({ id: "cs_abo", paye: true, livre: true });

    await expect(enVol).resolves.toBe("abandonne");
    expect(estSansPub()).toBe(false);
    expect(renderHook(() => useRemerciement()).result.current).toBeNull();
  });

  it("prend « sans pub » du serveur, jamais de l'enregistrement local", async () => {
    await retenirAchatEnAttente(SANS_PUB, null, deps({ maintenant: () => T0 }));
    // Le serveur dit « livré » mais, pour ce compte, pas (encore) sans pub.
    await expect(
      reverifierAchatEnAttente(deps({ lireStatut: statut(true) })),
    ).resolves.toBe("livre");
    expect(estSansPub()).toBe(false);

    await retenirAchatEnAttente(SANS_PUB, null, deps({ maintenant: () => T0 }));
    await reverifierAchatEnAttente(
      deps({
        lireStatut: statut(true),
        lireFacturation: () => Promise.resolve(facturation(true)),
      }),
    );
    expect(estSansPub()).toBe(true);
  });

  it("oublie une session expirée sans la relire", async () => {
    await retenirAchatEnAttente(CAFE, null, deps({ maintenant: () => T0 }));
    const lire = jest.fn(statut(true));
    await expect(
      reverifierAchatEnAttente(
        deps({ lireStatut: lire, maintenant: () => T0 + DUREE_MAX_MS + 1 }),
      ),
    ).resolves.toBe("perime");
    expect(lire).not.toHaveBeenCalled();
    expect(await lireAchatEnAttente()).toBeNull();
  });

  it("oublie une session que le serveur ne connaît pas, garde celle qu'il n'a pas pu lire", async () => {
    await retenirAchatEnAttente(CAFE, null, deps({ maintenant: () => T0 }));
    const inconnue = () =>
      Promise.reject(new ErreurApi("Paiement introuvable.", 404, "not_found"));
    await expect(reverifierAchatEnAttente(deps({ lireStatut: inconnue }))).resolves.toBe(
      "perime",
    );
    expect(await lireAchatEnAttente()).toBeNull();

    await retenirAchatEnAttente(CAFE, null, deps({ maintenant: () => T0 }));
    const reseau = () => Promise.reject(new Error("réseau"));
    await expect(reverifierAchatEnAttente(deps({ lireStatut: reseau }))).resolves.toBe(
      "illisible",
    );
    expect(await lireAchatEnAttente()).not.toBeNull();
  });

  it("ne relit qu'une fois à la fois", async () => {
    await retenirAchatEnAttente(CAFE, null, deps({ maintenant: () => T0 }));
    const lire = jest.fn(statut(false));
    await Promise.all([
      reverifierAchatEnAttente(deps({ lireStatut: lire })),
      reverifierAchatEnAttente(deps({ lireStatut: lire })),
    ]);
    expect(lire).toHaveBeenCalledTimes(1);
  });

  it("ignore une valeur locale qui n'a pas la forme attendue — sans propriétaire comprise", async () => {
    mockLocal.set("karria.achat-en-attente", {
      sessionId: "cs_x",
      type: "coffee",
      modeleId: null,
      depuis: T0,
    });
    await expect(
      reverifierAchatEnAttente(deps({ lireStatut: statut(true) })),
    ).resolves.toBe("aucun");
  });
});
