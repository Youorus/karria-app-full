/**
 * Le bouton d'action partagé, `BoutonAction`.
 *
 * Tous les tests d'écran pressent leurs boutons par
 * `getByRole("button", { name })`. Ce fichier prouve ce contrat, et
 * surtout celui de l'attente : un bouton qui se presse deux fois pendant
 * un envoi, c'est un colis réservé deux fois.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *
 * 1. **désactivé ou en cours, il ne déclenche rien** et le dit au lecteur
 *    d'écran ;
 * 2. **il s'annonce comme un bouton, sous son libellé** ;
 * 3. **l'attente se voit** : libellé d'attente, état `busy` ;
 * 4. l'icône de fin s'efface pendant l'attente, l'icône de début laisse
 *    place à l'indicateur.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { Texte } from "./texte";
import { BoutonAction } from "./bouton-action";

describe("BoutonAction", () => {
  it("s'annonce comme un bouton, sous son libellé, et l'affiche", () => {
    render(<BoutonAction libelle="Continuer" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Continuer" })).toBeTruthy();
    expect(screen.getByText("Continuer")).toBeTruthy();
  });

  it("déclenche son action à l'appui", () => {
    const surAppui = jest.fn();
    render(<BoutonAction libelle="Continuer" onPress={surAppui} />);

    fireEvent.press(screen.getByRole("button", { name: "Continuer" }));

    expect(surAppui).toHaveBeenCalledTimes(1);
  });

  it("est actif par défaut, et ni occupé ni désactivé", () => {
    render(<BoutonAction libelle="Continuer" onPress={jest.fn()} />);

    const bouton = screen.getByRole("button", { name: "Continuer" });
    expect(bouton).toBeEnabled();
    expect(bouton).not.toBeBusy();
  });

  it("désactivé, s'annonce désactivé et ne déclenche rien", () => {
    const surAppui = jest.fn();
    render(<BoutonAction libelle="Continuer" desactive onPress={surAppui} />);

    const bouton = screen.getByRole("button", { name: "Continuer" });
    expect(bouton).toBeDisabled();
    fireEvent.press(bouton);
    expect(surAppui).not.toHaveBeenCalled();
  });

  it("en cours, s'annonce occupé et désactivé, et ne déclenche rien", () => {
    const surAppui = jest.fn();
    render(<BoutonAction libelle="Envoyer" enCours onPress={surAppui} />);

    const bouton = screen.getByRole("button", { name: "Envoyer" });
    expect(bouton).toBeBusy();
    expect(bouton).toBeDisabled();
    fireEvent.press(bouton);
    expect(surAppui).not.toHaveBeenCalled();
  });

  it("en cours, affiche le libellé d'attente à la place du libellé", () => {
    render(<BoutonAction libelle="Envoyer" enCours libelleEnCours="Envoi…" />);

    expect(screen.getByText("Envoi…")).toBeTruthy();
    expect(screen.queryByText("Envoyer")).toBeNull();
  });

  it("annonce le libellé d’attente affiché pendant l’envoi", () => {
    render(<BoutonAction libelle="Envoyer" enCours libelleEnCours="Envoi…" />);
    expect(screen.getByLabelText("Envoi…")).toBeBusy();
    expect(screen.queryByLabelText("Envoyer")).toBeNull();
  });

  it("en cours sans libellé d'attente, garde son libellé affiché", () => {
    render(<BoutonAction libelle="Envoyer" enCours />);

    expect(screen.getByText("Envoyer")).toBeTruthy();
  });

  it("affiche l'icône de fin après le libellé", () => {
    render(<BoutonAction libelle="Continuer" iconeFin={<Texte>→</Texte>} />);

    expect(screen.getByText("→")).toBeTruthy();
  });

  it("efface l'icône de fin pendant l'attente", () => {
    render(<BoutonAction libelle="Continuer" enCours iconeFin={<Texte>→</Texte>} />);

    expect(screen.queryByText("→")).toBeNull();
  });

  it("affiche l'icône de début, remplacée par l'indicateur pendant l'attente", () => {
    const { rerender } = render(
      <BoutonAction libelle="Continuer avec Google" icone={<Texte>G</Texte>} />,
    );
    expect(screen.getByText("G")).toBeTruthy();

    rerender(
      <BoutonAction libelle="Continuer avec Google" enCours icone={<Texte>G</Texte>} />,
    );
    expect(screen.queryByText("G")).toBeNull();
  });

  it("laisse l'écran préciser un indice d'accessibilité", () => {
    render(
      <BoutonAction libelle="Payer" accessibilityHint="Débite 42 € sur votre carte" />,
    );

    expect(screen.getByRole("button", { name: "Payer" }).props.accessibilityHint).toBe(
      "Débite 42 € sur votre carte",
    );
  });
});
