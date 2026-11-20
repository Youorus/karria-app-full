/**
 * L'écran « Mes recherches » (`ecran-mes-recherches.tsx`) : ce qui se lit
 * et ce que le lecteur d'écran annonce — l'interrupteur de chaque
 * recherche, la suppression offerte sans glisser, l'attente, l'erreur et
 * l'état vide. Le hook est simulé : c'est la vue qu'on éprouve.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import type { RechercheEnregistree } from "@/features/assistant/types/recherches-enregistrees.types";

import type { EcranMesRecherches as Etat } from "../hooks/use-mes-recherches";
import { EcranMesRecherches } from "./ecran-mes-recherches";

// L'aura dessine avec Skia, le chargeur anime une image : absents sous
// Jest, et sans intérêt pour ce qu'on vérifie ici.
jest.mock("@/components/aura", () => ({ Aura: () => null }));
jest.mock("@/components/chargeur-karria", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return { ChargeurKarria: () => <Text>chargeur</Text> };
});
jest.mock("@/components/icone", () => ({ Icone: () => null }));
// Sous Jest, pas de moteur de gestes : la ligne se rend sans son
// glissement, qu'on éprouve par l'action d'accessibilité.
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => children,
}));

let mockEtat: Etat;
jest.mock("../hooks/use-mes-recherches", () => ({
  useMesRecherches: () => mockEtat,
}));

const MAINTENANT = new Date(2026, 10, 20, 12, 0, 0);

function recherche(surcharge: Partial<RechercheEnregistree>): RechercheEnregistree {
  return {
    id: "a",
    resume: "Serveur · Paris (30 km) · CDI",
    demande: "serveur à Paris",
    metiers: ["Serveur"],
    lieu: "Paris",
    touteLaFrance: false,
    contrats: ["cdi"],
    alertes: true,
    enCours: true,
    creeeLe: new Date(2026, 10, 18, 9).toISOString(),
    utiliseeLe: new Date(2026, 10, 20, 9).toISOString(),
    derniereAlerteLe: null,
    ...surcharge,
  };
}

const COURANTE = recherche({});
const ANCIENNE = recherche({
  id: "b",
  resume: "Vendeur · Lyon (30 km)",
  alertes: false,
  enCours: false,
  utiliseeLe: new Date(2026, 10, 3, 9).toISOString(),
});

function etat(surcharge: Partial<Etat> = {}): Etat {
  return {
    recherches: [COURANTE, ANCIENNE],
    maximum: 10,
    chargement: false,
    actualisation: false,
    erreur: null,
    note: null,
    maintenant: MAINTENANT,
    actualiser: jest.fn(),
    basculer: jest.fn(),
    supprimer: jest.fn(),
    parlerAKarria: jest.fn(),
    retour: jest.fn(),
    ...surcharge,
  };
}

beforeEach(() => {
  mockEtat = etat();
});

describe("L'écran « Mes recherches »", () => {
  it("dit à quoi sert la liste, et le plafond du serveur", () => {
    render(<EcranMesRecherches />);
    expect(screen.getByRole("header")).toHaveTextContent("Mes recherches");
    expect(
      screen.getByText(
        "Karria surveille ces recherches et te prévient dès qu'une offre correspond.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Jusqu'à 10 recherches ; au-delà, la plus ancienne est remplacée.",
      ),
    ).toBeTruthy();
  });

  it("montre chaque recherche : son résumé, puis « en cours » ou sa dernière utilisation", () => {
    render(<EcranMesRecherches />);
    expect(screen.getByText("Serveur · Paris (30 km) · CDI")).toBeTruthy();
    expect(screen.getByText("Recherche en cours")).toBeTruthy();
    expect(screen.getByText("Vendeur · Lyon (30 km)")).toBeTruthy();
    expect(screen.getByText("Utilisée le 3 nov.")).toBeTruthy();
    expect(
      screen.getByLabelText("Serveur · Paris (30 km) · CDI, Recherche en cours"),
    ).toBeTruthy();
  });

  it("nomme chaque interrupteur « Alertes pour … » et reflète l'état de l'alerte", () => {
    render(<EcranMesRecherches />);
    const active = screen.getByLabelText("Alertes pour Serveur · Paris (30 km) · CDI");
    const coupee = screen.getByLabelText("Alertes pour Vendeur · Lyon (30 km)");
    expect(active.props.value).toBe(true);
    expect(coupee.props.value).toBe(false);

    fireEvent(coupee, "valueChange", true);
    expect(mockEtat.basculer).toHaveBeenCalledWith(ANCIENNE, true);
    fireEvent(active, "valueChange", false);
    expect(mockEtat.basculer).toHaveBeenCalledWith(COURANTE, false);
  });

  it("offre la suppression au lecteur d'écran, sans glisser", () => {
    render(<EcranMesRecherches />);
    const ligne = screen.getByLabelText("Vendeur · Lyon (30 km), Utilisée le 3 nov.");
    expect(ligne.props.accessibilityActions).toEqual([
      { name: "delete", label: "Supprimer" },
    ]);
    fireEvent(ligne, "accessibilityAction", { nativeEvent: { actionName: "delete" } });
    expect(mockEtat.supprimer).toHaveBeenCalledWith(ANCIENNE);
  });

  it("revient aux paramètres par l'en-tête", () => {
    render(<EcranMesRecherches />);
    fireEvent.press(screen.getByRole("button", { name: "Retour à Paramètres" }));
    expect(mockEtat.retour).toHaveBeenCalledTimes(1);
  });

  it("montre le chargeur pendant la première lecture, et rien d'autre", () => {
    mockEtat = etat({ chargement: true, recherches: [], maximum: null });
    render(<EcranMesRecherches />);
    expect(screen.getByText("chargeur")).toBeTruthy();
    expect(screen.queryByRole("header")).toBeNull();
  });

  it("dit l'erreur de lecture avec « Réessayer », sans prétendre que la liste est vide", () => {
    const actualiser = jest.fn();
    mockEtat = etat({
      recherches: [],
      maximum: null,
      erreur: "Tes recherches n'ont pas pu être chargées.",
      actualiser,
    });
    render(<EcranMesRecherches />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tes recherches n'ont pas pu être chargées.",
    );
    fireEvent.press(screen.getByRole("button", { name: "Réessayer" }));
    expect(actualiser).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Tu n'as pas encore de recherche/)).toBeNull();
  });

  it("annonce la phrase d'une bascule échouée, la liste restant là", () => {
    mockEtat = etat({
      note: "L'alerte n'a pas pu être modifiée. Réessaie dans un instant.",
    });
    render(<EcranMesRecherches />);
    expect(screen.getByRole("alert")).toHaveTextContent(/n'a pas pu être modifiée/);
    expect(screen.getByText("Vendeur · Lyon (30 km)")).toBeTruthy();
  });

  it("vide : invite à parler à Karria, sans phrase d'en-tête ni pied", () => {
    const parlerAKarria = jest.fn();
    mockEtat = etat({ recherches: [], parlerAKarria });
    render(<EcranMesRecherches />);
    expect(
      screen.getByText(
        "Tu n'as pas encore de recherche. Dis à Karria ce que tu cherches : elle la gardera ici.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Karria surveille ces recherches/)).toBeNull();
    expect(screen.queryByText(/Jusqu'à 10 recherches/)).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Parler à Karria" }));
    expect(parlerAKarria).toHaveBeenCalledTimes(1);
  });
});
