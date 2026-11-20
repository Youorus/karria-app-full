/**
 * La feuille de proposition (`feuille-proposition.tsx`) : un bouton plein
 * qui mène à l'abonnement, un bouton qui dit non, et rien quand elle est
 * fermée — elle ne s'interpose jamais.
 */

// La demi-feuille porte un geste de glissement : le simulateur publié par
// la bibliothèque remplace son module natif, absent sous Jest.
import "react-native-gesture-handler/jestSetup";

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { propositionFiligrane } from "../services/proposition";
import { FeuilleProposition } from "./feuille-proposition";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<Record<string, unknown>>("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

const textes = propositionFiligrane(499);

function rendre(visible = true) {
  const gestes = { onAccepter: jest.fn(), onFermer: jest.fn() };
  render(<FeuilleProposition visible={visible} textes={textes} {...gestes} />);
  return gestes;
}

describe("La feuille de proposition", () => {
  it("fermée, ne monte rien", () => {
    rendre(false);
    expect(screen.queryByText("Ton CV est prêt")).toBeNull();
  });

  it("dit le titre, la phrase et ses deux boutons", () => {
    rendre();
    expect(screen.getByText("Ton CV est prêt")).toBeTruthy();
    expect(screen.getByText(textes.texte)).toBeTruthy();
    expect(screen.getByText("Retirer le filigrane — 4,99 €/mois")).toBeTruthy();
    expect(screen.getByText("Garder mon CV avec le filigrane")).toBeTruthy();
  });

  it("le bouton principal accepte, le secondaire et la croix ferment", () => {
    const gestes = rendre();
    fireEvent.press(screen.getByText("Retirer le filigrane — 4,99 €/mois"));
    expect(gestes.onAccepter).toHaveBeenCalledTimes(1);
    expect(gestes.onFermer).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText("Garder mon CV avec le filigrane"));
    expect(gestes.onFermer).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText("Fermer"));
    expect(gestes.onFermer).toHaveBeenCalledTimes(2);
  });
});
