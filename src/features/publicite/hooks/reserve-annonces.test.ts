/**
 * La réserve d'annonces (`reserve-annonces.ts`), sur les trois défauts
 * corrigés avant la campagne du 2026-11-20 :
 *
 * - un abonné dont la dernière réponse connue est « sans pub » ne déclenche
 *   ni consentement ni SDK, même hors ligne ;
 * - une annonce retirée quitte les vues **avant** d'être détruite ;
 * - un emplacement resté sans annonce est redemandé plus tard, sans boucle.
 */

import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { poserSansPub, redemarrerSansPubPourTest } from "@/lib/sans-pub";

import {
  noterFinDeToucher,
  noterToucher,
  oublierLesTouchersPourLesTests,
} from "../services/calme-tactile";
import {
  abonner,
  annoncesPretes,
  delaiDeReprise,
  DELAI_DESTRUCTION_MS,
  demarrer,
  liberer,
  prechauffer,
  rafraichir,
} from "./reserve-annonces";

interface FausseAnnonce {
  destroy: jest.Mock;
  addAdEventListener: jest.Mock;
}

function fausseAnnonce(): FausseAnnonce {
  return { destroy: jest.fn(), addAdEventListener: jest.fn() };
}

const mockCharger = jest.fn<() => Promise<FausseAnnonce | null>>();
const mockDemarrer =
  jest.fn<() => Promise<{ peutDemander: boolean; personnalisees: boolean }>>();
jest.mock("../api/publicite.api", () => ({
  chargerAnnonce: () => mockCharger(),
  demarrerLaPublicite: () => mockDemarrer(),
}));
jest.mock("../services/journal-impressions", () => ({
  compterImpression: jest.fn(),
}));
jest.mock("react-native-google-mobile-ads", () => ({
  NativeAdEventType: { IMPRESSION: "impression" },
}));

const mockMagasin = new Map<string, unknown>();
jest.mock("@/lib/magasin-local", () => ({
  lireLocal: async (cle: string, parDefaut: unknown) =>
    mockMagasin.has(cle) ? mockMagasin.get(cle) : parDefaut,
  ecrireLocal: async (cle: string, valeur: unknown) => {
    mockMagasin.set(cle, valeur);
  },
}));

/** Laisse les promesses en cours se résoudre, sans avancer l'horloge. */
async function laisserFaire() {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
}

/** Avance l'horloge, puis laisse les promesses réveillées se résoudre. */
async function avancer(ms: number) {
  jest.advanceTimersByTime(ms);
  await laisserFaire();
}

