/**
 * La frontière d'erreur (`frontiere-erreur.tsx`) : une erreur de rendu
 * ne laisse jamais un écran noir — elle se lit, et l'on repart.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { FrontiereErreur } from "./frontiere-erreur";

let casse = true;

function Enfant() {
  if (casse) throw new Error("Changing viewabilityConfigCallbackPairs on the fly");
  return <Text>Tout va bien</Text>;
}

describe("FrontiereErreur", () => {
  beforeEach(() => {
    casse = true;
    // React journalise lui-même l'erreur rattrapée : ce bruit n'est pas le sujet.
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  it("montre un titre, le message technique et un bouton pour repartir", () => {
    render(
      <FrontiereErreur>
        <Enfant />
      </FrontiereErreur>,
    );

    expect(screen.getByRole("header")).toHaveTextContent("Karria a trébuché.");
    expect(
      screen.getByText("Changing viewabilityConfigCallbackPairs on the fly"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reprendre" })).toBeTruthy();
  });

  it("remonte les enfants à « Reprendre »", () => {
    render(
      <FrontiereErreur>
        <Enfant />
      </FrontiereErreur>,
    );

    casse = false;
    fireEvent.press(screen.getByRole("button", { name: "Reprendre" }));

    expect(screen.getByText("Tout va bien")).toBeTruthy();
    expect(screen.queryByRole("header")).toBeNull();
  });

  it("laisse passer un enfant sain tel quel", () => {
    casse = false;
    render(
      <FrontiereErreur>
        <Enfant />
      </FrontiereErreur>,
    );
    expect(screen.getByText("Tout va bien")).toBeTruthy();
  });
});
