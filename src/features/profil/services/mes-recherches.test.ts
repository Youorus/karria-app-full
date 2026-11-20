/**
 * Les phrases de « Mes recherches » (`mes-recherches.ts`) : ce qui se lit
 * sous une recherche, ce que la suppression annonce, le pied de liste.
 */

import { describe, expect, it } from "@jest/globals";

import type { RechercheEnregistree } from "@/features/assistant/types/recherches-enregistrees.types";

import {
  detailDeRecherche,
  libelleDesAlertes,
  parDerniereUtilisation,
  phraseDeSuppression,
  piedDeListe,
  TEXTES_MES_RECHERCHES,
} from "./mes-recherches";

const MAINTENANT = new Date(2026, 10, 20, 12, 0, 0);

describe("Les phrases de « Mes recherches »", () => {
  it("porte le nom de rubrique que Karria cite en conversation", () => {
    expect(TEXTES_MES_RECHERCHES.titre).toBe("Mes recherches");
  });

  it("dit « Recherche en cours », sinon la dernière utilisation", () => {
    expect(
      detailDeRecherche({ enCours: true, utiliseeLe: "2026-11-01T10:00:00" }, MAINTENANT),
    ).toBe("Recherche en cours");
    expect(
      detailDeRecherche(
        { enCours: false, utiliseeLe: new Date(2026, 10, 20, 8).toISOString() },
        MAINTENANT,
      ),
    ).toBe("Utilisée aujourd'hui");
    expect(
      detailDeRecherche(
        { enCours: false, utiliseeLe: new Date(2026, 10, 19, 8).toISOString() },
        MAINTENANT,
      ),
    ).toBe("Utilisée hier");
    expect(
      detailDeRecherche(
        { enCours: false, utiliseeLe: new Date(2026, 10, 3, 8).toISOString() },
        MAINTENANT,
      ),
    ).toBe("Utilisée le 3 nov.");
    expect(detailDeRecherche({ enCours: false, utiliseeLe: "?" }, MAINTENANT)).toBeNull();
  });

  it("prévient que le fil change quand on supprime la recherche en cours", () => {
    expect(phraseDeSuppression({ enCours: false })).toBe(
      "Karria ne la surveillera plus.",
    );
    expect(phraseDeSuppression({ enCours: true })).toBe(
      "Karria ne la surveillera plus. Ton fil redeviendra toutes les offres.",
    );
  });

  it("nomme l'interrupteur et dit le plafond du serveur", () => {
    expect(libelleDesAlertes({ resume: "Serveur · Paris (30 km) · CDI" })).toBe(
      "Alertes pour Serveur · Paris (30 km) · CDI",
    );
    expect(piedDeListe(10)).toBe(
      "Jusqu'à 10 recherches ; au-delà, la plus ancienne est remplacée.",
    );
  });

  it("range de la plus récemment utilisée à la plus ancienne", () => {
    const r = (id: string, utiliseeLe: string) =>
      ({ id, utiliseeLe }) as RechercheEnregistree;
    expect(
      parDerniereUtilisation([
        r("a", "2026-11-01T10:00:00Z"),
        r("b", "2026-11-20T10:00:00Z"),
        r("c", "2026-11-10T10:00:00Z"),
      ]).map((x) => x.id),
    ).toEqual(["b", "c", "a"]);
  });
});
