/**
 * Le champ de saisie partagé, `ChampTexte`.
 *
 * Tous les tests d'écran trouvent leurs champs par `getByLabelText(libellé)`
 * et leurs erreurs par leur texte. Ce fichier prouve le contrat qu'ils
 * supposent, une fois pour toutes.
 *
 * Ce que ces tests protègent, dans l'ordre d'importance :
 *
 * 1. **le libellé visible est aussi le libellé accessible** — c'est lui
 *    que VoiceOver annonce, et lui que les tests d'écran cherchent ;
 * 2. **une erreur s'annonce comme une alerte**, sous le champ, et prend la
 *    place de l'aide : deux lignes sous un champ en faute font hésiter ;
 * 3. **un champ non modifiable le dit** au lecteur d'écran ;
 * 4. la frappe remonte telle quelle à l'appelant.
 */

import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ChampTexte } from "./champ-texte";

describe("ChampTexte", () => {
  it("porte son libellé visible comme libellé accessible", () => {
    render(<ChampTexte libelle="Prénom" />);

    expect(screen.getByText("Prénom")).toBeTruthy();
    expect(screen.getByLabelText("Prénom")).toBeTruthy();
  });

  it("accepte un libellé vide, pour un champ déjà annoncé par le titre de l'écran", () => {
    render(<ChampTexte libelle="" placeholder="Votre message" />);

    // Le libellé accessible est alors vide lui aussi : c'est à l'appelant
    // d'en passer un (voir le dernier test).
    expect(screen.getByPlaceholderText("Votre message").props.accessibilityLabel).toBe(
      "",
    );
  });

  it("affiche le texte d'exemple passé en placeholder", () => {
    render(<ChampTexte libelle="Nom" placeholder="Diallo" />);

    expect(screen.getByPlaceholderText("Diallo")).toBeTruthy();
  });

  it("remonte chaque frappe à l'appelant", () => {
    const surFrappe = jest.fn();
    render(<ChampTexte libelle="Nom" onChangeText={surFrappe} />);

    fireEvent.changeText(screen.getByLabelText("Nom"), "Diallo");

    expect(surFrappe).toHaveBeenCalledWith("Diallo");
  });

  it("affiche l'erreur sous le champ avec le rôle alert", () => {
    render(<ChampTexte libelle="Prénom" erreur="Indiquez votre prénom." />);

    const alerte = screen.getByRole("alert");
    expect(alerte).toHaveTextContent("Indiquez votre prénom.");
  });

  it("affiche l'aide quand tout va bien, sans rôle alert", () => {
    render(<ChampTexte libelle="Prénom" aide="Tel qu'il figure sur la pièce." />);

    expect(screen.getByText("Tel qu'il figure sur la pièce.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("remplace l'aide par l'erreur quand les deux sont fournies", () => {
    render(
      <ChampTexte
        libelle="Prénom"
        aide="Tel qu'il figure sur la pièce."
        erreur="Indiquez votre prénom."
      />,
    );

    expect(screen.getByText("Indiquez votre prénom.")).toBeTruthy();
    expect(screen.queryByText("Tel qu'il figure sur la pièce.")).toBeNull();
  });

  it("annonce un champ non modifiable comme désactivé", () => {
    render(<ChampTexte libelle="Courriel" editable={false} value="awa@exemple.fr" />);

    const champ = screen.getByLabelText("Courriel");
    expect(champ).toBeDisabled();
    expect(champ.props.editable).toBe(false);
  });

  it("annonce un champ modifiable comme actif", () => {
    render(<ChampTexte libelle="Courriel" />);

    expect(screen.getByLabelText("Courriel")).not.toBeDisabled();
  });

  it("laisse l'appelant remplacer le libellé accessible", () => {
    render(<ChampTexte libelle="" accessibilityLabel="Message au voyageur" />);

    expect(screen.getByLabelText("Message au voyageur")).toBeTruthy();
  });
});
