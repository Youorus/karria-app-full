/**
 * Les mots de l'espace Candidatures (`presentation.ts`) : dates courtes,
 * phrase d'état, tri, sous-titre, extrait.
 */

import { describe, expect, it } from "@jest/globals";

import {
  dateCourte,
  etatDuDossier,
  extrait,
  ligneDeGeneration,
  parDateDeGeneration,
  sousTitreDesDossiers,
} from "./presentation";
import type { CarteDossier } from "../types/candidatures.types";

const maintenant = new Date("2026-11-06T15:00:00");

function carte(partiel: Partial<CarteDossier>): CarteDossier {
  return {
    id: "d1",
    couleur: null,
    offre: {
      id: "o1",
      titre: "Vendeuse",
      entreprise: "Zara",
      logo: null,
      siteEntreprise: null,
      ville: "Paris",
      contrat: "CDI",
      lienCandidature: null,
      extrait: null,
      description: null,
      motsCles: [],
      publieeLe: null,
    },
    modeleId: null,
    statut: "pret",
    adaptation: "faite",
    couverture: 0.5,
    propositionsEnAttente: 0,
    aUneLettre: false,
    candidateLe: null,
    creeLe: "2026-11-03T10:00:00",
    modifieLe: "2026-11-03T10:00:00",
    ...partiel,
  };
}

describe("Les dates courtes", () => {
  it("disent aujourd'hui, hier, puis le jour et le mois", () => {
    expect(dateCourte("2026-11-06T09:00:00", maintenant)).toBe("aujourd'hui");
    expect(dateCourte("2026-11-05T23:00:00", maintenant)).toBe("hier");
    expect(dateCourte("2026-11-03T10:00:00", maintenant)).toBe("le 3 nov.");
    expect(dateCourte("2026-10-01T10:00:00", maintenant)).toBe("le 1er oct.");
  });

  it("ajoutent l'année quand ce n'est pas la nôtre, et rien pour une date illisible", () => {
    expect(dateCourte("2025-12-24T10:00:00", maintenant)).toBe("le 24 déc. 2025");
    expect(dateCourte("n'importe quoi", maintenant)).toBeNull();
    expect(dateCourte(null, maintenant)).toBeNull();
  });
});

describe("L'état d'un dossier", () => {
  it("dit candidaté avec sa date, avant tout le reste", () => {
    expect(
      etatDuDossier(
        {
          statut: "candidate",
          adaptation: "faite",
          propositionsEnAttente: 2,
          candidateLe: "2026-11-05T09:00:00",
        },
        maintenant,
      ),
    ).toEqual({ libelle: "Candidaté hier", ton: "fait" });
  });

  it("dit que Karria travaille, qu'il y a à relire, ou que c'est prêt", () => {
    expect(
      etatDuDossier(
        {
          statut: "brouillon",
          adaptation: "en_cours",
          propositionsEnAttente: 0,
          candidateLe: null,
        },
        maintenant,
      ),
    ).toEqual({ libelle: "Karria adapte ton CV…", ton: "attente" });
    expect(
      etatDuDossier(
        {
          statut: "brouillon",
          adaptation: "faite",
          propositionsEnAttente: 1,
          candidateLe: null,
        },
        maintenant,
      ).libelle,
    ).toBe("1 proposition à relire");
    expect(
      etatDuDossier(
        {
          statut: "brouillon",
          adaptation: "faite",
          propositionsEnAttente: 3,
          candidateLe: null,
        },
        maintenant,
      ).libelle,
    ).toBe("3 propositions à relire");
    expect(
      etatDuDossier(
        {
          statut: "pret",
          adaptation: "faite",
          propositionsEnAttente: 0,
          candidateLe: null,
        },
        maintenant,
      ),
    ).toEqual({ libelle: "Prêt à envoyer", ton: "pret" });
    expect(
      etatDuDossier(
        {
          statut: "brouillon",
          adaptation: "echouee",
          propositionsEnAttente: 0,
          candidateLe: null,
        },
        maintenant,
      ).ton,
    ).toBe("echec");
  });
});

describe("La liste", () => {
  it("trie du plus récemment généré au plus ancien", () => {
    const tries = parDateDeGeneration([
      carte({ id: "a", creeLe: "2026-11-01T10:00:00" }),
      carte({ id: "b", creeLe: "2026-11-05T10:00:00" }),
      carte({ id: "c", creeLe: "2026-11-03T10:00:00" }),
    ]);
    expect(tries.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("écrit la ligne de génération et le sous-titre", () => {
    expect(ligneDeGeneration(carte({}), maintenant)).toBe("Généré le 3 nov.");
    expect(sousTitreDesDossiers([])).toBe("Tes CV et lettres, offre par offre");
    expect(sousTitreDesDossiers([carte({})])).toBe("1 dossier");
    expect(
      sousTitreDesDossiers([
        carte({}),
        carte({ statut: "candidate" }),
        carte({ statut: "candidate" }),
      ]),
    ).toBe("3 dossiers, 2 candidatures");
  });

  it("coupe un extrait au mot", () => {
    expect(extrait("Un texte   court")).toBe("Un texte court");
    expect(extrait("Nous recherchons une conseillère de vente passionnée", 30)).toBe(
      "Nous recherchons une…",
    );
    expect(extrait("   ")).toBeNull();
    expect(extrait(null)).toBeNull();
  });
});
