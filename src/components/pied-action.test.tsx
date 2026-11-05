/**
 * Le pied d'action partagé, `PiedAction`.
 *
 * Ce que ces tests protègent : en flottant, le pied se tient **au-dessus
 * de la marge basse du système** (barre de gestes Android, indicateur
 * d'accueil iOS). Un enfant absolu ignore le padding de la `SafeAreaView`
 * de l'écran ; c'est donc le pied lui-même qui lit la marge. Dans le flux,
 * rien de tout cela : l'écran s'en charge.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

/* eslint-disable import/first -- après le `jest.mock`, hissé avant le
   module testé. */
import { Texte } from "./texte";
import { PiedAction } from "./pied-action";
/* eslint-enable import/first */

/** Le premier ancêtre qui pose une position `bottom`, ou `null`. */
function positionBasse(): number | null {
  let noeud = screen.getByText("Continuer").parent;
  while (noeud) {
    const style = StyleSheet.flatten(noeud.props.style) as
      { bottom?: number } | undefined;
    if (style?.bottom !== undefined) return style.bottom;
    noeud = noeud.parent;
  }
  return null;
}

describe("PiedAction", () => {
  it("en flottant, se pose au-dessus de la marge basse du système", () => {
    render(
      <PiedAction flottant>
        <Texte>Continuer</Texte>
      </PiedAction>,
    );
    expect(positionBasse()).toBe(34);
  });

  it("dans le flux, ne pose aucune position", () => {
    render(
      <PiedAction>
        <Texte>Continuer</Texte>
      </PiedAction>,
    );
    expect(positionBasse()).toBeNull();
  });
});
