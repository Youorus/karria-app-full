/**
 * La saisie du code à six chiffres, `ChampCode` (plan de recette : ACC02).
 *
 * Un seul champ invisible, six cases dessinées par-dessus. Le collage
 * d'un code copié et la suggestion du système au-dessus du clavier
 * passent par ce champ unique ; les cases ne font qu'afficher.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *
 * 1. **ne remontent que des chiffres, six au plus** — un code collé avec
 *    une espace ou un texte d'e-mail autour se réduit au code ;
 * 2. **chaque case montre son chiffre, et un tiret si elle est vide** ;
 * 3. **le conteneur dit ce qu'on attend et ce qui est saisi** au lecteur
 *    d'écran : « Code de vérification à 6 chiffres », valeur « 1 2 3 » ;
 * 4. toucher les cases donne le focus au champ réel ; `editable` lui est
 *    transmis.
 *
 * ═══ Deux éléments portent le même libellé ═══
 *
 * Le conteneur et, depuis A26, le champ réel. `getByLabelText` en trouve
 * donc deux : `conteneur()` et `champReel()` les départagent par leur
 * type natif. Sur iOS, le conteneur accessible absorbe encore le champ
 * (voir A03) — ce test ne le prouve pas, c'est la session humaine.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { ChampCode } from "./champ-code";

const LIBELLE_CONTENEUR = "Code de vérification à 6 chiffres";

function rendre(valeur = "", options: { editable?: boolean } = {}) {
  const surChangement = jest.fn<(code: string) => void>();
  render(
    <ChampCode valeur={valeur} onChange={surChangement} editable={options.editable} />,
  );
  return surChangement;
}

/** Le champ réel, invisible : le seul `TextInput` de l'arbre. */
function champReel() {
  return screen.UNSAFE_getByType(TextInput);
}

/** Le conteneur nommé : l'élément du libellé qui n'est pas le champ. */
function conteneur() {
  const trouve = screen
    .getAllByLabelText(LIBELLE_CONTENEUR)
    .find((element) => String(element.type) !== "TextInput");
  if (trouve === undefined) throw new Error("Aucun conteneur nommé.");
  return trouve;
}

describe("ChampCode — les six cases", () => {
  it("affiche six tirets quand rien n'est saisi", () => {
    rendre("");

    expect(screen.getAllByText("–")).toHaveLength(6);
  });

  it("affiche chaque chiffre saisi dans sa case, et un tiret dans les suivantes", () => {
    rendre("482");

    expect(screen.getByText("4")).toBeTruthy();
    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getAllByText("–")).toHaveLength(3);
  });

  it("n'affiche plus aucun tiret quand les six chiffres sont là", () => {
    rendre("482913");

    expect(screen.queryAllByText("–")).toHaveLength(0);
  });
});

describe("ChampCode — ce qui remonte", () => {
  it("remonte les chiffres tapés", () => {
    const surChangement = rendre();

    fireEvent.changeText(champReel(), "482");

    expect(surChangement).toHaveBeenCalledWith("482");
  });

  it("ne garde que les chiffres", () => {
    const surChangement = rendre();

    fireEvent.changeText(champReel(), "4a8-2 9");

    expect(surChangement).toHaveBeenCalledWith("4829");
  });

  it("coupe à six chiffres un code collé trop long", () => {
    const surChangement = rendre();

    fireEvent.changeText(champReel(), "4829137");

    expect(surChangement).toHaveBeenCalledWith("482913");
  });

  // Ce que ce test ne prouve pas : sur l'appareil, `maxLength={6}`
  // (`champ-code.tsx:99`) tronque le texte collé **avant** le filtre.
  // « 482 913 » collé deviendrait « 482 91 », puis « 48291 ». Le filtre
  // ne voit ici que ce que le test lui donne. À vérifier sur l'atelier.
  it("réduit au code le texte reçu, espaces et mots compris", () => {
    const surChangement = rendre();

    fireEvent.changeText(champReel(), "Votre code : 482 913");

    expect(surChangement).toHaveBeenCalledWith("482913");
  });

  it("limite nativement la saisie à six caractères, au pavé numérique", () => {
    rendre();

    expect(champReel().props.maxLength).toBe(6);
    expect(champReel().props.keyboardType).toBe("number-pad");
    expect(champReel().props.textContentType).toBe("oneTimeCode");
  });

  it("transmet `editable` au champ réel", () => {
    rendre("", { editable: false });

    expect(champReel().props.editable).toBe(false);
  });
});

describe("ChampCode — l'accessibilité", () => {
  it("nomme le conteneur « Code de vérification à 6 chiffres »", () => {
    rendre();

    expect(conteneur()).toBeTruthy();
  });

  it("annonce « vide » tant que rien n'est saisi", () => {
    rendre("");

    expect(conteneur()).toHaveAccessibilityValue({
      text: "vide",
    });
  });

  it("annonce les chiffres saisis un à un", () => {
    rendre("482");

    expect(conteneur()).toHaveAccessibilityValue({
      text: "4 8 2",
    });
  });

  it("donne le focus au champ réel quand on touche les cases", () => {
    const focus = jest.spyOn(TextInput.prototype, "focus");
    rendre();

    fireEvent.press(conteneur());

    expect(focus).toHaveBeenCalledTimes(1);
  });

  // A26 : le champ réel ne portait aucun libellé.
  it("nomme le champ réel, celui qui reçoit la saisie", () => {
    rendre();

    expect(champReel().props.accessibilityLabel).toBe(LIBELLE_CONTENEUR);
  });
});
