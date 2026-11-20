/**
 * La feuille « Poste visé » de l'atelier (`feuille-intitule.tsx`) : le poste
 * visé, et juste dessous la précision facultative. Chaque frappe se voit sur
 * la feuille par son propre chemin ; « Enregistrer » retient les deux.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { FeuilleIntitule } from "./feuille-intitule";

jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<Record<string, unknown>>("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

jest.mock("@/features/cv/api/cv.api", () => ({
  lireSuggestions: jest.fn(async () => []),
}));

const LIBELLE = "Recherche et disponibilité (facultatif)";

function rendre(precision: string | null = null) {
  const gestes = {
    onApercu: jest.fn<(t: string) => void>(),
    onApercuPrecision: jest.fn<(t: string) => void>(),
    onEnregistrer: jest.fn<(titre: string, precision: string) => void>(),
    onFermer: jest.fn(),
  };
  render(<FeuilleIntitule visible titre="Vendeuse" precision={precision} {...gestes} />);
  return gestes;
}

describe("La feuille « Poste visé »", () => {
  it("ne monte rien tant qu'elle est fermée", () => {
    render(
      <FeuilleIntitule
        visible={false}
        titre="Vendeuse"
        precision={null}
        onApercu={jest.fn()}
        onApercuPrecision={jest.fn()}
        onEnregistrer={jest.fn()}
        onFermer={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText(LIBELLE)).toBeNull();
  });

  it("montre la précision sous le poste visé, avec son exemple", () => {
    rendre("Dès janvier");
    expect(screen.getByText(LIBELLE)).toBeTruthy();
    expect(
      screen.getByText("Ex. : Recherche alternance 24 mois · Disponible immédiatement"),
    ).toBeTruthy();
    expect(screen.getByDisplayValue("Dès janvier")).toBeTruthy();
  });

  it("patche la feuille à la frappe sur le chemin de la précision, pas sur celui du poste", () => {
    const gestes = rendre();
    fireEvent.changeText(screen.getByLabelText(LIBELLE), "Disponible immédiatement");
    expect(gestes.onApercuPrecision).toHaveBeenLastCalledWith("Disponible immédiatement");
    expect(gestes.onApercu).not.toHaveBeenCalled();
  });

  it("enregistre le poste et la précision ensemble, puis se ferme", () => {
    const gestes = rendre();
    // Rien n'a changé : « Enregistrer » est inerte.
    fireEvent.press(screen.getByText("Enregistrer"));
    expect(gestes.onEnregistrer).not.toHaveBeenCalled();
    fireEvent.changeText(screen.getByLabelText(LIBELLE), "Recherche alternance 24 mois");
    fireEvent.press(screen.getByText("Enregistrer"));
    expect(gestes.onEnregistrer).toHaveBeenCalledWith(
      "Vendeuse",
      "Recherche alternance 24 mois",
    );
    expect(gestes.onFermer).toHaveBeenCalledTimes(1);
  });
});
