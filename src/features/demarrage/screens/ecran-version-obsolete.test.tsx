/**
 * L'écran bloquant (`ecran-version-obsolete.tsx`) : le message, un seul
 * bouton, et ce bouton mène au magasin.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { EcranVersionObsolete } from "./ecran-version-obsolete";

// L'aura et l'orbe dessinent avec Skia et SVG, absents sous Jest : ici,
// des vues vides — c'est le texte et le bouton qu'on éprouve.
jest.mock("@/components/aura", () => ({ Aura: () => null }));
jest.mock("@/components/orbe-vivante", () => ({
  OrbeVivante: ({ children }: { children?: React.ReactNode }) => {
    const { View: V } = jest.requireActual<typeof import("react-native")>("react-native");
    return <V>{children}</V>;
  },
}));
jest.mock("@/components/marque", () => ({ SymboleKarria: () => null }));

describe("L'écran « version obsolète »", () => {
  it("dit la nouvelle version, et n'offre qu'un geste : le magasin", () => {
    const mettreAJour = jest.fn();
    render(
      <EcranVersionObsolete
        version={{
          etat: "disponible",
          derniereBuild: 12,
          buildMinimale: 0,
          derniereVersion: "1.2.0",
          urlStore: "https://apps.apple.com/fr/app/karria/id1",
        }}
        onMettreAJour={mettreAJour}
      />,
    );

    expect(screen.getByRole("header").props.children).toContain(
      "Une nouvelle version de Karria est sortie",
    );
    expect(screen.getByText("Version 1.2.0")).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.press(screen.getByRole("button", { name: "Mettre à jour" }));
    expect(mettreAJour).toHaveBeenCalledTimes(1);
    expect(View).toBeDefined();
  });

  it("sans fiche de magasin, dit où aller et ouvre quand même le magasin", () => {
    const mettreAJour = jest.fn();
    render(
      <EcranVersionObsolete
        version={{
          etat: "disponible",
          derniereBuild: 12,
          buildMinimale: 0,
          derniereVersion: null,
          urlStore: null,
        }}
        onMettreAJour={mettreAJour}
      />,
    );
    expect(screen.getByText("Build 12")).toBeTruthy();
    expect(screen.getByText(/cherche « Karria »/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button"));
    expect(mettreAJour).toHaveBeenCalledTimes(1);
  });
});
