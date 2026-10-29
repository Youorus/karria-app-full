/**
 * Le drapeau « sans pub » : recopié, abonnable, remis à zéro.
 */

import { afterEach, describe, expect, it, jest } from "@jest/globals";

import { abonnerSansPub, estSansPub, poserSansPub } from "./sans-pub";

describe("sans pub", () => {
  afterEach(() => poserSansPub(false));

  it("vaut non tant que le serveur n'a rien dit", () => {
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
});
