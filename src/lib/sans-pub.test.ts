/**
 * Le drapeau « sans pub » : recopié, abonnable, remis à zéro — et retenu
 * d'un lancement à l'autre, pour qu'un abonné ne voie jamais d'annonce à
 * cause d'une panne réseau.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import {
  abonnerSansPub,
  estSansPub,
  poserSansPub,
  redemarrerSansPubPourTest,
  restaurerSansPub,
  sansPubPret,
} from "./sans-pub";

const mockMagasin = new Map<string, unknown>();
const mockEcrire = jest.fn<(cle: string, valeur: unknown) => void>();
/** Laisse la lecture en suspens, pour jouer une réponse serveur plus rapide. */
let mockAttente: Promise<void> | null = null;
let mockLectures = 0;

jest.mock("@/lib/magasin-local", () => ({
  lireLocal: async (
    cle: string,
    parDefaut: unknown,
    valider: (v: unknown) => boolean,
  ) => {
    mockLectures += 1;
    if (mockAttente !== null) await mockAttente;
    const valeur = mockMagasin.get(cle);
    return valeur !== undefined && valider(valeur) ? valeur : parDefaut;
  },
  ecrireLocal: async (cle: string, valeur: unknown) => {
    mockEcrire(cle, valeur);
    mockMagasin.set(cle, valeur);
  },
}));

const CLE = "karria.sans-pub";

describe("sans pub", () => {
  beforeEach(() => {
    mockMagasin.clear();
    mockEcrire.mockClear();
    mockAttente = null;
    mockLectures = 0;
    redemarrerSansPubPourTest();
  });

  it("vaut non tant que rien n'a été dit ni retenu", async () => {
    expect(estSansPub()).toBe(false);
    await restaurerSansPub();
    expect(estSansPub()).toBe(false);
  });

  it("prévient les abonnés seulement quand la réponse change", () => {
    const rappel = jest.fn();
    const desabonner = abonnerSansPub(rappel);

    poserSansPub(true);
    poserSansPub(true);
    expect(estSansPub()).toBe(true);
    expect(rappel).toHaveBeenCalledTimes(1);

    desabonner();
    poserSansPub(false);
    expect(rappel).toHaveBeenCalledTimes(1);
  });

  it("retient chaque réponse du serveur, sans réécrire la même", () => {
    poserSansPub(true);
    poserSansPub(true);
    expect(mockEcrire).toHaveBeenCalledTimes(1);
    expect(mockMagasin.get(CLE)).toBe(true);
    // La déconnexion remet à « non », et le retient : le compte suivant
    // sur ce téléphone ne hérite pas de l'abonnement.
    poserSansPub(false);
    expect(mockMagasin.get(CLE)).toBe(false);
    expect(mockEcrire).toHaveBeenCalledTimes(2);
  });

  it("au démarrage à froid, relit la dernière réponse connue et prévient", async () => {
    poserSansPub(true);
    redemarrerSansPubPourTest();
    expect(estSansPub()).toBe(false);

    const rappel = jest.fn();
    const desabonner = abonnerSansPub(rappel);
    await sansPubPret();
    expect(estSansPub()).toBe(true);
    expect(rappel).toHaveBeenCalledTimes(1);
    desabonner();
  });

  it("`GET /payments/me` en panne : l'abonné reste sans pub toute la session", async () => {
    mockMagasin.set(CLE, true);
    await sansPubPret();
    // Le garde des droits a échoué : personne n'appelle `poserSansPub`.
    expect(estSansPub()).toBe(true);
    // Et rien n'a été réécrit pour autant.
    expect(mockEcrire).not.toHaveBeenCalled();
  });

  it("ne relit qu'une fois, quel que soit le nombre d'appelants", async () => {
    await Promise.all([sansPubPret(), restaurerSansPub(), sansPubPret()]);
    expect(mockLectures).toBe(1);
  });

  it("le serveur a le dernier mot : une résiliation se voit, et se retient", async () => {
    mockMagasin.set(CLE, true);
    await sansPubPret();
    expect(estSansPub()).toBe(true);
    poserSansPub(false);
    expect(estSansPub()).toBe(false);
    expect(mockMagasin.get(CLE)).toBe(false);
  });

  it("une relecture qui arrive après le serveur ne le contredit pas", async () => {
    mockMagasin.set(CLE, true);
    let liberer: () => void = () => {};
    mockAttente = new Promise<void>((r) => {
      liberer = r;
    });
    const pret = sansPubPret();
    // Le serveur répond avant la fin de la lecture locale : résilié.
    poserSansPub(false);
    liberer();
    await pret;
    expect(estSansPub()).toBe(false);
    // La valeur périmée est corrigée dans le magasin.
    expect(mockMagasin.get(CLE)).toBe(false);
  });

  it("une valeur retenue illisible vaut « non »", async () => {
    mockMagasin.set(CLE, "oui");
    await sansPubPret();
    expect(estSansPub()).toBe(false);
  });
});
