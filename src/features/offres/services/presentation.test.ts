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
  contratDeLOffre,
  descriptionDeLOffre,
  ilYa,
  initiales,
  lieuDeLOffre,
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

describe("Les replis sur la donnée source", () => {
  it("lit le lieu et le contrat de France Travail quand les champs normalisés manquent", () => {
    const brut = {
      lieuTravail: { libelle: "75 - PARIS 09" },
      typeContratLibelle: "Contrat à durée indéterminée",
    };
    expect(lieuDeLOffre(null, brut)).toBe("75 - PARIS 09");
    expect(contratDeLOffre(null, brut)).toBe("Contrat à durée indéterminée");
    expect(lieuDeLOffre("Paris", brut)).toBe("Paris");
  });

  it("nettoie la description du Markdown", () => {
    expect(
      descriptionDeLOffre(null, { description: "**Missions**\n\n\n\n- coder" }),
    ).toBe("Missions\n\n- coder");
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
