/**
 * La carte d'identité du profil (`carte-identite.tsx`) : le nom en titre,
 * l'adresse complète dessous — jamais un pseudonyme.
 */

import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import type { Identite } from "../services/identite";
import { CarteIdentite } from "./carte-identite";

const MARC: Identite = {
  nom: "Marc Takoumba",
  titre: "Data engineer",
  sousLeNom: "marc@exemple.fr",
  initiales: "MT",
  photo: null,
};

describe("CarteIdentite", () => {
  it("met le nom du CV en titre et l'adresse complète dessous", () => {
    render(<CarteIdentite identite={MARC} />);

    expect(screen.getByRole("header")).toHaveTextContent("Marc Takoumba");
    expect(screen.getByText("marc@exemple.fr")).toBeTruthy();
    expect(screen.queryByText(/^@/)).toBeNull();
  });

  it("montre le métier visé quand l'adresse manque, et rien s'il n'y a rien", () => {
    render(<CarteIdentite identite={{ ...MARC, sousLeNom: "Data engineer" }} />);
    expect(screen.getByText("Data engineer")).toBeTruthy();

    render(<CarteIdentite identite={{ ...MARC, sousLeNom: null }} />);
    expect(screen.queryByText("Ton métier visé")).toBeNull();
  });

  it("annonce les initiales quand il n'y a pas de photo", () => {
    render(<CarteIdentite identite={MARC} />);
    expect(screen.getByLabelText("Initiales MT")).toBeTruthy();
  });

  it("montre un squelette sans en-tête tant que l'identité charge", () => {
    render(<CarteIdentite identite={null} />);
    expect(screen.queryByRole("header")).toBeNull();
  });
});
