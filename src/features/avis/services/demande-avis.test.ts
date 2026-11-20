/**
 * La demande d'avis (`demande-avis.ts`) : elle ne part qu'après un succès,
 * au bout du délai, quand tout s'y prête — et aucun échec ne remonte.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AppState, Linking } from "react-native";

import { poserVersionConnue } from "@/features/demarrage/services/etat-version";
import { ErreurApi } from "@/lib/http";
import { noterSollicitation, oublierLesSollicitations } from "@/lib/sollicitations";

import {
  noterKarria,
  noterSucces,
  ouvrirSessionAvis,
  proposerAvis,
  quitterSessionAvis,
  redemarrerAvisPourTest,
  succesPuisAvis,
} from "./demande-avis";
import {
  DELAI_DEMANDE_MS,
  PAUSE_DE_SESSION_MS,
  UN_JOUR_MS,
  type EtatAvis,
} from "./regles-avis";

const mockDisponible = jest.fn<() => Promise<boolean>>();
const mockDemander = jest.fn<() => Promise<void>>();
jest.mock("expo-store-review", () => ({
  isAvailableAsync: () => mockDisponible(),
  requestReview: () => mockDemander(),
}));

jest.mock("@/lib/version", () => ({ VERSION: "1.2.0" }));

const mockMagasin = new Map<string, unknown>();
jest.mock("@/lib/magasin-local", () => ({
  lireLocal: async (cle: string, parDefaut: unknown, valider: (v: unknown) => boolean) =>
    mockMagasin.has(cle) && valider(mockMagasin.get(cle))
      ? mockMagasin.get(cle)
      : parDefaut,
  ecrireLocal: async (cle: string, valeur: unknown) => {
    mockMagasin.set(cle, valeur);
  },
}));

/** Le témoin que la demande d'avis pose sur le client HTTP. */
let mockTemoin: ((erreur: ErreurApi) => void) | null = null;
jest.mock("@/lib/http", () => ({
  ...jest.requireActual<Record<string, unknown>>("@/lib/http"),
  auMomentDUneErreur: (rappel: ((erreur: ErreurApi) => void) | null) => {
    mockTemoin = rappel;
  },
}));

const CLE = "karria.avis";
const DEBUT = new Date(2026, 10, 20, 15, 0, 0).getTime();

function retenu(): EtatAvis {
  return mockMagasin.get(CLE) as EtatAvis;
}

async function laisserFaire() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

/** Laisse le succès s'écrire (la minuterie s'arme après), puis avance l'horloge. */
async function avancer(ms: number) {
  await laisserFaire();
  jest.advanceTimersByTime(ms);
  await laisserFaire();
}

/** Trois sessions sur deux jours, puis la session du jour ouverte. */
async function habituer() {
  mockMagasin.set(CLE, {
    sessions: 2,
    jours: ["2026-11-18", "2026-11-19"],
    succes: 1,
    offresGardees: 0,
    demandes: [],
    versionDemandee: null,
  } satisfies EtatAvis);
  await ouvrirSessionAvis();
}

