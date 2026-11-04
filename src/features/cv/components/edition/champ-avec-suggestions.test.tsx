/**
 * Le champ avec suggestions (`champ-avec-suggestions.tsx`) : la liste
 * apparaît sous le champ actif, un toucher remplit le champ et la referme,
 * et la saisie libre reste possible.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import type { TypeSuggestion } from "../../types/cv.types";
import { ChampAvecSuggestions } from "./champ-avec-suggestions";

const mockLire = jest.fn<(kind: TypeSuggestion, q: string) => Promise<string[]>>();

jest.mock("../../api/cv.api", () => ({
  lireSuggestions: (kind: TypeSuggestion, q: string) => mockLire(kind, q),
}));

function Harnais({ initiale = "" }: { initiale?: string }) {
  const [valeur, setValeur] = useState(initiale);
  return (
    <ChampAvecSuggestions
      kind="city"
      libelle="Ville"
      value={valeur}
      onChangeText={setValeur}
    />
  );
}

describe("ChampAvecSuggestions", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockLire.mockReset();
    mockLire.mockResolvedValue(["Paris", "Pau"]);
  });

  it("propose sous le champ actif, et un toucher remplit le champ puis referme", async () => {
    render(<Harnais />);
    const champ = screen.getByLabelText("Ville");
    fireEvent(champ, "focus");
    fireEvent.changeText(champ, "pa");
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(await screen.findByText("Paris")).toBeTruthy();
    expect(mockLire).toHaveBeenCalledWith("city", "pa");

    fireEvent.press(screen.getByLabelText("Paris"));
    expect(champ.props.value).toBe("Paris");
    expect(screen.queryByText("Pau")).toBeNull();
  });

  it("ne propose rien tant que le champ n'est pas actif, ni après l'avoir quitté", async () => {
    render(<Harnais />);
    const champ = screen.getByLabelText("Ville");
    fireEvent.changeText(champ, "pa");
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(mockLire).not.toHaveBeenCalled();
    expect(screen.queryByText("Paris")).toBeNull();

    fireEvent(champ, "focus");
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });
    expect(await screen.findByText("Paris")).toBeTruthy();

    fireEvent(champ, "blur");
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByText("Paris")).toBeNull();
  });

  it("laisse taper une valeur inconnue", async () => {
    mockLire.mockResolvedValue([]);
    render(<Harnais />);
    const champ = screen.getByLabelText("Ville");
    fireEvent(champ, "focus");
    fireEvent.changeText(champ, "Zzzville");
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(champ.props.value).toBe("Zzzville");
    expect(screen.queryByRole("list")).toBeNull();
  });
});
