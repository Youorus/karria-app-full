/**
 * L'écran bloquant (`ecran-version-obsolete.tsx`) : le message, un seul
 * bouton, et ce bouton mène au magasin.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import { EcranVersionObsolete, TEXTES_VERIFICATION } from "./ecran-version-obsolete";

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
        onVerifier={jest.fn()}
        verification="repos"
      />,
    );

    expect(screen.getByRole("header").props.children).toContain(
      "Une nouvelle version de Karria est sortie",
    );
    expect(screen.getByText("Version 1.2.0")).toBeTruthy();
    // Le magasin, et « J'ai mis à jour, vérifier » — ni « plus tard », ni croix.
    expect(screen.getAllByRole("button")).toHaveLength(2);

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
        onVerifier={jest.fn()}
        verification="repos"
      />,
    );
    expect(screen.getByText("Build 12")).toBeTruthy();
    expect(screen.getByText(/cherche « Karria »/)).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Ouvrir l'App Store" }));
    expect(mettreAJour).toHaveBeenCalledTimes(1);
  });

  describe("« J'ai mis à jour, vérifier »", () => {
    const version = {
      etat: "requise" as const,
      derniereBuild: 12,
      buildMinimale: 12,
      derniereVersion: "1.2.0",
      urlStore: "https://apps.apple.com/fr/app/karria/id1",
    };

    function rendre(
      verification: React.ComponentProps<typeof EcranVersionObsolete>["verification"],
    ) {
      const verifier = jest.fn();
      const mettreAJour = jest.fn();
      render(
        <EcranVersionObsolete
          version={version}
          onMettreAJour={mettreAJour}
          onVerifier={verifier}
          verification={verification}
        />,
      );
      return { verifier, mettreAJour };
    }

    it("redemande au serveur, sans ouvrir le magasin", () => {
      const { verifier, mettreAJour } = rendre("repos");
      fireEvent.press(screen.getByRole("button", { name: TEXTES_VERIFICATION.bouton }));
      expect(verifier).toHaveBeenCalledTimes(1);
      expect(mettreAJour).not.toHaveBeenCalled();
      expect(screen.queryByText(TEXTES_VERIFICATION.toujours)).toBeNull();
      expect(screen.queryByText(TEXTES_VERIFICATION.echec)).toBeNull();
    });

    it("pendant la vérification, le dit et n'en lance pas une seconde", () => {
      const { verifier } = rendre("en-cours");
      expect(screen.getByText(TEXTES_VERIFICATION.enCours)).toBeTruthy();
      fireEvent.press(screen.getByText(TEXTES_VERIFICATION.enCours));
      expect(verifier).not.toHaveBeenCalled();
    });

    it("toujours en retard : le dit, et le magasin reste le geste principal", () => {
      rendre("toujours");
      expect(screen.getByText(TEXTES_VERIFICATION.toujours)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Mettre à jour" })).toBeTruthy();
    });

    it("vérification impossible : dit quoi faire", () => {
      rendre("echec");
      expect(screen.getByText(TEXTES_VERIFICATION.echec)).toBeTruthy();
    });
  });
});
