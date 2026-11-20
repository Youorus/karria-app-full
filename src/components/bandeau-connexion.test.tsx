/**
 * Le bandeau de connexion (`bandeau-connexion.tsx`), avec le vrai état
 * (`lib/etat-connexion.ts`) ; seule l'écoute de l'appareil est remplacée.
 *
 * Ce que ces tests protègent : les trois phrases, mot pour mot ; l'annonce
 * au lecteur d'écran à chaque changement ; la croix qui retire le bandeau
 * sans rien couper d'autre ; « Connexion rétablie » qui part seule.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { DUREE_RETABLIE_MS, ECART_RELANCES_MS, FENETRE_SALVE_MS } from "@/lib/connexion";
import {
  noterAppareil,
  noterEchecReseau,
  noterSuccesReseau,
  reinitialiserConnexion,
} from "@/lib/etat-connexion";

import { BandeauConnexion } from "./bandeau-connexion";

const mockArreter = jest.fn();
const mockSurveiller = jest.fn(() => mockArreter);
jest.mock("@/lib/ecoute-reseau", () => ({
  surveillerLeReseau: () => mockSurveiller(),
}));

const HORS_LIGNE = "Pas de connexion. Karria reprendra dès qu'elle revient.";
const INSTABLE = "Connexion instable. Certaines actions peuvent être lentes.";
const RETABLIE = "Connexion rétablie";

let annoncer: jest.SpiedFunction<typeof AccessibilityInfo.announceForAccessibility>;

beforeEach(() => {
  jest.useFakeTimers();
  reinitialiserConnexion();
  noterAppareil("en-ligne");
  jest.advanceTimersByTime(ECART_RELANCES_MS);
  annoncer = jest
    .spyOn(AccessibilityInfo, "announceForAccessibility")
    .mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  reinitialiserConnexion();
  jest.useRealTimers();
});

describe("Le bandeau de connexion", () => {
  it("ne montre rien quand la connexion est bonne, et écoute l'appareil", () => {
    const { unmount } = render(<BandeauConnexion />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(annoncer).not.toHaveBeenCalled();
    expect(mockSurveiller).toHaveBeenCalledTimes(1);

    unmount();
    expect(mockArreter).toHaveBeenCalledTimes(1);
  });

  it("hors ligne : la phrase, en alerte, annoncée au lecteur d'écran", () => {
    render(<BandeauConnexion />);
    act(() => noterAppareil("sans-reseau"));

    expect(screen.getByText(HORS_LIGNE)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(annoncer).toHaveBeenCalledWith(HORS_LIGNE);
    expect(screen.getByRole("button", { name: "Masquer" })).toBeTruthy();
  });

  it("instable : après deux incidents alors que l'appareil se dit connecté", () => {
    render(<BandeauConnexion />);
    act(() => noterEchecReseau());
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => {
      jest.advanceTimersByTime(FENETRE_SALVE_MS);
      noterEchecReseau();
    });
    expect(screen.getByText(INSTABLE)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(annoncer).toHaveBeenCalledWith(INSTABLE);
  });

  it("au retour : « Connexion rétablie » deux secondes, sans croix, puis plus rien", () => {
    render(<BandeauConnexion />);
    act(() => noterAppareil("sans-reseau"));
    act(() => noterAppareil("en-ligne"));

    expect(screen.queryByText(HORS_LIGNE)).toBeNull();
    expect(screen.getByText(RETABLIE)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(annoncer).toHaveBeenLastCalledWith(RETABLIE);

    act(() => jest.advanceTimersByTime(DUREE_RETABLIE_MS - 1));
    expect(screen.getByText(RETABLIE)).toBeTruthy();
    act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("au premier succès après une période instable : rétablie aussi", () => {
    render(<BandeauConnexion />);
    act(() => {
      noterEchecReseau();
      jest.advanceTimersByTime(FENETRE_SALVE_MS);
      noterEchecReseau();
    });
    act(() => noterSuccesReseau());
    expect(screen.getByText(RETABLIE)).toBeTruthy();
  });

  it("la croix le retire ; il revient au prochain changement d'état", () => {
    render(<BandeauConnexion />);
    act(() => noterAppareil("sans-reseau"));
    fireEvent.press(screen.getByRole("button", { name: "Masquer" }));
    expect(screen.queryByRole("alert")).toBeNull();

    act(() => noterAppareil("en-ligne"));
    expect(screen.getByText(RETABLIE)).toBeTruthy();
  });

  it("n'a aucun bouton d'action : il informe, il ne demande rien", () => {
    render(<BandeauConnexion />);
    act(() => noterAppareil("sans-reseau"));
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
