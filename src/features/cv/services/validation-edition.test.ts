/**
 * Les règles de validation des formulaires du CV (`validation-edition.ts`).
 *
 * Ce qu'elles protègent : on ne bloque que l'incohérent, on ne reproche un
 * manque qu'à la tentative, et chaque message dit quoi faire.
 */

import { describe, expect, it } from "@jest/globals";

import type { Contact, Experience, Formation } from "../types/cv.types";
import {
  emailValide,
  estBloque,
  messagesDe,
  telephoneValide,
  urlValide,
  validerElement,
  validerSection,
} from "./validation-edition";

/** Un mois d'octobre 2026, pour que « futur » et « passé » ne bougent pas. */
const AUJOURDHUI = new Date(2026, 9, 15);

const experience: Experience = {
  poste: "Vendeuse",
  entreprise: "Zara",
  lieu: null,
  debut: "2022-09",
  fin: "2024-06",
  enCours: false,
  missions: ["Conseiller"],
};

const formation: Formation = {
  diplome: "BTS MCO",
  ecole: "Lycée Voillaume",
  lieu: null,
  debut: "2020-09",
  fin: "2022-06",
  enCours: false,
};

const contact: Contact = {
  email: "awa@example.com",
  telephone: null,
  ville: null,
  liens: [],
};

describe("Les formats", () => {
  it("reconnaissent un e-mail", () => {
    expect(emailValide("awa@example.com")).toBe(true);
    expect(emailValide("awa@example")).toBe(false);
    expect(emailValide("awa example.com")).toBe(false);
  });

  it("reconnaissent un téléphone français ou international", () => {
    expect(telephoneValide("06 12 34 56 78")).toBe(true);
    expect(telephoneValide("+33 6 12 34 56 78")).toBe(true);
    expect(telephoneValide("06.12.34.56.78")).toBe(true);
    expect(telephoneValide("12345")).toBe(false);
    expect(telephoneValide("06 12 AB")).toBe(false);
  });

  it("acceptent un lien sans schéma, refusent un schéma qui n'est pas http(s)", () => {
    expect(urlValide("linkedin.com/in/awa-diallo")).toBe(true);
    expect(urlValide("https://awa.fr/cv")).toBe(true);
    expect(urlValide("javascript:alert(1)")).toBe(false);
    expect(urlValide("mailto:awa@example.com")).toBe(false);
    expect(urlValide("pas un lien")).toBe(false);
  });
});

describe("Une expérience", () => {
  it("valide quand tout est cohérent", () => {
    expect(validerExperienceDe(experience)).toEqual([]);
  });

  it("réclame le poste et l'entreprise, sans bloquer", () => {
    const erreurs = validerExperienceDe({ ...experience, poste: " ", entreprise: "" });
    expect(erreurs.map((e) => e.champ)).toEqual(["poste", "entreprise"]);
    expect(erreurs.every((e) => e.nature === "requis")).toBe(true);
    expect(estBloque(erreurs)).toBe(false);
  });

  it("refuse une fin avant le début", () => {
    const erreurs = validerExperienceDe({
      ...experience,
      debut: "2024-06",
      fin: "2022-09",
    });
    expect(erreurs).toEqual([
      { champ: "fin", message: "La fin est avant le début.", nature: "incoherent" },
    ]);
    expect(estBloque(erreurs)).toBe(true);
  });

  it("tolère une année seule au début et un mois à la fin de la même année", () => {
    expect(validerExperienceDe({ ...experience, debut: "2022", fin: "2022-03" })).toEqual(
      [],
    );
  });

  it("refuse une fin dans le futur sauf en cours", () => {
    expect(validerExperienceDe({ ...experience, fin: "2027-01" })[0]?.message).toMatch(
      /futur.*J'y travaille encore/,
    );
    expect(validerExperienceDe({ ...experience, fin: "2027-01", enCours: true })).toEqual(
      [],
    );
    expect(validerExperienceDe({ ...experience, fin: "2026-10" })).toEqual([]);
  });

  it("refuse un début dans le futur ou trop ancien", () => {
    expect(
      validerExperienceDe({ ...experience, debut: "2027", fin: null })[0]?.champ,
    ).toBe("debut");
    expect(validerExperienceDe({ ...experience, debut: "1932-01" })[0]?.message).toMatch(
      /ancienne/,
    );
  });

  it("borne les missions en nombre et en longueur", () => {
    expect(
      validerExperienceDe({
        ...experience,
        missions: Array.from({ length: 16 }, () => "m"),
      })[0]?.message,
    ).toMatch(/15 missions/);
    expect(
      validerExperienceDe({ ...experience, missions: ["x".repeat(301)] })[0]?.message,
    ).toMatch(/300/);
  });
});

