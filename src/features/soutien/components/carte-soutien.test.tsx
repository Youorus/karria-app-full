/**
 * La section « Soutenir Karria » (`carte-soutien.tsx` et ses surfaces) :
 * deux propositions distinctes, les gestes du hook appelés tels quels.
 *
 * Le hook est simulé : ces tests ne parlent que de présentation — ce qui
 * s'affiche selon l'état, et quel geste part à quel appui.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Modal } from "react-native";

import type { Soutien } from "../hooks/use-soutien";
import type { Catalogue, Facturation } from "../types/soutien.types";
import { CarteSoutien } from "./carte-soutien";
import { FeuilleSansPub } from "./feuille-sans-pub";

// Le simulateur publié par Reanimated n'a pas `useReducedMotion` : on le
// complète ici, en mouvement normal.
jest.mock("react-native-reanimated", () => ({
  ...jest.requireActual<Record<string, unknown>>("react-native-reanimated/mock"),
  useReducedMotion: () => false,
}));

const CATALOGUE: Catalogue = {
  sansPub: { libelle: "Karria sans pub", prixCentimes: 499 },
  cafes: [
    { tasses: 1, prixCentimes: 299 },
    { tasses: 2, prixCentimes: 499 },
    { tasses: 3, prixCentimes: 799 },
    { tasses: 5, prixCentimes: 1299 },
  ],
  modeles: new Map(),
  actif: true,
};

const SANS_ABONNEMENT: Facturation = {
  sansPub: {
    actif: false,
    statut: "aucun",
    jusquAu: null,
    resiliationEnFinDePeriode: false,
    gerable: false,
  },
  cafes: { nombre: 0, dernierLe: null },
  actif: true,
};

function soutien(partiel: Partial<Soutien> = {}): Soutien {
  return {
    catalogue: CATALOGUE,
    facturation: SANS_ABONNEMENT,
    actif: true,
    choix: 2,
    offreChoisie: { tasses: 2, prixCentimes: 499 },
    phase: "repos",
    cafeEnCours: false,
    merci: false,
    erreur: null,
    choisir: jest.fn(),
    passerSansPub: jest.fn(),
    offrir: jest.fn(),
    gerer: jest.fn(),
    recommencer: jest.fn(),
    effacerErreur: jest.fn(),
    ...partiel,
  };
}

describe("CarteSoutien", () => {
  it("présente deux surfaces : l'entrée sans pub avec son prix et son bouton, et le café", () => {
    render(<CarteSoutien soutien={soutien()} />);

    expect(screen.getByRole("header", { name: "Soutenir Karria" })).toBeTruthy();
    expect(
      screen.getByRole("header", { name: "Ton fil, sans aucune annonce." }),
    ).toBeTruthy();
    expect(screen.getAllByText("4,99 €").length).toBeGreaterThan(0);
    expect(screen.getByText("moins de 0,17 € par jour")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Passer sans pub" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Nous offrir un café" })).toBeTruthy();
    expect(screen.queryByText(/☕/)).toBeNull();
  });

  it("laisse choisir sa tasse et offre le café choisi", () => {
    const s = soutien();
    render(<CarteSoutien soutien={s} />);

    const deux = screen.getByRole("radio", { name: "Deux cafés, 4,99 €" });
    expect(deux.props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByRole("radio", { name: "Cinq cafés, 12,99 €" }));
    expect(s.choisir).toHaveBeenCalledWith(5);

    fireEvent.press(screen.getByRole("button", { name: "Offrir deux cafés · 4,99 €" }));
    expect(s.offrir).toHaveBeenCalledTimes(1);
  });

  it("ouvre la feuille de l'offre depuis l'entrée, et la feuille ferme sur « Fermer »", () => {
    render(<CarteSoutien soutien={soutien()} />);
    expect(
      screen.queryByRole("button", { name: "S'abonner pour 4,99 € / mois" }),
    ).toBeNull();

    fireEvent.press(screen.getByRole("button", { name: "Passer sans pub" }));

    expect(
      screen.getByRole("button", { name: "S'abonner pour 4,99 € / mois" }),
    ).toBeTruthy();
    expect(screen.getByText("Aucune annonce dans ton fil")).toBeTruthy();
    expect(screen.getByText("4,99 € / mois")).toBeTruthy();
    expect(screen.getAllByText(/Paiement sécurisé par Stripe/).length).toBeGreaterThan(0);
  });

  it("valorise l'état « Tu es sans pub » et mène au portail", () => {
    const s = soutien({
      facturation: {
        ...SANS_ABONNEMENT,
        sansPub: {
          actif: true,
          statut: "actif",
          jusquAu: new Date("2026-11-28T12:00:00Z"),
          resiliationEnFinDePeriode: false,
          gerable: true,
        },
      },
    });
    render(<CarteSoutien soutien={s} />);

    expect(screen.getByRole("header", { name: "Tu es sans pub" })).toBeTruthy();
    expect(screen.getByText(/Prochain renouvellement le 28 novembre 2026/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Passer sans pub" })).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "Gérer mon abonnement" }));
    expect(s.gerer).toHaveBeenCalledTimes(1);
  });

  it("dit merci après un café, et propose d'en offrir un autre", () => {
    const s = soutien({ merci: true });
    render(<CarteSoutien soutien={s} />);

    expect(screen.getByRole("header", { name: "Merci, vraiment." })).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    fireEvent.press(screen.getByRole("button", { name: "En offrir un autre" }));
    expect(s.recommencer).toHaveBeenCalledTimes(1);
  });

  it("montre l'attente du paiement sans pub dans l'entrée, sans l'ouvrir", () => {
    render(<CarteSoutien soutien={soutien({ phase: "confirmation" })} />);
    expect(screen.getByText("On attend la confirmation du paiement…")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "On attend la confirmation du paiement…" }).props
        .accessibilityState.disabled,
    ).toBe(true);
  });

  it("sans interrupteur serveur, ne propose aucun paiement", () => {
    render(<CarteSoutien soutien={soutien({ actif: false })} />);
    expect(screen.getByRole("header", { name: "Soutenir Karria" })).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("rappelle les cafés déjà offerts, un fait du serveur", () => {
    render(
      <CarteSoutien
        soutien={soutien({
          facturation: { ...SANS_ABONNEMENT, cafes: { nombre: 3, dernierLe: null } },
        })}
      />,
    );
    expect(screen.getByText("Tu nous as déjà offert 3 cafés. Merci !")).toBeTruthy();
  });

  it("affiche l'erreur du hook avec « Compris »", () => {
    const s = soutien({ erreur: "La page de paiement n'a pas pu s'ouvrir." });
    render(<CarteSoutien soutien={s} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/n'a pas pu s'ouvrir/);
    fireEvent.press(screen.getByRole("button", { name: "Compris" }));
    expect(s.effacerErreur).toHaveBeenCalledTimes(1);
  });
});

describe("FeuilleSansPub", () => {
  it("ferme d'abord, et ne lance le paiement qu'une fois la feuille disparue (iOS)", () => {
    const s = soutien();
    const fermer = jest.fn();
    render(<FeuilleSansPub visible soutien={s} onFermer={fermer} />);

    fireEvent.press(screen.getByRole("button", { name: "S'abonner pour 4,99 € / mois" }));

    expect(fermer).toHaveBeenCalledTimes(1);
    expect(s.passerSansPub).not.toHaveBeenCalled();
    // La feuille native prévient quand elle a disparu : c'est là que ça part.
    fireEvent(screen.UNSAFE_getByType(Modal), "dismiss");
    expect(s.passerSansPub).toHaveBeenCalledTimes(1);
  });

  it("« Pas maintenant » referme sans rien lancer", () => {
    const s = soutien();
    const fermer = jest.fn();
    render(<FeuilleSansPub visible soutien={s} onFermer={fermer} />);
    fireEvent.press(screen.getByRole("button", { name: "Pas maintenant" }));
    expect(fermer).toHaveBeenCalledTimes(1);
    expect(s.passerSansPub).not.toHaveBeenCalled();
  });

  it("« Fermer » referme sans rien lancer", () => {
    const s = soutien();
    const fermer = jest.fn();
    render(<FeuilleSansPub visible soutien={s} onFermer={fermer} />);
    fireEvent.press(screen.getByRole("button", { name: "Fermer" }));
    expect(fermer).toHaveBeenCalledTimes(1);
    expect(s.passerSansPub).not.toHaveBeenCalled();
  });
});
