/**
 * La liste de puces (`liste-puces.tsx`) : on ajoute une valeur à la fois,
 * on la retire d'une croix, on la modifie en la touchant, et le plafond
 * ferme l'ajout.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { ListePuces } from "./liste-puces";

jest.mock("../../api/cv.api", () => ({
  lireSuggestions: jest.fn(async () => []),
}));

function Harnais({
  initiales = [],
  max,
  surChangement,
}: {
  initiales?: string[];
  max?: number;
  surChangement?: (v: string[]) => void;
}) {
  const [valeurs, setValeurs] = useState(initiales);
  return (
    <ListePuces
      libelle="Missions"
      valeurs={valeurs}
      onChange={(v) => {
        setValeurs(v);
        surChangement?.(v);
      }}
      libelleAjout="Ajouter une mission"
      placeholder="Ex. : Conseiller les clients"
      max={max}
    />
  );
}

describe("ListePuces", () => {
  it("ajoute une mission à « Terminé » du clavier, et garde le champ ouvert pour la suivante", () => {
    const surChangement = jest.fn();
    render(<Harnais surChangement={surChangement} />);
    expect(screen.queryByLabelText("Missions")).toBeNull();

    fireEvent.press(screen.getByText("Ajouter une mission"));
    const champ = screen.getByLabelText("Missions");
    fireEvent.changeText(champ, "  Conseiller les clients ");
    fireEvent(champ, "submitEditing");

    expect(surChangement).toHaveBeenLastCalledWith(["Conseiller les clients"]);
    expect(screen.getByText("Conseiller les clients")).toBeTruthy();
    expect(screen.getByLabelText("Missions").props.value).toBe("");

    fireEvent.changeText(screen.getByLabelText("Missions"), "Tenir la caisse");
    fireEvent.press(screen.getByLabelText("Ajouter"));
    expect(surChangement).toHaveBeenLastCalledWith([
      "Conseiller les clients",
      "Tenir la caisse",
    ]);
  });

  it("n'ajoute rien de vide et referme d'un toucher", () => {
    const surChangement = jest.fn();
    render(<Harnais surChangement={surChangement} />);
    fireEvent.press(screen.getByText("Ajouter une mission"));
    fireEvent(screen.getByLabelText("Missions"), "submitEditing");
    expect(surChangement).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Fermer"));
    expect(screen.queryByLabelText("Missions")).toBeNull();
    expect(screen.getByText("Ajouter une mission")).toBeTruthy();
  });

  it("retire une puce d'une croix", () => {
    const surChangement = jest.fn();
    render(
      <Harnais initiales={["Accueillir", "Encaisser"]} surChangement={surChangement} />,
    );

    fireEvent.press(screen.getByLabelText("Retirer Accueillir"));

    expect(surChangement).toHaveBeenCalledWith(["Encaisser"]);
    expect(screen.queryByText("Accueillir")).toBeNull();
  });

  it("modifie une puce en la touchant, à sa place", () => {
    const surChangement = jest.fn();
    render(
      <Harnais initiales={["Accueillir", "Encaisser"]} surChangement={surChangement} />,
    );

    fireEvent.press(screen.getByLabelText("Accueillir"));
    const champ = screen.getByLabelText("Modifier");
    expect(champ.props.value).toBe("Accueillir");
    fireEvent.changeText(champ, "Accueillir les clients");
    fireEvent.press(screen.getByLabelText("Terminé"));

    expect(surChangement).toHaveBeenCalledWith(["Accueillir les clients", "Encaisser"]);
    expect(screen.queryByLabelText("Modifier")).toBeNull();
  });

  it("annule une modification sans rien changer", () => {
    const surChangement = jest.fn();
    render(<Harnais initiales={["Accueillir"]} surChangement={surChangement} />);
    fireEvent.press(screen.getByLabelText("Accueillir"));
    fireEvent.changeText(screen.getByLabelText("Modifier"), "Autre chose");
    fireEvent.press(screen.getByText("Annuler la modification"));

    expect(surChangement).not.toHaveBeenCalled();
    expect(screen.getByText("Accueillir")).toBeTruthy();
  });

  it("cache « Ajouter » quand le plafond est atteint", () => {
    render(<Harnais initiales={["Une", "Deux"]} max={2} />);

    expect(screen.queryByText("Ajouter une mission")).toBeNull();
  });
});
