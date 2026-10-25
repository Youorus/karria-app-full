/**
 * L'aiguilleur : une réponse n'ouvre qu'une fois, attend qu'on puisse
 * naviguer, et chaque issue est mesurée.
 *
 * Ce que ces tests protègent : le lancement à froid qui livre la même
 * réponse deux fois (lecture + écouteur), la destination gardée pendant la
 * connexion, et les trois événements de mesure.
 */

import { beforeEach, describe, expect, it } from "@jest/globals";

import { AiguilleurNotifications, type ReponseNotification } from "./aiguilleur";
import type { EvenementNotification, PortAnalytiqueNotifications } from "./analytique";
import type { DestinationNotification } from "../types/notifications.types";

const OFFRE = { v: "1", type: "offer", id: "abc-123" };
const FIL = { v: "1", type: "offers_feed", campaign: "test" };

function reponse(
  identifiant: string,
  donnees: unknown,
  extra: Partial<ReponseNotification> = {},
): ReponseNotification {
  return { identifiant, donnees, issue: "ouverte", source: "systeme", ...extra };
}

let navigations: DestinationNotification[];
let evenements: { nom: string; e: EvenementNotification }[];
let aiguilleur: AiguilleurNotifications;

beforeEach(() => {
  navigations = [];
  evenements = [];
  const port: PortAnalytiqueNotifications = {
    recue: (e) => evenements.push({ nom: "recue", e }),
    ouverte: (e) => evenements.push({ nom: "ouverte", e }),
    ecartee: (e) => evenements.push({ nom: "ecartee", e }),
  };
  aiguilleur = new AiguilleurNotifications(() => port);
  aiguilleur.brancher((d) => navigations.push(d));
});

describe("Prêt à naviguer", () => {
  it("ouvre aussitôt la pile de la notification", () => {
    aiguilleur.signalerPret(true);
    aiguilleur.repondre(reponse("n1", OFFRE));
    expect(navigations.map((d) => d.pile)).toEqual([["/offres", "/offre/abc-123"]]);
    expect(evenements).toEqual([
      { nom: "ouverte", e: { type: "offer", campagne: null, source: "systeme" } },
    ]);
  });

  it("ouvre le fil pour une charge invalide", () => {
    aiguilleur.signalerPret(true);
    aiguilleur.repondre(reponse("n1", { v: "1", type: "offer" }));
    expect(navigations[0].pile).toEqual(["/offres"]);
    expect(evenements[0].e.type).toBeNull();
  });
});

describe("Le lancement à froid", () => {
  it("n'ouvre qu'une fois la réponse livrée par la lecture puis par l'écouteur", () => {
    aiguilleur.signalerPret(true);
    aiguilleur.repondre(reponse("n1", OFFRE, { source: "lancement" }));
    aiguilleur.repondre(reponse("n1", OFFRE, { source: "systeme" }));
    expect(navigations).toHaveLength(1);
    expect(evenements).toHaveLength(1);
    expect(evenements[0].e.source).toBe("lancement");
  });

  it("ouvre deux notifications distinctes", () => {
    aiguilleur.signalerPret(true);
    aiguilleur.repondre(reponse("n1", OFFRE));
    aiguilleur.repondre(reponse("n2", FIL));
    expect(navigations).toHaveLength(2);
  });

  it("oublie les plus anciennes clés au-delà de la borne", () => {
    aiguilleur.signalerPret(true);
    for (let i = 0; i <= 50; i += 1) aiguilleur.repondre(reponse(`n${i}`, FIL));
    aiguilleur.repondre(reponse("n0", FIL));
    expect(navigations).toHaveLength(52);
  });
});

describe("L'attente de la session", () => {
  it("garde la destination et l'ouvre une fois prêt", () => {
    aiguilleur.repondre(reponse("n1", OFFRE, { source: "lancement" }));
    expect(navigations).toHaveLength(0);
    expect(aiguilleur.destinationEnAttente?.pile).toEqual(["/offres", "/offre/abc-123"]);

    aiguilleur.signalerPret(false);
    expect(navigations).toHaveLength(0);

    aiguilleur.signalerPret(true);
    expect(navigations.map((d) => d.pile)).toEqual([["/offres", "/offre/abc-123"]]);
    expect(aiguilleur.destinationEnAttente).toBeNull();

    aiguilleur.signalerPret(true);
    expect(navigations).toHaveLength(1);
  });

  it("ne garde que la plus récente", () => {
    aiguilleur.repondre(reponse("n1", OFFRE));
    aiguilleur.repondre(reponse("n2", { v: "1", type: "cv_ready" }));
    aiguilleur.signalerPret(true);
    expect(navigations.map((d) => d.pile)).toEqual([["/cv"]]);
  });
});

describe("Le routeur", () => {
  it("attend d'être branché, même prêt", () => {
    const seul = new AiguilleurNotifications(() => ({
      recue: () => undefined,
      ouverte: () => undefined,
      ecartee: () => undefined,
    }));
    const vues: DestinationNotification[] = [];
    seul.signalerPret(true);
    seul.repondre(reponse("n1", OFFRE));
    expect(seul.destinationEnAttente).not.toBeNull();
    seul.brancher((d) => vues.push(d));
    expect(vues.map((d) => d.pile)).toEqual([["/offres", "/offre/abc-123"]]);
  });
});

describe("La mesure", () => {
  it("compte une notification effacée sans naviguer", () => {
    aiguilleur.signalerPret(true);
    aiguilleur.repondre(reponse("n1", FIL, { issue: "ecartee" }));
    expect(navigations).toHaveLength(0);
    expect(evenements).toEqual([
      { nom: "ecartee", e: { type: "offers_feed", campagne: "test", source: "systeme" } },
    ]);
  });

  it("compte la réception au premier plan et rend la destination", () => {
    const destination = aiguilleur.recevoir(OFFRE);
    expect(destination.pile).toEqual(["/offres", "/offre/abc-123"]);
    expect(evenements[0]).toEqual({
      nom: "recue",
      e: { type: "offer", campagne: null, source: "systeme" },
    });
  });

  it("ouvre ou écarte la bannière", () => {
    aiguilleur.signalerPret(true);
    const destination = aiguilleur.recevoir(FIL);
    aiguilleur.banniere(destination, "ecartee");
    expect(navigations).toHaveLength(0);
    aiguilleur.banniere(destination, "ouverte");
    expect(navigations).toEqual([destination]);
    expect(evenements.map((x) => [x.nom, x.e.source])).toEqual([
      ["recue", "systeme"],
      ["ecartee", "banniere"],
      ["ouverte", "banniere"],
    ]);
  });

  it("garde la bannière touchée avant d'être prêt", () => {
    aiguilleur.banniere(aiguilleur.recevoir(FIL), "ouverte");
    expect(navigations).toHaveLength(0);
    aiguilleur.signalerPret(true);
    expect(navigations).toHaveLength(1);
  });
});
