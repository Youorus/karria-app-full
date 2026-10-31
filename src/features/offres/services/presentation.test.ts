/**
 * Les règles d'affichage reprises de la V1.
 *
 * Elles sont éprouvées sur leurs paliers et sur les données sales de la
 * source : c'est là que la carte affiche un lieu vide ou un salaire à
 * trois montants.
 */

import { describe, expect, it } from "@jest/globals";

import {
  contratCourt,
  ilYa,
  initiales,
  libelleDistance,
  libelleExperience,
  libelleHoraires,
  libelleSource,
  libelleTeletravail,
  nettoyerDescription,
  messageDePartage,
  qualite,
  salaireLisible,
  teinteDeTuile,
} from "./presentation";

const MAINTENANT = new Date("2026-10-20T15:00:00Z");
const avant = (minutes: number) =>
  new Date(MAINTENANT.getTime() - minutes * 60_000).toISOString();

describe("Les initiales (règle V1)", () => {
  it("prend la première lettre des deux premiers mots, sinon les deux premières lettres", () => {
    expect(initiales("BNP Paribas")).toBe("BP");
    expect(initiales("Doctolib")).toBe("DO");
    expect(initiales("  ")).toBe("?");
    expect(initiales(null)).toBe("?");
  });
});

describe("La teinte de la tuile", () => {
  it("tourne de l'angle d'or : deux cartes voisines n'ont jamais la même couleur", () => {
    expect(teinteDeTuile(0)).toBe("hsl(0, 65%, 55%)");
    expect(teinteDeTuile(1)).not.toBe(teinteDeTuile(2));
  });
});

describe("Le salaire (formatSmartSalary)", () => {
  it("met en forme une fourchette mensuelle de France Travail", () => {
    expect(salaireLisible("Mensuel de 2048.00 Euros à 2730.00 Euros sur 12 mois")).toBe(
      "2 048 - 2 730€ / mois",
    );
  });

  it("reconnaît l'annuel et l'horaire, et rend null sans montant", () => {
    expect(salaireLisible("Annuel de 45000 Euros")).toBe("45 000€ / an");
    expect(salaireLisible("Horaire de 12.5 Euros")).toBe("13€ / h");
    expect(salaireLisible("Selon profil")).toBeNull();
  });
});

describe("Le temps écoulé (date-fns, fr)", () => {
  it("suit les paliers de formatDistanceToNow", () => {
    expect(ilYa(avant(0), MAINTENANT)).toBe("il y a moins d'une minute");
    expect(ilYa(avant(5), MAINTENANT)).toBe("il y a 5 minutes");
    expect(ilYa(avant(60), MAINTENANT)).toBe("il y a environ 1 heure");
    expect(ilYa(avant(180), MAINTENANT)).toBe("il y a environ 3 heures");
    expect(ilYa(avant(60 * 24 * 3), MAINTENANT)).toBe("il y a 3 jours");
    expect(ilYa("", MAINTENANT)).toBe("");
  });
});

describe("Les champs typés de l'API", () => {
  it("traduit le télétravail, les horaires, l'expérience et la source", () => {
    expect(libelleTeletravail("teletravail")).toBe("télétravail");
    expect(libelleTeletravail(null)).toBeNull();
    expect(libelleHoraires("temps_partiel")).toBe("temps partiel");
    expect(libelleExperience("confirme")).toBe("confirmé");
    expect(libelleSource("france_travail")).toBe("France Travail");
    expect(libelleSource("inconnue")).toBe("inconnue");
  });

  it("nettoie la description des filets et des sauts de ligne en trop", () => {
    expect(nettoyerDescription("**Missions**\n\n\n\n---\n- coder")).toBe(
      "**Missions**\n\n- coder",
    );
  });

  it("tire une teinte stable d'un identifiant UUID", () => {
    const id = "0f1e2d3c-0000-4000-8000-000000000001";
    expect(teinteDeTuile(id)).toBe(teinteDeTuile(id));
    expect(teinteDeTuile(id)).toMatch(/^hsl\(\d+(\.\d+)?, 65%, 55%\)$/);
  });
});

describe("La qualité et le partage", () => {
  it("traduit la qualité de l'API", () => {
    expect(qualite("high")).toBe("haute");
    expect(qualite("low")).toBe("basse");
    expect(qualite("excellent")).toBeNull();
  });

  it("compose le message de partage", () => {
    expect(
      messageDePartage({
        titre: "Data Engineer",
        entreprise: "BNP Paribas",
        ville: "Paris",
        lienCandidature: null,
      }),
    ).toBe("💼 Data Engineer chez BNP Paribas\n📍 Paris");
  });
});

describe("Le contrat abrégé", () => {
  it("abrège les libellés de France Travail", () => {
    expect(contratCourt("Contrat à durée indéterminée")).toBe("CDI");
    expect(contratCourt("Contrat à durée déterminée")).toBe("CDD");
    expect(contratCourt("Mission intérimaire")).toBe("Intérim");
    expect(contratCourt("Alternance / Apprentissage")).toBe("Alternance");
    expect(contratCourt("Contrat de professionnalisation")).toBe("Contrat pro");
    expect(contratCourt("Profession libérale")).toBe("Freelance");
  });

  it("reconnaît le CDI intérimaire avant l'intérim, et laisse l'inconnu tel quel", () => {
    expect(contratCourt("CDI intérimaire")).toBe("CDI intérimaire");
    expect(contratCourt("Contrat de chantier")).toBe("Contrat de chantier");
  });
});

describe("La distance (tri « Plus proches »)", () => {
  it("se lit au kilomètre, sans décimale", () => {
    expect(libelleDistance(12.4)).toBe("à 12 km");
    expect(libelleDistance(12.6)).toBe("à 13 km");
    expect(libelleDistance(1)).toBe("à 1 km");
  });

  it("dit « moins d'1 km » plutôt que « 0 km »", () => {
    expect(libelleDistance(0)).toBe("à moins d'1 km");
    expect(libelleDistance(0.4)).toBe("à moins d'1 km");
  });

  it("se tait sans distance connue", () => {
    expect(libelleDistance(null)).toBeNull();
    expect(libelleDistance(Number.NaN)).toBeNull();
  });
});
