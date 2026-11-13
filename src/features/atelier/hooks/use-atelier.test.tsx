/**
 * L'atelier (`use-atelier.ts`) : changer de modèle ne perd rien.
 *
 * Marc, 2026-11-05 : « l'utilisateur doit toujours pouvoir passer d'un
 * modèle à l'autre pour voir les différences, et si le CV a été adapté, il
 * ne doit pas perdre les informations déjà inscrites ». On le prouve ici :
 * après une retouche, deux changements de modèle laissent le CV courant,
 * l'historique annuler/rétablir et le brouillon local identiques ; seul le
 * rendu est redemandé, dans le nouveau modèle. Pour un dossier, le choix
 * part au serveur (`PUT /applications/{id}/template`) et un refus
 * `template_locked` remet l'ancien modèle.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import type { Dossier } from "@/features/candidatures/types/candidatures.types";
import type { Cv } from "@/features/cv/types/cv.types";
import type { Modele } from "@/features/modeles/types/modeles.types";
import { ErreurApi } from "@/lib/http";

import { lireBrouillonAtelier } from "../services/brouillon-atelier";
import { useAtelier } from "./use-atelier";

// ── Les doublures ──────────────────────────────────────────────────────

const mockDisque = new Map<string, string>();
jest.mock("expo-file-system", () => {
  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    get exists() {
      return [...mockDisque.keys()].some((k) => k.startsWith(`${this.uri}/`));
    }
    create() {
      mockDisque.set(`${this.uri}/.dir`, "");
    }
    delete() {
      for (const k of [...mockDisque.keys()])
        if (k.startsWith(`${this.uri}/`)) mockDisque.delete(k);
    }
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === "string" ? p : p.uri)).join("/");
    }
    get exists() {
      return mockDisque.has(this.uri);
    }
    textSync() {
      return mockDisque.get(this.uri) ?? "";
    }
    write(contenu: string) {
      mockDisque.set(this.uri, contenu);
    }
    delete() {
      mockDisque.delete(this.uri);
    }
  }
  return {
    Directory,
    File,
    Paths: { cache: { uri: "cache" }, document: { uri: "doc" } },
  };
});

let mockParams: Record<string, string> = {};
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual<typeof import("react")>("react");
  return {
    useLocalSearchParams: () => mockParams,
    useRouter: () => ({ canGoBack: () => false, back: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (effet: () => void | (() => void)) => useEffect(effet, [effet]),
  };
});
jest.mock("@/lib/navigation", () => ({
  useNavigationUnique: () => ({ pousser: jest.fn(), remplacer: jest.fn() }),
}));
jest.mock("@/features/auth/hooks/use-action-ia", () => ({
  useActionIa: () => ({
    avecConsentement: (_usage: string, action: () => void) => action(),
    rejouerSiConsentementRequis: () => false,
  }),
}));
jest.mock("@/features/publicite/hooks/use-annonce-emplacement", () => ({
  useAnnonceEmplacement: () => null,
}));

const mockRendre =
  jest.fn<
    (
      modeleId: string,
      cv: Cv,
      atsSafe?: boolean,
      couleur?: string | null,
    ) => Promise<unknown>
  >();
const mockChoisir =
  jest.fn<(modeleId: string, couleur: string | null) => Promise<void>>();
jest.mock("../api/documents.api", () => ({
  lireModeleChoisi: async () => null,
  choisirModele: (modeleId: string, couleur: string | null) =>
    mockChoisir(modeleId, couleur),
  rendreCv: (modeleId: string, cv: Cv, atsSafe?: boolean, couleur?: string | null) =>
    mockRendre(modeleId, cv, atsSafe, couleur),
}));

const LIBRE = "a0000000-0000-4000-8000-000000000001";
const ACHETE = "a0000000-0000-4000-8000-000000000002";
const VERROUILLE = "a0000000-0000-4000-8000-000000000003";

function unModele(id: string, libelle: string, premium: boolean): Modele {
  return {
    id,
    libelle,
    categorie: "Professionnel",
    description: null,
    premium,
    prix: premium ? "4.99" : null,
    etiquettes: [],
    miniature: null,
    flou: null,
    version: 1,
    vues: 0,
    utilisations: 0,
    note: 0,
    nombreDAvis: 0,
    // Meridian (LIBRE) a une couleur mesurée : « D'origine » ; les autres non.
    couleur: id === LIBRE ? "#1A5276" : null,
    police: null,
    avecPhoto: true,
    apercus: [],
    lettreAssortie: false,
  };
}
// Les fabriques de `jest.mock` sont hissées : elles ne voient que des
// variables préfixées `mock`.
const mockModeles: Modele[] = [
  unModele(LIBRE, "Minimalist", false),
  unModele(ACHETE, "Meridian", true),
  unModele(VERROUILLE, "Aurore", true),
];
const mockPossedes = new Set([ACHETE]);
jest.mock("@/features/modeles/api/modeles.api", () => ({
  lireModeles: async () => mockModeles,
  lireMesModeles: async () => mockPossedes,
}));

const mockCv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: "Conseillère de vente" },
  contact: null,
  presentation: "Dix ans en boutique.",
  photo: null,
  experiences: [],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "2026-11-05T08:00:00Z",
};
jest.mock("@/features/cv/api/cv.api", () => ({ lireMonCv: async () => mockCv }));

const mockDossier: Dossier = {
  id: "dos_1",
  couleur: null,
  styleLettre: null,
  offre: {
    id: "offre_1",
    titre: "Conseillère de vente",
    entreprise: "Zara",
    logo: null,
    siteEntreprise: null,
    ville: "Paris",
    contrat: "CDI",
    lienCandidature: null,
    extrait: null,
    description: null,
    motsCles: ["caisse"],
    publieeLe: null,
  },
  modeleId: null,
  cv: mockCv,
  empreinteCvDeBase: "abc",
  baseChangee: false,
  propositions: [
    {
      id: "p1",
      chemin: "skills",
      avant: [],
      apres: [],
      raison: "Ordre",
      etat: "acceptee",
    },
  ],
  lettre: null,
  couverture: { presents: ["caisse"], manquants: [], ratio: 1 },
  statut: "pret",
  adaptation: "faite",
  erreurAdaptation: null,
  candidateLe: null,
  creeLe: "2026-11-05T09:00:00Z",
  modifieLe: "2026-11-05T09:00:00Z",
};
const mockChangerModele =
  jest.fn<(id: string, modeleId: string | null) => Promise<Dossier>>();
const mockChangerCouleur =
  jest.fn<(id: string, couleur: string | null) => Promise<Dossier>>();
jest.mock("@/features/candidatures/api/candidatures.api", () => ({
  lireDossier: async () => mockDossier,
  changerModeleDuDossier: (id: string, modeleId: string | null) =>
    mockChangerModele(id, modeleId),
  changerCouleurDuDossier: (id: string, couleur: string | null) =>
    mockChangerCouleur(id, couleur),
  modifierCvDuDossier: async () => mockDossier,
  deciderProposition: async () => mockDossier,
  relancerAdaptation: async () => mockDossier,
}));

// ── Les tests ──────────────────────────────────────────────────────────

describe("L'atelier : changer de modèle ne perd rien", () => {
  beforeEach(() => {
    mockDisque.clear();
    mockParams = {};
    mockRendre.mockReset();
    mockRendre.mockResolvedValue({ html: "<html/>", pages: 1, avertissements: [] });
    mockChangerModele.mockReset();
    mockChangerModele.mockImplementation(async (_id, modeleId) => ({
      ...mockDossier,
      modeleId,
    }));
    mockChoisir.mockReset();
    mockChoisir.mockResolvedValue(undefined);
    mockChangerCouleur.mockReset();
    mockChangerCouleur.mockImplementation(async (_id, couleur) => ({
      ...mockDossier,
      couleur,
    }));
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  it("libre : la couleur se pose, se voit au rendu, survit au modèle, reste à ce CV", async () => {
    const { result } = renderHook(() => useAtelier(true));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.couleur).toBeNull();
    expect(result.current.couleurOrigine).toBe("#1A5276");
    act(() => result.current.garderModele());
    mockRendre.mockClear();

    act(() => result.current.ouvrir({ type: "couleur" }));
    act(() => result.current.choisirCouleur("7b1e2b"));
    expect(result.current.couleur).toBe("#7B1E2B");
    await waitFor(() => expect(mockRendre).toHaveBeenCalledTimes(1));
    expect(mockRendre.mock.calls[0]?.[3]).toBe("#7B1E2B");
    // Le CV n'a pas bougé, le brouillon porte la couleur.
    expect(result.current.peutAnnuler).toBe(false);
    expect(lireBrouillonAtelier("libre")?.couleur).toBe("#7B1E2B");
    // Sans dossier, la couleur reste dans le brouillon de ce CV : « Garder »
    // n'en fait pas la couleur par défaut des CV suivants (Marc, 13/11).
    expect(mockChoisir).not.toHaveBeenCalled();
    act(() => result.current.garderCouleur());
    expect(result.current.feuille).toBeNull();
    expect(mockChoisir).not.toHaveBeenCalled();

    // Changer de modèle garde la couleur choisie.
    act(() => result.current.choisirModele(ACHETE));
    expect(result.current.couleur).toBe("#7B1E2B");
    await waitFor(() => expect(mockRendre).toHaveBeenCalledTimes(2));
    expect(mockRendre.mock.calls[1]?.[3]).toBe("#7B1E2B");

    // La couleur d'origine du modèle courant se retient comme « aucune ».
    act(() => result.current.choisirModele(LIBRE));
    act(() => result.current.choisirCouleur("#1a5276"));
    expect(result.current.couleur).toBeNull();
    // Rouvrir sans rien changer, puis garder : pas d'envoi de plus.
    mockChoisir.mockClear();
    act(() => result.current.ouvrir({ type: "couleur" }));
    act(() => result.current.garderCouleur());
    expect(mockChoisir).not.toHaveBeenCalled();
  });

  it("dossier : la couleur part au dossier à « Garder », et `?couleur=` la pose à l'ouverture", async () => {
    mockParams = { dossierId: "dos_1" };
    const { result } = renderHook(() => useAtelier(false));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    act(() => result.current.garderModele());

    act(() => result.current.ouvrir({ type: "couleur" }));
    act(() => result.current.choisirCouleur("#2E7D32", false));
    act(() => result.current.garderCouleur());
    expect(mockChangerCouleur).toHaveBeenCalledWith("dos_1", "#2E7D32");
    await waitFor(() => expect(result.current.dossier?.couleur).toBe("#2E7D32"));

    // « Revenir à la couleur d'origine » : null part au dossier.
    act(() => result.current.ouvrir({ type: "couleur" }));
    act(() => result.current.choisirCouleur(null));
    act(() => result.current.garderCouleur());
    expect(mockChangerCouleur).toHaveBeenLastCalledWith("dos_1", null);
  });

  it("libre : `?couleur=` (Mes CV) pose la couleur de l'export, un code invalide est ignoré", async () => {
    mockParams = { modele: ACHETE, couleur: "2e7d32" };
    const { result } = renderHook(() => useAtelier(true));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.couleur).toBe("#2E7D32");
    expect(mockRendre).toHaveBeenCalledWith(ACHETE, mockCv, false, "#2E7D32");

    // Le brouillon écrit par la première ouverture porte la couleur : on repart à vide.
    mockDisque.clear();
    mockParams = { couleur: "bleu" };
    const second = renderHook(() => useAtelier(true));
    await waitFor(() => expect(second.result.current.chargement).toBe(false));
    expect(second.result.current.couleur).toBeNull();
  });

  it("libre : deux changements laissent le CV retouché, l'historique et le brouillon intacts", async () => {
    const { result } = renderHook(() => useAtelier(true));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    // Premier modèle gratuit, et la feuille du modèle s'ouvre d'elle-même.
    expect(result.current.modeleId).toBe(LIBRE);
    expect(result.current.feuille).toEqual({ type: "modele" });

    act(() => result.current.changerIntitule("Vendeuse senior"));
    const retouche = result.current.cv;
    expect(retouche?.identite?.titre).toBe("Vendeuse senior");
    expect(result.current.peutAnnuler).toBe(true);
    mockRendre.mockClear();

    act(() => result.current.choisirModele(ACHETE));
    act(() => result.current.choisirModele(LIBRE));
    // La file de rendu enchaîne : le second rendu part quand le premier répond.
    await waitFor(() => expect(mockRendre).toHaveBeenCalledTimes(2));

    expect(result.current.cv).toBe(retouche);
    expect(result.current.peutAnnuler).toBe(true);
    expect(result.current.modeleId).toBe(LIBRE);
    expect(result.current.modele?.libelle).toBe("Minimalist");
    // Seul le rendu est redemandé, avec le même CV, dans chaque modèle.
    expect(mockRendre.mock.calls.map(([m]) => m)).toEqual([ACHETE, LIBRE]);
    for (const [, rendu] of mockRendre.mock.calls) expect(rendu).toEqual(retouche);
    // Le brouillon porte le CV retouché et le dernier modèle.
    const brouillon = lireBrouillonAtelier("libre");
    expect(brouillon?.cv).toEqual(retouche);
    expect(brouillon?.modeleId).toBe(LIBRE);
    // Rien ne part au serveur des dossiers.
    expect(mockChangerModele).not.toHaveBeenCalled();

    // Annuler rend l'intitulé d'avant : l'historique n'a pas été vidé.
    act(() => result.current.annuler());
    expect(result.current.cv?.identite?.titre).toBe("Conseillère de vente");
  });

  it("libre : `?modele=` (galerie, Mes CV) pose le modèle demandé sans rouvrir la feuille", async () => {
    mockParams = { modele: ACHETE };
    const { result } = renderHook(() => useAtelier(true));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.modeleId).toBe(ACHETE);
    expect(result.current.feuille).toBeNull();
    expect(mockRendre).toHaveBeenCalledWith(ACHETE, mockCv, false, null);
  });

  it("libre : un Premium non possédé demandé par l'adresse est ignoré", async () => {
    mockParams = { modele: VERROUILLE };
    const { result } = renderHook(() => useAtelier(true));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.modeleId).toBe(LIBRE);
  });

  it("dossier : le choix part au serveur, le dossier suit, le CV et les propositions restent", async () => {
    mockParams = { dossierId: "dos_1" };
    const { result } = renderHook(() => useAtelier(false));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.feuille).toEqual({ type: "modele" });
    const avant = result.current.cv;
    mockRendre.mockClear();

    act(() => result.current.choisirModele(ACHETE));

    expect(mockChangerModele).toHaveBeenCalledWith("dos_1", ACHETE);
    await waitFor(() => expect(result.current.dossier?.modeleId).toBe(ACHETE));
    expect(result.current.modeleId).toBe(ACHETE);
    expect(result.current.cv).toBe(avant);
    expect(result.current.propositions).toEqual(mockDossier.propositions);
    expect(mockRendre).toHaveBeenCalledWith(ACHETE, avant, false, null);

    // Le même modèle redemandé : aucun appel.
    act(() => result.current.choisirModele(ACHETE));
    expect(mockChangerModele).toHaveBeenCalledTimes(1);

    act(() => result.current.garderModele());
    expect(result.current.feuille).toBeNull();
  });

  it("dossier : un refus `template_locked` remet l'ancien modèle et le dit", async () => {
    mockParams = { dossierId: "dos_1" };
    mockChangerModele.mockRejectedValue(
      new ErreurApi("Ce modèle Premium n'est pas à toi.", 403, "template_locked"),
    );
    const { result } = renderHook(() => useAtelier(false));
    await waitFor(() => expect(result.current.chargement).toBe(false));
    const precedent = result.current.modeleId;

    act(() => result.current.choisirModele(ACHETE));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());

    expect(result.current.modeleId).toBe(precedent);
    expect(result.current.dossier?.modeleId).toBeNull();
  });
});
