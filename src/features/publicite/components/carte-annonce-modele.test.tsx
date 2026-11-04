/**
 * La carte d'annonce au format modèle (`carte-annonce-modele.tsx`) :
 * signalée « Sponsorisé », le titre, l'annonceur, l'appel à l'action — et
 * rien qui ressemble à une note ou à un compteur.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";

import type { NativeAd } from "react-native-google-mobile-ads";

import { CarteAnnonceModele } from "./carte-annonce-modele";

// Les vues natives du SDK n'existent pas sous Jest : des vues simples, qui
// rendent leurs enfants, suffisent pour lire ce que la carte affiche.
jest.mock("react-native-google-mobile-ads", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Passe = ({ children }: { children?: React.ReactNode }) => <View>{children}</View>;
  return {
    NativeAdView: Passe,
    NativeAsset: Passe,
    NativeMediaView: () => <View testID="media" />,
    NativeAssetType: {
      HEADLINE: "headline",
      ADVERTISER: "advertiser",
      BODY: "body",
      CALL_TO_ACTION: "callToAction",
    },
  };
});

const annonce = {
  headline: "Formation développeur web",
  advertiser: "École du Code",
  body: "Reconversion en 6 mois.",
  callToAction: "En savoir plus",
} as unknown as NativeAd;

describe("La carte d'annonce au format modèle", () => {
  it("se signale et montre le titre, l'annonceur et l'appel à l'action", () => {
    render(<CarteAnnonceModele annonce={annonce} largeur={160} />);
    expect(screen.getByText("Sponsorisé")).toBeTruthy();
    expect(screen.getByText("Formation développeur web")).toBeTruthy();
    expect(screen.getByText("École du Code")).toBeTruthy();
    expect(screen.getByText("En savoir plus")).toBeTruthy();
    expect(screen.getByTestId("media")).toBeTruthy();
    expect(screen.getByLabelText(/Annonce sponsorisée/)).toBeTruthy();
  });

  it("se passe d'annonceur et d'appel à l'action quand l'annonce n'en a pas", () => {
    render(
      <CarteAnnonceModele
        annonce={{ headline: "Titre seul" } as unknown as NativeAd}
        largeur={160}
      />,
    );
    expect(screen.getByText("Titre seul")).toBeTruthy();
    expect(screen.queryByText("En savoir plus")).toBeNull();
  });
});