describe("La demande d'avis", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(DEBUT);
    mockMagasin.clear();
    mockTemoin = null;
    redemarrerAvisPourTest();
    oublierLesSollicitations();
    poserVersionConnue(null);
    mockDisponible.mockReset();
    mockDisponible.mockResolvedValue(true);
    mockDemander.mockReset();
    mockDemander.mockResolvedValue(undefined);
    Object.defineProperty(AppState, "currentState", {
      value: "active",
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("après un succès, attend le délai puis appelle l'invite du système", async () => {
    await habituer();
    succesPuisAvis("export");
    await laisserFaire();
    expect(retenu().succes).toBe(2);
    // Rien avant le délai : la feuille de partage finit de se fermer.
    await avancer(DELAI_DEMANDE_MS - 1);
    expect(mockDemander).not.toHaveBeenCalled();
    await avancer(1);
    expect(mockDisponible).toHaveBeenCalledTimes(1);
    expect(mockDemander).toHaveBeenCalledTimes(1);
    // La demande est retenue : version, et date.
    expect(retenu().versionDemandee).toBe("1.2.0");
    expect(retenu().demandes).toEqual([DEBUT + DELAI_DEMANDE_MS]);
  });

  it("jamais sans succès : `proposerAvis` seul ne demande rien", async () => {
    await habituer();
    proposerAvis();
    await avancer(DELAI_DEMANDE_MS);
    expect(mockDisponible).not.toHaveBeenCalled();
    expect(mockDemander).not.toHaveBeenCalled();
  });

  it("un succès noté attend que la feuille soit fermée pour proposer", async () => {
    await habituer();
    await noterSucces("envoi");
    await avancer(10_000);
    // « As-tu candidaté ? » est encore ouverte : rien.
    expect(mockDemander).not.toHaveBeenCalled();
    proposerAvis();
    proposerAvis();
    await avancer(DELAI_DEMANDE_MS);
    expect(mockDemander).toHaveBeenCalledTimes(1);
  });

  it("une seule demande par version, même après d'autres succès", async () => {
    await habituer();
    succesPuisAvis("export");
    await avancer(DELAI_DEMANDE_MS);
    expect(mockDemander).toHaveBeenCalledTimes(1);
    succesPuisAvis("candidature");
    await avancer(DELAI_DEMANDE_MS);
    expect(mockDemander).toHaveBeenCalledTimes(1);
  });

  it("pas à la première session, ni sans assez de succès", async () => {
    await ouvrirSessionAvis();
    succesPuisAvis("export");
    await avancer(DELAI_DEMANDE_MS);
    succesPuisAvis("import");
    await avancer(DELAI_DEMANDE_MS);
    expect(retenu()).toMatchObject({ sessions: 1, succes: 2 });
    expect(mockDemander).not.toHaveBeenCalled();
  });

  it("la première offre gardée ne déclenche rien ; la deuxième, oui", async () => {
    await habituer();
    succesPuisAvis("offre");
    await avancer(DELAI_DEMANDE_MS);
    expect(retenu()).toMatchObject({ offresGardees: 1, succes: 1 });
    expect(mockDisponible).not.toHaveBeenCalled();
    succesPuisAvis("offre");
    await avancer(DELAI_DEMANDE_MS);
    expect(retenu()).toMatchObject({ offresGardees: 2, succes: 2 });
    expect(mockDemander).toHaveBeenCalledTimes(1);
  });

  describe("ce qui retient la demande", () => {
    it("une erreur d'API ou un quota 429 dans la session", async () => {
      await habituer();
      expect(mockTemoin).not.toBeNull();
      mockTemoin?.(new ErreurApi("Limite atteinte", 429, "portrait_quota_exceeded"));
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
    });

    it("mais pas un 404 ni l'accord IA demandé, qui sont le fonctionnement normal", async () => {
      await habituer();
      mockTemoin?.(new ErreurApi("Pas de brouillon", 404));
      mockTemoin?.(new ErreurApi("Accord requis", 403, "ai_consent_required"));
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).toHaveBeenCalledTimes(1);
    });

    it("l'erreur ne vaut que pour sa session : la suivante repart propre", async () => {
      await habituer();
      mockTemoin?.(new ErreurApi("Panne", 500));
      quitterSessionAvis();
      jest.setSystemTime(DEBUT + PAUSE_DE_SESSION_MS);
      await ouvrirSessionAvis();
      expect(retenu().sessions).toBe(4);
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).toHaveBeenCalledTimes(1);
    });

    it("l'écran de mise à jour bloquant", async () => {
      await habituer();
      poserVersionConnue({
        etat: "requise",
        derniereBuild: 12,
        buildMinimale: 12,
        derniereVersion: "1.3.0",
        urlStore: null,
      });
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
    });

    it("le consentement publicitaire montré ce lancement-ci", async () => {
      await habituer();
      noterSollicitation("consentement-pub");
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
    });

    it("la feuille de filigrane, juste avant : une seule sollicitation à la fois", async () => {
      await habituer();
      noterSollicitation("proposition-abonnement");
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
      // Rien n'a été consommé : ni la version, ni une date.
      expect(retenu().versionDemandee).toBeNull();
    });

    it("l'app en arrière-plan (feuille de partage, autre app)", async () => {
      await habituer();
      Object.defineProperty(AppState, "currentState", {
        value: "background",
        configurable: true,
      });
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDisponible).not.toHaveBeenCalled();
    });

    it("une demande de moins de soixante jours, sur une autre version", async () => {
      mockMagasin.set(CLE, {
        sessions: 8,
        jours: ["2026-11-18", "2026-11-19"],
        succes: 5,
        offresGardees: 0,
        demandes: [DEBUT - 30 * UN_JOUR_MS],
        versionDemandee: "1.1.0",
      } satisfies EtatAvis);
      await ouvrirSessionAvis();
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
    });
  });

  describe("les sessions", () => {
    it("un retour rapide au premier plan n'en compte pas une de plus", async () => {
      await ouvrirSessionAvis();
      await ouvrirSessionAvis();
      quitterSessionAvis();
      jest.setSystemTime(DEBUT + 60_000);
      await ouvrirSessionAvis();
      expect(retenu().sessions).toBe(1);
    });

    it("après une vraie pause, oui — et un autre jour compte comme un autre jour", async () => {
      await ouvrirSessionAvis();
      quitterSessionAvis();
      jest.setSystemTime(DEBUT + UN_JOUR_MS);
      await ouvrirSessionAvis();
      expect(retenu().sessions).toBe(2);
      expect(retenu().jours).toHaveLength(2);
    });
  });

  describe("aucun échec ne remonte", () => {
    it("invite indisponible : rien n'est appelé, rien n'est consommé", async () => {
      await habituer();
      mockDisponible.mockResolvedValue(false);
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
      expect(retenu().versionDemandee).toBeNull();
    });

    it("le système refuse ou le module manque : avalé, journalisé", async () => {
      await habituer();
      mockDemander.mockRejectedValue(new Error("module natif absent"));
      succesPuisAvis("export");
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        "[karria] demande d'avis impossible",
        expect.any(Error),
      );
      // La tentative compte : on n'insiste pas.
      expect(retenu().versionDemandee).toBe("1.2.0");
    });

    it("`isAvailableAsync` qui lève n'atteint pas l'appelant", async () => {
      await habituer();
      mockDisponible.mockRejectedValue(new Error("pont natif"));
      expect(() => succesPuisAvis("export")).not.toThrow();
      await avancer(DELAI_DEMANDE_MS);
      expect(mockDemander).not.toHaveBeenCalled();
    });
  });

  describe("« Noter Karria », à la demande", () => {
    it("ouvre la fiche du magasin", async () => {
      const ouvrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
      expect(await noterKarria()).toBe(true);
      expect(ouvrir).toHaveBeenCalledWith(
        "https://apps.apple.com/app/id6776608930?action=write-review",
      );
      // Ce lien n'est pas l'invite du système.
      expect(mockDemander).not.toHaveBeenCalled();
    });

    it("rend faux, sans lever, si rien ne s'ouvre", async () => {
      jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("aucune app"));
      expect(await noterKarria()).toBe(false);
    });
  });
});