describe("Une formation", () => {
  it("parle d'obtention quand la fin est dans le futur", () => {
    const erreurs = validerElement(
      "educations",
      { ...formation, fin: "2028-06" },
      AUJOURDHUI,
    );
    expect(erreurs[0]?.message).toMatch(/obtention.*Formation en cours/);
    expect(
      validerElement(
        "educations",
        { ...formation, fin: "2028-06", enCours: true },
        AUJOURDHUI,
      ),
    ).toEqual([]);
  });

  it("réclame le diplôme et l'établissement", () => {
    expect(
      validerElement(
        "educations",
        { ...formation, diplome: "", ecole: "" },
        AUJOURDHUI,
      ).map((e) => e.champ),
    ).toEqual(["diplome", "ecole"]);
  });
});

describe("Les coordonnées", () => {
  it("exigent un canal, sans bloquer", () => {
    const erreurs = validerSection(
      { section: "contact", valeur: { ...contact, email: null } },
      AUJOURDHUI,
    );
    expect(erreurs).toHaveLength(1);
    expect(erreurs[0]?.champ).toBe("telephone");
    expect(estBloque(erreurs)).toBe(false);
  });

  it("bloquent sur un e-mail ou un téléphone mal formé", () => {
    const erreurs = validerSection(
      { section: "contact", valeur: { ...contact, email: "awa@", telephone: "12" } },
      AUJOURDHUI,
    );
    expect(erreurs.map((e) => e.champ)).toEqual(["email", "telephone"]);
    expect(estBloque(erreurs)).toBe(true);
  });

  it("vérifient chaque lien, ligne par ligne, et ignorent une ligne vide", () => {
    const erreurs = validerSection(
      {
        section: "contact",
        valeur: {
          ...contact,
          liens: [
            { libelle: "", url: "" },
            { libelle: "", url: "linkedin.com/in/awa" },
            { libelle: "Portfolio", url: "javascript:1" },
          ],
        },
      },
      AUJOURDHUI,
    );
    expect(erreurs.map((e) => [e.champ, e.nature])).toEqual([
      ["liens.1.libelle", "requis"],
      ["liens.2.url", "incoherent"],
    ]);
  });
});

describe("L'identité et l'à-propos", () => {
  it("réclament prénom et nom", () => {
    const erreurs = validerSection(
      { section: "identity", valeur: { prenom: "", nom: " ", titre: null } },
      AUJOURDHUI,
    );
    expect(messagesDe(erreurs, { avecRequis: true })).toEqual({
      prenom: "Ton prénom est nécessaire.",
      nom: "Ton nom est nécessaire.",
    });
    expect(messagesDe(erreurs, { avecRequis: false })).toEqual({});
  });

  it("bornent la présentation", () => {
    const erreurs = validerSection(
      { section: "summary", valeur: { texte: "x".repeat(1501) } },
      AUJOURDHUI,
    );
    expect(erreurs[0]?.champ).toBe("texte");
    expect(estBloque(erreurs)).toBe(true);
  });

  it("ne jugent pas une liste : chaque élément l'est dans sa feuille", () => {
    expect(
      validerSection(
        { section: "experiences", valeur: [{ ...experience, fin: "1800" }] },
        AUJOURDHUI,
      ),
    ).toEqual([]);
  });
});

describe("Ce qu'on montre", () => {
  it("garde le premier message d'un champ", () => {
    const messages = messagesDe(
      [
        { champ: "fin", message: "Premier.", nature: "incoherent" },
        { champ: "fin", message: "Second.", nature: "incoherent" },
      ],
      { avecRequis: false },
    );
    expect(messages).toEqual({ fin: "Premier." });
  });
});

function validerExperienceDe(e: Experience) {
  return validerElement("experiences", e, AUJOURDHUI);
}
