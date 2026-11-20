/**
 * Le formulaire d'identité (`formulaires-simples.tsx`) : sous le poste visé,
 * la précision facultative — « Recherche et disponibilité » — avec son
 * exemple, et une saisie vidée qui redevient `null` (rien n'est écrit sur le
 * CV sans elle).
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { Identite } from "../../types/cv.types";
import { FormulaireIdentite } from "./formulaires-simples";

jest.mock("../../api/cv.api", () => ({
  lireSuggestions: jest.fn(async () => []),
}));

const LIBELLE = "Recherche et disponibilité (facultatif)";
const AIDE = "Ex. : Recherche alternance 24 mois · Disponible immédiatement";

const identite: Identite = {
  prenom: "Awa",
  nom: "Diallo",
  titre: "Vendeuse",
  precision: null,
};

function rendre(valeur: Identite = identite, erreurs: Record<string, string> = {}) {
  const onChange = jest.fn<(v: Identite) => void>();
  render(<FormulaireIdentite valeur={valeur} onChange={onChange} erreurs={erreurs} />);
  return onChange;
}

describe("Le formulaire d'identité", () => {
  it("propose la précision sous le poste visé, avec son libellé et son exemple", () => {
    rendre();
    expect(screen.getByText("Poste visé")).toBeTruthy();
    expect(screen.getByText(LIBELLE)).toBeTruthy();
    expect(screen.getByText(AIDE)).toBeTruthy();
    const champ = screen.getByLabelText(LIBELLE);
    expect(champ.props.maxLength).toBe(150);
  });

  it("remonte la frappe, et une saisie vidée redevient `null`", () => {
    const onChange = rendre({ ...identite, precision: "Dès janvier" });
    const champ = screen.getByDisplayValue("Dès janvier");
    fireEvent.changeText(champ, "Disponible immédiatement");
    expect(onChange).toHaveBeenLastCalledWith({
      ...identite,
      precision: "Disponible immédiatement",
    });
    fireEvent.changeText(champ, "");
    expect(onChange).toHaveBeenLastCalledWith({ ...identite, precision: null });
  });

  it("affiche l'erreur de la précision sous son champ", () => {
    rendre(identite, { precision: "150 caractères au plus." });
    expect(screen.getByText("150 caractères au plus.")).toBeTruthy();
  });
});
