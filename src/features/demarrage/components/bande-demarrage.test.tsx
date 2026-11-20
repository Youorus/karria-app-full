/**
 * La bande d'information (`bande-demarrage.tsx`) : invisible à la demande,
 * une action, une croix.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { BandeDemarrage } from "./bande-demarrage";

describe("La bande du démarrage", () => {
  const props = {
    phrase: "Une amélioration est prête.",
    libelleAction: "Relancer",
    onAction: jest.fn(),
    onFermer: jest.fn(),
  };

  it("ne rend rien quand elle n'est pas visible", () => {
    render(<BandeDemarrage visible={false} {...props} />);
    expect(screen.queryByText("Une amélioration est prête.")).toBeNull();
  });

  it("montre la phrase, l'action et la croix", () => {
    render(<BandeDemarrage visible {...props} />);
    expect(screen.getByText("Une amélioration est prête.")).toBeTruthy();
    fireEvent.press(screen.getByRole("button", { name: "Relancer" }));
    expect(props.onAction).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByRole("button", { name: "Fermer" }));
    expect(props.onFermer).toHaveBeenCalledTimes(1);
  });

  it("porte le rôle d'alerte sur sa phrase, pour les lecteurs d'écran", () => {
    render(<BandeDemarrage visible {...props} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Une amélioration est prête.");
  });

  it("sans action ni croix, ne montre que la phrase", () => {
    render(<BandeDemarrage visible phrase="Connexion rétablie" icone="cocheCercle" />);
    expect(screen.getByText("Connexion rétablie")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("sans action mais avec croix, la croix porte le libellé demandé", () => {
    const onFermer = jest.fn();
    render(
      <BandeDemarrage
        visible
        phrase="Pas de connexion."
        onFermer={onFermer}
        libelleFermer="Masquer"
      />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
    fireEvent.press(screen.getByRole("button", { name: "Masquer" }));
    expect(onFermer).toHaveBeenCalledTimes(1);
  });
});
