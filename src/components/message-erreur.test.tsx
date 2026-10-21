/**
 * Le bandeau d'erreur partagé, `MessageErreur`.
 *
 * Les tests d'écran vérifient « une erreur du serveur s'affiche telle
 * quelle » en cherchant son texte, et « Réessayer » par son rôle. Ce
 * fichier prouve ce contrat.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *
 * 1. **le message s'annonce comme une alerte** — le lecteur d'écran le
 *    lit dès qu'il paraît, sans qu'on aille le chercher ;
 * 2. **l'action s'offre comme un bouton, sous son libellé**, et se
 *    déclenche à l'appui ;
 * 3. sans action ou sans libellé, aucun bouton muet n'apparaît.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { MessageErreur } from "./message-erreur";

const MESSAGE = "La connexion a été interrompue. Vérifiez votre réseau.";

describe("MessageErreur", () => {
  it("affiche le message avec le rôle alert", () => {
    render(<MessageErreur message={MESSAGE} />);

    expect(screen.getByRole("alert")).toHaveTextContent(MESSAGE);
  });

  it("offre l'action comme un bouton nommé par son libellé", () => {
    render(
      <MessageErreur message={MESSAGE} action={jest.fn()} libelleAction="Réessayer" />,
    );

    expect(screen.getByRole("button", { name: "Réessayer" })).toBeTruthy();
    expect(screen.getByText("Réessayer")).toBeTruthy();
  });

  it("déclenche l'action à l'appui", () => {
    const reessayer = jest.fn();
    render(
      <MessageErreur message={MESSAGE} action={reessayer} libelleAction="Réessayer" />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Réessayer" }));

    expect(reessayer).toHaveBeenCalledTimes(1);
  });

  it("n'affiche aucun bouton sans action", () => {
    render(<MessageErreur message={MESSAGE} libelleAction="Réessayer" />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByText("Réessayer")).toBeNull();
  });

  it("n'affiche aucun bouton muet quand l'action n'a pas de libellé", () => {
    render(<MessageErreur message={MESSAGE} action={jest.fn()} />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
