/**
 * Finaliser (`use-finaliser.ts`), sur ce que la campagne du 2026-11-20
 * ajoute :
 *
 * - un CV sorti avec le filigrane se télécharge et s'envoie comme un autre —
 *   rien ne le retient ;
 * - la demande d'avis ne suit qu'un succès **confirmé** (partage fait, envoi
 *   accepté), jamais un échec ni un partage annulé, et attend que la feuille
 *   « As-tu candidaté ? » soit refermée.
 *
 * Les couches `api/`, le téléchargement et la demande d'avis sont simulés.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { Dossier } from "@/features/candidatures/types/candidatures.types";
import type { Cv } from "@/features/cv/types/cv.types";
import { ErreurApi } from "@/lib/http";

import type { Envoi, Export } from "../types/atelier.types";
import { useFinaliser } from "./use-finaliser";

// ── Les doublures ──────────────────────────────────────────────────────

let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), dismissTo: jest.fn() }),
  useFocusEffect: () => undefined,
}));
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: jest.fn() }),
}));
jest.mock("@/features/auth/api/auth.api", () => ({
  lireMoi: async () => ({ email: "awa@exemple.fr" }),
}));
// Des références stables, comme le vrai hook : l'effet de génération en dépend.
const mockActionIa = { rejouerSiConsentementRequis: () => false };
jest.mock("@/features/auth/hooks/use-action-ia", () => ({
  useActionIa: () => mockActionIa,
}));
jest.mock("@/features/publicite/hooks/use-annonce-emplacement", () => ({
  useAnnonceEmplacement: () => null,
}));
jest.mock("@/features/modeles/api/modeles.api", () => ({
  lireModeles: async () => [{ id: "tpl", libelle: "Meridian", premium: false }],
  lireMesModeles: async () => new Set<string>(),
}));
jest.mock("./use-ouvrir-lecteur", () => ({ useOuvrirLecteur: () => jest.fn() }));
jest.mock("../services/brouillon-atelier", () => ({
  CLE_BROUILLON_LIBRE: "libre",
  lireBrouillonAtelier: () => null,
  brouillonPrime: () => false,
  versionDesBrouillons: () => 0,
}));

// Le filigrane a ses propres tests (`use-filigrane.test.tsx`) : ici, on
// vérifie seulement ce que Finaliser lui passe.
const mockFiligrane = jest.fn((options: unknown) => {
  void options;
  return {
    ligne: null,
    proposition: {
      visible: false,
      textes: { titre: "", texte: "", accepter: "", refuser: "" },
      accepter: jest.fn(),
      fermer: jest.fn(),
      apresFermeture: jest.fn(),
    },
    regenerable: false,
    regenerer: jest.fn(),
  };
});
jest.mock("./use-filigrane", () => ({
  useFiligrane: (options: unknown) => mockFiligrane(options),
}));

const cv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: "Vendeuse", precision: null },
  contact: null,
  presentation: null,
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "2026-11-20T08:00:00Z",
};
jest.mock("@/features/cv/api/cv.api", () => ({ lireMonCv: async () => cv }));

const dossier = {
  id: "dos_1",
  couleur: null,
  styleLettre: null,
  modeleId: "tpl",
  cv,
  lettre: null,
  offre: { entreprise: "Zara" },
} as unknown as Dossier;
jest.mock("@/features/candidatures/api/candidatures.api", () => ({
  lireDossier: async () => dossier,
}));

function exporte(partiel: Partial<Export> = {}): Export {
  return {
    id: "exp_1",
    genre: "cv",
    modele: { id: "tpl", libelle: "Meridian" },
    dossierId: null,
    creeLe: "2026-11-20T10:00:00Z",
    pdf: "https://s/cv.pdf",
    docx: "https://s/cv.docx",
    apercus: [],
    atsSafe: false,
    resserre: {},
    ats: null,
    couleur: null,
    styleLettre: null,
    filigrane: false,
    ...partiel,
  };
}

const mockExporter = jest.fn<() => Promise<Export>>();
const mockEnvoyer = jest.fn<(ids: string[], a: string | null) => Promise<Envoi>>();
jest.mock("../api/documents.api", () => ({
  exporterCvLibre: () => mockExporter(),
  exporterCvDuDossier: () => mockExporter(),
  exporterLettre: jest.fn(),
  lireModeleChoisi: async () => null,
  envoyerExports: (ids: string[], a: string | null) => mockEnvoyer(ids, a),
}));

const mockTelecharger = jest.fn<(url: string, nom: string) => Promise<boolean>>();
let mockIos = true;
jest.mock("../services/telechargement", () => ({
  telechargerEtPartager: (url: string, nom: string) => mockTelecharger(url, nom),
  // Comme le vrai : confirmé seulement là où le système le dit (iOS).
  partageEstConfirme: (partage: boolean) => partage && mockIos,
}));

const mockNoterSucces = jest.fn<(succes: string) => Promise<void>>();
const mockProposerAvis = jest.fn();
const mockSuccesPuisAvis = jest.fn<(succes: string) => void>();
jest.mock("@/features/avis/services/demande-avis", () => ({
  noterSucces: (succes: string) => mockNoterSucces(succes),
  proposerAvis: () => mockProposerAvis(),
  succesPuisAvis: (succes: string) => mockSuccesPuisAvis(succes),
}));

const ENVOI: Envoi = {
  id: "env_1",
  statut: "en_file",
  a: "awa@exemple.fr",
  exports: ["exp_1"],
  creeLe: "2026-11-20T10:01:00Z",
  envoyeLe: null,
};

async function ouvrir(libre: boolean) {
  const rendu = renderHook(() => useFinaliser(libre));
  await waitFor(() => expect(rendu.result.current.generation).toBe(false));
  expect(rendu.result.current.exportCv).not.toBeNull();
  return rendu;
}

describe("Finaliser", () => {
  beforeEach(() => {
    mockParams = { dossierId: "dos_1" };
    mockIos = true;
    mockFiligrane.mockClear();
    mockExporter.mockReset();
    mockExporter.mockResolvedValue(exporte());
    mockEnvoyer.mockReset();
    mockEnvoyer.mockResolvedValue(ENVOI);
    mockTelecharger.mockReset();
    mockTelecharger.mockResolvedValue(true);
    mockNoterSucces.mockReset();
    mockNoterSucces.mockResolvedValue(undefined);
    mockProposerAvis.mockReset();
    mockSuccesPuisAvis.mockReset();
  });

  describe("le filigrane ne retient rien", () => {
    it("passe l'export au filigrane, et un CV filigrané se télécharge et s'envoie", async () => {
      mockExporter.mockResolvedValue(exporte({ filigrane: true }));
      const { result } = await ouvrir(true);
      expect(mockFiligrane).toHaveBeenLastCalledWith(
        expect.objectContaining({
          exporte: expect.objectContaining({ id: "exp_1", filigrane: true }),
          enAttente: false,
        }),
      );

      act(() => result.current.telecharger("cv", "pdf"));
      await waitFor(() => expect(result.current.telechargement).toBeNull());
      expect(mockTelecharger).toHaveBeenCalledWith(
        "https://s/cv.pdf",
        expect.stringContaining("Awa Diallo"),
      );

      act(() => result.current.envoyer(null));
      await waitFor(() => expect(result.current.envoi.fait).toBe("awa@exemple.fr"));
      expect(mockEnvoyer).toHaveBeenCalledWith(["exp_1"], null);
    });

    it("« Régénérer sans filigrane » relance l'export", async () => {
      mockExporter.mockResolvedValue(exporte({ filigrane: true }));
      const { result } = await ouvrir(true);
      const { regenerer } = mockFiligrane.mock.calls[
        mockFiligrane.mock.calls.length - 1
      ][0] as { regenerer: () => void };
      mockExporter.mockResolvedValue(exporte({ id: "exp_2", filigrane: false }));
      act(() => regenerer());
      await waitFor(() => expect(result.current.exportCv?.id).toBe("exp_2"));
      expect(result.current.exportCv?.filigrane).toBe(false);
      expect(mockExporter).toHaveBeenCalledTimes(2);
    });
  });

  describe("la demande d'avis, seulement après un succès confirmé", () => {
    it("CV libre : un partage confirmé note le succès et propose", async () => {
      const { result } = await ouvrir(true);
      act(() => result.current.telecharger("cv", "pdf"));
      await waitFor(() => expect(mockSuccesPuisAvis).toHaveBeenCalledWith("export"));
      expect(mockSuccesPuisAvis).toHaveBeenCalledTimes(1);
      // Un seul export : ouvrir Finaliser n'en consomme pas deux.
      expect(mockExporter).toHaveBeenCalledTimes(1);
    });

    it("un partage annulé n'est pas un succès", async () => {
      mockTelecharger.mockResolvedValue(false);
      const { result } = await ouvrir(true);
      act(() => result.current.telecharger("cv", "pdf"));
      await waitFor(() => expect(result.current.telechargement).toBeNull());
      expect(mockSuccesPuisAvis).not.toHaveBeenCalled();
      expect(mockNoterSucces).not.toHaveBeenCalled();
    });

    it("sur Android, la feuille ouverte ne prouve pas le partage : rien n'est noté", async () => {
      mockIos = false;
      const { result } = await ouvrir(true);
      act(() => result.current.telecharger("cv", "pdf"));
      await waitFor(() => expect(result.current.telechargement).toBeNull());
      expect(mockSuccesPuisAvis).not.toHaveBeenCalled();
    });

    it("un téléchargement en échec ne demande rien, et le dit", async () => {
      mockTelecharger.mockRejectedValue(new Error("disque plein"));
      const { result } = await ouvrir(true);
      act(() => result.current.telecharger("cv", "pdf"));
      await waitFor(() => expect(result.current.erreur).not.toBeNull());
      expect(mockSuccesPuisAvis).not.toHaveBeenCalled();
      expect(mockNoterSucces).not.toHaveBeenCalled();
      expect(mockProposerAvis).not.toHaveBeenCalled();
    });

    it("CV libre : un envoi accepté note le succès et propose ; un envoi refusé, non", async () => {
      const { result } = await ouvrir(true);
      mockEnvoyer.mockRejectedValueOnce(
        new ErreurApi("Trop d'envois", 429, "send_quota_exceeded"),
      );
      act(() => result.current.envoyer(null));
      await waitFor(() => expect(result.current.envoi.erreur).not.toBeNull());
      expect(mockSuccesPuisAvis).not.toHaveBeenCalled();

      act(() => result.current.envoyer(null));
      await waitFor(() => expect(mockSuccesPuisAvis).toHaveBeenCalledWith("envoi"));
    });

    it("dossier : le succès est noté, la demande attend la fermeture de « As-tu candidaté ? »", async () => {
      const { result } = await ouvrir(false);
      act(() => result.current.envoyer(null));
      await waitFor(() => expect(result.current.question).toBe(true));
      expect(mockNoterSucces).toHaveBeenCalledWith("envoi");
      // La feuille est ouverte : rien n'est proposé.
      expect(mockProposerAvis).not.toHaveBeenCalled();
      expect(mockSuccesPuisAvis).not.toHaveBeenCalled();

      act(() => result.current.fermerQuestion());
      expect(result.current.question).toBe(false);
      expect(mockProposerAvis).toHaveBeenCalledTimes(1);
    });

    it("dossier : un partage confirmé ouvre la question, puis propose à sa fermeture", async () => {
      const { result } = await ouvrir(false);
      act(() => result.current.telecharger("cv", "docx"));
      await waitFor(() => expect(result.current.question).toBe(true));
      expect(mockNoterSucces).toHaveBeenCalledWith("export");
      expect(mockProposerAvis).not.toHaveBeenCalled();
      act(() => result.current.fermerQuestion());
      expect(mockProposerAvis).toHaveBeenCalledTimes(1);
    });
  });
});
