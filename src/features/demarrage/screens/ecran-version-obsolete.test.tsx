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
  it("dit qu'une nouvelle version attend, et n'offre qu'un geste", () => {
    const mettreAJour = jest.fn();
    render(<EcranVersionObsolete onMettreAJour={mettreAJour} />);

    expect(screen.getByRole("header").props.children).toContain(
      "Une nouvelle version de Karria t",
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.press(screen.getByRole("button", { name: "Mettre à jour" }));
    expect(mettreAJour).toHaveBeenCalledTimes(1);
    expect(View).toBeDefined();
  });
});
