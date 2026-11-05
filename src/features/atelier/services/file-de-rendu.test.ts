import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { creerFileDeRendu } from "./file-de-rendu";

/** Un rendu qu'on résout à la main, pour ordonner les événements. */
function rendeur() {
  const enVol: {
    entree: string;
    resoudre: (r: string) => void;
    rejeter: (c: unknown) => void;
  }[] = [];
  const rendre = (entree: string) =>
    new Promise<string>((resoudre, rejeter) => enVol.push({ entree, resoudre, rejeter }));
  return { rendre, enVol };
}

/** Vide la file des micro-tâches : les minuteries sont factices, `setTimeout` ne rendrait jamais la main. */
const tick = async () => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};

describe("la file de rendu", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("attend le repos avant de rendre, et ne rend que la dernière demande", async () => {
    const { rendre, enVol } = rendeur();
    const surResultat = jest.fn();
    const file = creerFileDeRendu({
      rendre,
      surResultat,
      surErreur: jest.fn(),
      delaiMs: 400,
    });

    file.demander("a");
    jest.advanceTimersByTime(300);
    file.demander("ab");
    jest.advanceTimersByTime(300);
    expect(enVol).toHaveLength(0);
    jest.advanceTimersByTime(100);
    expect(enVol.map((v) => v.entree)).toEqual(["ab"]);

    enVol[0].resoudre("<html ab>");
    await tick();
    expect(surResultat).toHaveBeenCalledWith("<html ab>", "ab");
  });

  it("garde une seule demande en attente pendant un vol, puis la lance", async () => {
    const { rendre, enVol } = rendeur();
    const surResultat = jest.fn();
    const file = creerFileDeRendu({
      rendre,
      surResultat,
      surErreur: jest.fn(),
      delaiMs: 10,
    });

    file.rendreMaintenant("a");
    expect(enVol).toHaveLength(1);
    file.demander("ab");
    jest.advanceTimersByTime(10);
    file.demander("abc");
    jest.advanceTimersByTime(10);
    expect(enVol).toHaveLength(1);

    enVol[0].resoudre("<a>");
    await tick();
    // Le résultat de « a » est périmé : jeté.
    expect(surResultat).not.toHaveBeenCalled();
    expect(enVol.map((v) => v.entree)).toEqual(["a", "abc"]);
    enVol[1].resoudre("<abc>");
    await tick();
    expect(surResultat).toHaveBeenCalledWith("<abc>", "abc");
  });

  it("signale l'activité du départ à la fin, erreurs comprises", async () => {
    const { rendre, enVol } = rendeur();
    const surErreur = jest.fn();
    const surActivite = jest.fn();
    const file = creerFileDeRendu({
      rendre,
      surResultat: jest.fn(),
      surErreur,
      surActivite,
      delaiMs: 10,
    });
    file.rendreMaintenant("a");
    expect(surActivite).toHaveBeenLastCalledWith(true);
    enVol[0].rejeter(new Error("panne"));
    await tick();
    expect(surErreur).toHaveBeenCalled();
    expect(surActivite).toHaveBeenLastCalledWith(false);
  });

  it("ne livre plus rien une fois arrêtée", async () => {
    const { rendre, enVol } = rendeur();
    const surResultat = jest.fn();
    const file = creerFileDeRendu({
      rendre,
      surResultat,
      surErreur: jest.fn(),
      delaiMs: 10,
    });
    file.rendreMaintenant("a");
    file.demander("b");
    file.arreter();
    jest.advanceTimersByTime(50);
    enVol[0].resoudre("<a>");
    await tick();
    expect(surResultat).not.toHaveBeenCalled();
    expect(enVol).toHaveLength(1);
  });
});