describe("La réserve d'annonces", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    oublierLesTouchersPourLesTests();
    mockMagasin.clear();
    redemarrerSansPubPourTest();
    mockCharger.mockReset();
    mockDemarrer.mockReset();
    mockDemarrer.mockResolvedValue({ peutDemander: true, personnalisees: false });
  });

  afterEach(async () => {
    liberer();
    await avancer(DELAI_DESTRUCTION_MS);
    jest.useRealTimers();
  });

  describe("sans pub", () => {
    it("abonné au dernier lancement, hors ligne : ni consentement, ni SDK, ni requête", async () => {
      // La dernière réponse du serveur, retenue ; `GET /payments/me` n'aboutira pas.
      mockMagasin.set("karria.sans-pub", true);
      prechauffer([3, 9]);
      await laisserFaire();
      expect(mockDemarrer).not.toHaveBeenCalled();
      expect(mockCharger).not.toHaveBeenCalled();
      expect(annoncesPretes().size).toBe(0);
      expect(await demarrer()).toEqual({ peutDemander: false, personnalisees: false });
      expect(mockDemarrer).not.toHaveBeenCalled();
    });

    it("jamais abonné : le SDK démarre, après la relecture", async () => {
      mockCharger.mockResolvedValue(fausseAnnonce());
      prechauffer([3]);
      await laisserFaire();
      expect(mockDemarrer).toHaveBeenCalledTimes(1);
      expect(annoncesPretes().size).toBe(1);
    });

    it("une annonce qui arrive après le passage sans pub est détruite, jamais posée", async () => {
      let rendre: (a: FausseAnnonce) => void = () => {};
      mockCharger.mockReturnValue(
        new Promise<FausseAnnonce>((r) => {
          rendre = r;
        }),
      );
      prechauffer([3]);
      await laisserFaire();
      expect(mockCharger).toHaveBeenCalledTimes(1);

      poserSansPub(true);
      const tardive = fausseAnnonce();
      rendre(tardive);
      await laisserFaire();
      expect(tardive.destroy).toHaveBeenCalledTimes(1);
      expect(annoncesPretes().size).toBe(0);
    });
  });

  describe("retirer d'abord, détruire ensuite", () => {
    it("une annonce périmée quitte la réserve avant d'être détruite, même sous le doigt", async () => {
      const annonce = fausseAnnonce();
      mockCharger.mockResolvedValueOnce(annonce).mockResolvedValue(null);
      prechauffer([3]);
      await laisserFaire();
      expect(annoncesPretes().get(3)).toBe(annonce);

      const rappel = jest.fn(() => {
        // Au moment où les vues sont prévenues, l'objet vit encore.
        expect(annonce.destroy).not.toHaveBeenCalled();
        expect(annoncesPretes().has(3)).toBe(false);
      });
      const desabonner = abonner(rappel);
      // Un doigt est posé : une **apparition** attendrait le calme ; le retrait, non.
      noterToucher(Date.now());

      rafraichir(Date.now() + 51 * 60 * 1000);
      expect(rappel).toHaveBeenCalledTimes(1);
      expect(annonce.destroy).not.toHaveBeenCalled();

      await avancer(DELAI_DESTRUCTION_MS);
      expect(annonce.destroy).toHaveBeenCalledTimes(1);
      noterFinDeToucher(Date.now());
      desabonner();
    });

    it("une annonce encore fraîche n'est ni retirée ni détruite", async () => {
      const annonce = fausseAnnonce();
      mockCharger.mockResolvedValue(annonce);
      prechauffer([3]);
      await laisserFaire();
      rafraichir(Date.now() + 10 * 60 * 1000);
      await avancer(DELAI_DESTRUCTION_MS);
      expect(annonce.destroy).not.toHaveBeenCalled();
      expect(annoncesPretes().get(3)).toBe(annonce);
    });

    it("à la déconnexion, tout quitte les vues puis tout est détruit", async () => {
      const a = fausseAnnonce();
      const b = fausseAnnonce();
      mockCharger.mockResolvedValueOnce(a).mockResolvedValueOnce(b);
      prechauffer([3, 9]);
      await laisserFaire();
      await avancer(700);
      expect(annoncesPretes().size).toBe(2);

      const rappel = jest.fn(() => {
        expect(a.destroy).not.toHaveBeenCalled();
        expect(b.destroy).not.toHaveBeenCalled();
        expect(annoncesPretes().size).toBe(0);
      });
      const desabonner = abonner(rappel);
      liberer();
      expect(rappel).toHaveBeenCalledTimes(1);
      await avancer(DELAI_DESTRUCTION_MS);
      expect(a.destroy).toHaveBeenCalledTimes(1);
      expect(b.destroy).toHaveBeenCalledTimes(1);
      desabonner();
    });

    it("passer sans pub libère ce qui était prêt, dans le même ordre", async () => {
      const annonce = fausseAnnonce();
      mockCharger.mockResolvedValue(annonce);
      prechauffer([3]);
      await laisserFaire();
      poserSansPub(true);
      expect(annoncesPretes().size).toBe(0);
      expect(annonce.destroy).not.toHaveBeenCalled();
      await avancer(DELAI_DESTRUCTION_MS);
      expect(annonce.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe("sans annonce (« no fill »)", () => {
    it("attend une minute, puis deux : entre 60 et 120 secondes", () => {
      expect(delaiDeReprise(1)).toBe(60_000);
      expect(delaiDeReprise(2)).toBe(120_000);
      expect(delaiDeReprise(7)).toBe(120_000);
    });

    it("redemande l'emplacement après le délai, et le sert quand l'annonce vient", async () => {
      const annonce = fausseAnnonce();
      mockCharger.mockResolvedValueOnce(null).mockResolvedValueOnce(annonce);
      prechauffer([3]);
      await laisserFaire();
      expect(mockCharger).toHaveBeenCalledTimes(1);
      expect(annoncesPretes().size).toBe(0);

      // Redemander le même emplacement entre-temps ne relance rien.
      prechauffer([3]);
      await avancer(59_000);
      expect(mockCharger).toHaveBeenCalledTimes(1);

      await avancer(1_000);
      expect(mockCharger).toHaveBeenCalledTimes(2);
      expect(annoncesPretes().get(3)).toBe(annonce);
    });

    it("ne boucle pas : un essai par délai, et le délai s'allonge", async () => {
      mockCharger.mockResolvedValue(null);
      prechauffer([3]);
      await laisserFaire();
      expect(mockCharger).toHaveBeenCalledTimes(1);

      await avancer(60_000);
      expect(mockCharger).toHaveBeenCalledTimes(2);
      // Deuxième échec : deux minutes, pas une.
      await avancer(60_000);
      expect(mockCharger).toHaveBeenCalledTimes(2);
      await avancer(60_000);
      expect(mockCharger).toHaveBeenCalledTimes(3);
      // Dix minutes de plus : cinq essais, pas des centaines.
      for (let i = 0; i < 5; i += 1) await avancer(120_000);
      expect(mockCharger).toHaveBeenCalledTimes(8);
    });

    it("ne redemande rien après une déconnexion ni pour un abonné", async () => {
      mockCharger.mockResolvedValue(null);
      prechauffer([3]);
      await laisserFaire();
      liberer();
      await avancer(5 * 60_000);
      expect(mockCharger).toHaveBeenCalledTimes(1);

      prechauffer([3]);
      await laisserFaire();
      expect(mockCharger).toHaveBeenCalledTimes(2);
      poserSansPub(true);
      await avancer(5 * 60_000);
      expect(mockCharger).toHaveBeenCalledTimes(2);
    });
  });
});
