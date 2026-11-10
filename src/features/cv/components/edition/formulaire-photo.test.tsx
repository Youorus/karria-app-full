/**
 * Le formulaire photo (`formulaire-photo.tsx`) : trois temps, un seul geste
 * principal à chaque fois — rendre la photo pro au repos quand il y en a
 * une, la promesse après le choix, le choix explicite à la comparaison.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { TEXTES_PHOTO } from "../../services/photo";
import { FormulairePhoto } from "./formulaire-photo";

// Le simulateur publié par Reanimated n'a pas `useReducedMotion` : on le
// complète ici, en mouvement normal.
jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<Record<string, unknown>>("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

function rendre(props: Partial<React.ComponentProps<typeof FormulairePhoto>> = {}) {
  const gestes = {
    onChanger: jest.fn(),
    onAmeliorer: jest.fn(),
    onAmeliorerActuelle: jest.fn(),
    onGarder: jest.fn(),
    onRetirer: jest.fn(),
  };
  render(
    <FormulairePhoto
      valeur={{ image: "https://s/actuelle.jpg", imageId: null }}
      etape={{ nom: "repos" }}
      enCours={false}
      probleme={null}
      {...gestes}
      {...props}
    />,
  );
  return gestes;
}

describe("Le formulaire photo", () => {
  it("au repos avec une photo, met en avant « Rendre ma photo professionnelle »", () => {
    const gestes = rendre();
    fireEvent.press(screen.getByText(TEXTES_PHOTO.action));
    expect(gestes.onAmeliorerActuelle).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Retirer la photo")).toBeTruthy();
  });

  it("sans photo, ne propose pas l'amélioration : il n'y a rien à retravailler", () => {
    rendre({ valeur: { image: null, imageId: null } });
    expect(screen.queryByText(TEXTES_PHOTO.action)).toBeNull();
    expect(screen.queryByText("Retirer la photo")).toBeNull();
    expect(screen.getByText("Prendre une photo")).toBeTruthy();
  });

  it("après le choix, dit la promesse et laisse garder l'originale", () => {
    const gestes = rendre({ etape: { nom: "amelioration", originale: "file:///n.jpg" } });
    expect(screen.getByText(TEXTES_PHOTO.promesse)).toBeTruthy();
    fireEvent.press(screen.getByText(TEXTES_PHOTO.garderOriginale));
    expect(gestes.onAmeliorer).toHaveBeenCalledWith(false);
    fireEvent.press(screen.getByText(TEXTES_PHOTO.action));
    expect(gestes.onAmeliorer).toHaveBeenCalledWith(true);
  });

  it("à la comparaison, nomme les deux portraits et les deux choix", () => {
    const gestes = rendre({
      etape: {
        nom: "comparaison",
        origine: "actuelle",
        originale: "https://s/actuelle.jpg",
        amelioree: "https://s/retravaillee.jpg",
        idAmelioree: "img_2",
      },
    });
    expect(screen.getByLabelText(TEXTES_PHOTO.originale)).toBeTruthy();
    expect(screen.getByLabelText(TEXTES_PHOTO.amelioree)).toBeTruthy();
    expect(screen.getByText(TEXTES_PHOTO.comparaison)).toBeTruthy();
    fireEvent.press(screen.getByText(TEXTES_PHOTO.garderAmelioree));
    expect(gestes.onGarder).toHaveBeenCalledWith("amelioree");
    fireEvent.press(screen.getByText(TEXTES_PHOTO.garderOriginale));
    expect(gestes.onGarder).toHaveBeenCalledWith("originale");
  });

  it("quand l'amélioration a échoué, montre l'originale seule, le mot qui explique, et un seul bouton", () => {
    rendre({
      etape: {
        nom: "comparaison",
        origine: "nouvelle",
        originale: "file:///n.jpg",
        amelioree: null,
        idAmelioree: null,
      },
      probleme: "Cette photo ne peut pas être retravaillée.",
    });
    expect(screen.queryByText(TEXTES_PHOTO.garderAmelioree)).toBeNull();
    expect(screen.getByText(TEXTES_PHOTO.originaleSuffit)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(TEXTES_PHOTO.garderOriginale)).toBeTruthy();
  });
});
