/**
 * Le routeur des notifications : chaque type mène à sa pile, et ce qui
 * n'est pas compris mène au fil.
 *
 * Ce que ces tests protègent : le contrat v1 partagé avec l'API
 * (`docs/contrat-notifications.md`), le refus des identifiants forgés, et
 * la règle d'attente — on ne navigue jamais par-dessus un écran d'entrée.
 */

import { describe, expect, it } from "@jest/globals";

import {
  PILE_DU_FIL,
  canalDe,
  destinationDe,
  lireNotification,
  peutNaviguer,
} from "./routeur-notifications";
import { TYPES_NOTIFICATION, type TypeNotification } from "../types/notifications.types";

const ID = "3f2c9a1e-8b4d-4e7f-9a10-2b3c4d5e6f70";

describe("Chaque type du contrat", () => {
  const attendu: Record<
    TypeNotification,
    { donnees: Record<string, string>; pile: string[] }
  > = {
    offer: { donnees: { id: ID, count: "1" }, pile: ["/offres", `/offre/${ID}`] },
    offers_feed: { donnees: { count: "4" }, pile: ["/offres"] },
    search_results: { donnees: {}, pile: ["/offres"] },
    assistant: { donnees: {}, pile: ["/offres?karria=1"] },
    cv_ready: { donnees: {}, pile: ["/cv"] },
    cv_export: { donnees: { id: ID }, pile: ["/cv"] },
    template: { donnees: { id: ID }, pile: ["/modeles", `/modele/${ID}`] },
    templates: { donnees: {}, pile: ["/modeles"] },
    account: { donnees: {}, pile: ["/profil", "/parametres"] },
  };

  it.each(TYPES_NOTIFICATION)("%s mène à sa pile", (type) => {
    const { donnees, pile } = attendu[type];
    const destination = destinationDe({ v: "1", type, ...donnees });
    expect(destination).toEqual({ pile, type, origine: "contrat", campagne: null });
  });

  it("chaque type a un canal", () => {
    expect(canalDe("offer")).toBe("offres");
    expect(canalDe("assistant")).toBe("offres");
    expect(canalDe("cv_export")).toBe("documents");
    expect(canalDe("template")).toBe("documents");
    expect(canalDe("account")).toBe("compte");
  });
});

describe("La lecture d'une charge", () => {
  it("rend le nombre et la campagne", () => {
    expect(
      lireNotification({
        v: "1",
        type: "offers_feed",
        count: "12",
        campaign: "v1-retour-2026",
      }),
    ).toEqual({ type: "offers_feed", id: null, nombre: 12, campagne: "v1-retour-2026" });
  });

  it("tolère une version numérique", () => {
    expect(lireNotification({ v: 1, type: "cv_ready" })?.type).toBe("cv_ready");
  });

  it("ignore un nombre ou une campagne mal formés sans refuser la charge", () => {
    expect(
      lireNotification({ v: "1", type: "offers_feed", count: "-3", campaign: "a b" }),
    ).toEqual({ type: "offers_feed", id: null, nombre: null, campagne: null });
  });

  it.each([
    ["pas un objet", "offer"],
    ["un tableau", ["v", "1"]],
    ["sans version", { type: "offer", id: ID }],
    ["une version future", { v: "2", type: "offer", id: ID }],
    ["une version illisible", { v: "un", type: "offer", id: ID }],
    ["un type inconnu", { v: "1", type: "promo" }],
    ["une offre sans id", { v: "1", type: "offer" }],
    ["un id forgé", { v: "1", type: "offer", id: "../parametres" }],
    [
      "un id hors forme sur un type qui en permet",
      { v: "1", type: "cv_export", id: "a/b" },
    ],
    ["un id sur un type qui n'en a pas", { v: "1", type: "offers_feed", id: ID }],
  ])("refuse %s", (_cas, donnees) => {
    expect(lireNotification(donnees)).toBeNull();
  });
});

describe("Le repli", () => {
  it("suit l'url quand le type n'est pas compris, détail au-dessus de son parent", () => {
    expect(destinationDe({ v: "2", type: "nouveau", url: "karria://offre/42" })).toEqual({
      pile: ["/offres", "/offre/42"],
      type: null,
      origine: "lien",
      campagne: null,
    });
    expect(destinationDe({ url: "https://karria.fr/modele/7" }).pile).toEqual([
      "/modeles",
      "/modele/7",
    ]);
    expect(destinationDe({ url: "karria://cv" }).pile).toEqual(["/cv"]);
  });

  it("ouvre le fil pour une ancienne charge sans url (NEW_OFFERS de l'API d'avant)", () => {
    expect(destinationDe({ type: "NEW_OFFERS", offer_id: ID, count: "3" })).toEqual({
      pile: PILE_DU_FIL,
      type: null,
      origine: "repli",
      campagne: null,
    });
  });

  it("ouvre le fil pour une url étrangère ou une charge absente", () => {
    expect(destinationDe({ url: "https://exemple.com/offre/1" }).origine).toBe("repli");
    expect(destinationDe(null).pile).toEqual(PILE_DU_FIL);
    expect(destinationDe(undefined).origine).toBe("repli");
  });
});

describe("Le moment de naviguer", () => {
  const pret = { connecte: true, navigationPrete: true, chemin: "/offres" };

  it("est venu dans l'application, connecté, navigation montée", () => {
    expect(peutNaviguer(pret)).toBe(true);
    expect(peutNaviguer({ ...pret, chemin: "/parametres" })).toBe(true);
  });

  it("attend la session et la navigation", () => {
    expect(peutNaviguer({ ...pret, connecte: false })).toBe(false);
    expect(peutNaviguer({ ...pret, navigationPrete: false })).toBe(false);
  });

  it.each(["/", "/bienvenue", "/email", "/code", "/notifications"])(
    "attend qu'on ait quitté l'écran d'entrée %s",
    (chemin) => {
      expect(peutNaviguer({ ...pret, chemin })).toBe(false);
    },
  );
});
