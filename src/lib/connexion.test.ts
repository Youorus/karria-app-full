/**
 * Les règles de la connexion (`connexion.ts`).
 *
 * Ce que ces tests protègent : le bandeau ne clignote pas (un échec isolé,
 * ou trois requêtes tombées ensemble, ne disent pas « instable ») ; il
 * revient au premier succès ; l'appareil a le dernier mot sur « hors
 * ligne » ; et une action n'est refusée que sans **aucun** réseau.
 */

import { describe, expect, it } from "@jest/globals";

import {
  actionImpossible,
  apresAppareil,
  apresEchec,
  apresOubli,
  apresSucces,
  ECART_RELANCES_MS,
  estUnRetour,
  etatDe,
  FENETRE_SALVE_MS,
  lireAppareil,
  MEMOIRE_INITIALE,
  relancePermise,
  SEUIL_INSTABLE,
  type MemoireConnexion,
} from "./connexion";

const EN_LIGNE: MemoireConnexion = { ...MEMOIRE_INITIALE, appareil: "en-ligne" };

/** `n` incidents distincts, espacés de plus d'une salve. */
function echecs(memoire: MemoireConnexion, n: number, depart = 0): MemoireConnexion {
  let m = memoire;
  for (let i = 0; i < n; i += 1) m = apresEchec(m, depart + i * FENETRE_SALVE_MS);
  return m;
}

describe("Ce que dit l'appareil", () => {
  it("traduit l'état d'expo-network", () => {
    expect(lireAppareil({ isConnected: false, isInternetReachable: false })).toBe(
      "sans-reseau",
    );
    expect(lireAppareil({ isConnected: true, isInternetReachable: false })).toBe(
      "sans-internet",
    );
    expect(lireAppareil({ isConnected: true, isInternetReachable: true })).toBe(
      "en-ligne",
    );
    expect(lireAppareil({ isConnected: true })).toBe("en-ligne");
    expect(lireAppareil({})).toBe("inconnu");
  });

  it("hors ligne sans réseau, comme avec un réseau qui ne mène nulle part", () => {
    expect(etatDe(apresAppareil(EN_LIGNE, "sans-reseau"))).toBe("hors-ligne");
    expect(etatDe(apresAppareil(EN_LIGNE, "sans-internet"))).toBe("hors-ligne");
    expect(etatDe(apresAppareil(MEMOIRE_INITIALE, "en-ligne"))).toBe("bonne");
  });

  it("ne sait rien au départ, et c'est « bonne » : on n'alarme pas sans preuve", () => {
    expect(etatDe(MEMOIRE_INITIALE)).toBe("bonne");
  });

  it("oublie les échecs d'avant la coupure quand le réseau revient", () => {
    const coupe = apresAppareil(echecs(EN_LIGNE, 5), "sans-reseau");
    expect(etatDe(apresAppareil(coupe, "en-ligne"))).toBe("bonne");
  });

  it("garde les échecs quand l'appareil change de réseau sans coupure", () => {
    expect(etatDe(apresAppareil(echecs(EN_LIGNE, SEUIL_INSTABLE), "en-ligne"))).toBe(
      "instable",
    );
  });
});

describe("L'hystérésis", () => {
  it("un échec isolé ne dit rien", () => {
    expect(etatDe(echecs(EN_LIGNE, SEUIL_INSTABLE - 1))).toBe("bonne");
  });

  it("passe à « instable » au deuxième incident consécutif", () => {
    expect(etatDe(echecs(EN_LIGNE, SEUIL_INSTABLE))).toBe("instable");
  });

  it("compte pour un seul incident des requêtes tombées ensemble", () => {
    let m = apresEchec(EN_LIGNE, 10_000);
    m = apresEchec(m, 10_010);
    m = apresEchec(m, 10_000 + FENETRE_SALVE_MS - 1);
    expect(m.echecs).toBe(1);
    expect(etatDe(m)).toBe("bonne");
    expect(etatDe(apresEchec(m, 10_000 + FENETRE_SALVE_MS))).toBe("instable");
  });

  it("revient à « bonne » au premier succès", () => {
    const instable = echecs(EN_LIGNE, 4);
    expect(etatDe(apresSucces(instable))).toBe("bonne");
    // Et il faut de nouveau deux incidents pour y retomber.
    expect(etatDe(apresEchec(apresSucces(instable), 99_000))).toBe("bonne");
  });

  it("fonctionne sans l'appareil (build sans le module natif)", () => {
    expect(etatDe(echecs(MEMOIRE_INITIALE, SEUIL_INSTABLE))).toBe("instable");
  });

  it("oublie un état instable qui n'est plus étayé", () => {
    expect(etatDe(apresOubli(echecs(EN_LIGNE, 3)))).toBe("bonne");
  });
});

describe("Quand l'appareil et les requêtes se contredisent", () => {
  it("une réponse dément un réseau « sans Internet »", () => {
    const m = apresSucces(apresAppareil(EN_LIGNE, "sans-internet"));
    expect(m.appareil).toBe("en-ligne");
    expect(etatDe(m)).toBe("bonne");
  });

  it("une réponse ne dément pas « aucun réseau » : elle était partie avant", () => {
    const m = apresSucces(apresAppareil(EN_LIGNE, "sans-reseau"));
    expect(etatDe(m)).toBe("hors-ligne");
  });

  it("des échecs hors ligne restent « hors ligne », pas « instable »", () => {
    expect(etatDe(echecs(apresAppareil(EN_LIGNE, "sans-reseau"), 6))).toBe("hors-ligne");
  });
});

describe("Refuser une action", () => {
  it("seulement sans aucun réseau", () => {
    expect(actionImpossible(apresAppareil(EN_LIGNE, "sans-reseau"))).toBe(true);
    expect(actionImpossible(apresAppareil(EN_LIGNE, "sans-internet"))).toBe(false);
    expect(actionImpossible(echecs(EN_LIGNE, 9))).toBe(false);
    expect(actionImpossible(MEMOIRE_INITIALE)).toBe(false);
  });
});

describe("Le retour", () => {
  it("n'en est un que vers « bonne », depuis autre chose", () => {
    expect(estUnRetour("hors-ligne", "bonne")).toBe(true);
    expect(estUnRetour("instable", "bonne")).toBe(true);
    expect(estUnRetour("hors-ligne", "instable")).toBe(false);
    expect(estUnRetour("bonne", "bonne")).toBe(false);
    expect(estUnRetour("bonne", "hors-ligne")).toBe(false);
  });

  it("espace les relances automatiques", () => {
    expect(relancePermise(null, 0)).toBe(true);
    expect(relancePermise(1_000, 1_000 + ECART_RELANCES_MS - 1)).toBe(false);
    expect(relancePermise(1_000, 1_000 + ECART_RELANCES_MS)).toBe(true);
  });
});
