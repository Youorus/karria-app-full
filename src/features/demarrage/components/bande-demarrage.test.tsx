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
});
