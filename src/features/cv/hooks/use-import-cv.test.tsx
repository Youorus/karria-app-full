/**
 * L'import d'un CV (`use-import-cv.ts`) : le fichier part, les notes
 * viennent du compte rendu réel, et une coupure en arrière-plan ne perd
 * pas un import qui a abouti côté serveur.
 *
 * La couche `api/` et le sélecteur sont simulés : on lit ce que le hook
 * leur demande et ce qu'il raconte.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import { ErreurApi } from "@/lib/http";

import type { FichierCv } from "../api/cv.api";
import { effacerVerification, useVerification } from "../services/verification";
import type { Cv, ResultatImport } from "../types/cv.types";
import { DELAI_APRES_CONSENTEMENT_MS, useImportCv } from "./use-import-cv";

const mockImporter = jest.fn<(fichiers: FichierCv[]) => Promise<ResultatImport>>();
const mockLireMonCv = jest.fn<() => Promise<Cv>>();
const mockChoisir = jest.fn<(source: string) => Promise<FichierCv[] | null>>();

jest.mock("../api/cv.api", () => ({
  importerCv: (fichiers: FichierCv[]) => mockImporter(fichiers),
  lireMonCv: () => mockLireMonCv(),
}));
jest.mock("./use-choix-fichiers", () => ({
  ChoixImpossible: class ChoixImpossible extends Error {},
  useChoixFichiers: () => ({ choisir: (source: string) => mockChoisir(source) }),
}));
jest.mock("@/features/auth/hooks/use-action-ia", () => ({
  useActionIa: () => ({
    avecConsentement: (_usage: string, action: () => void) => action(),
    rejouerSiConsentementRequis: () => false,
  }),
}));

const cv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: null },
  contact: null,
  presentation: null,
  photo: null,
  experiences: [
    {
      poste: "Vendeuse",
      entreprise: "Zara",
      lieu: null,
      debut: "2022-09",
      fin: null,
      enCours: true,
      missions: [],
    },
  ],
  formations: [],
  competences: [],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "2026-11-04T12:00:00.000Z",
};

const resultat: ResultatImport = {
  cv,
  source: { type: "application/pdf", fichiers: 1, pages: 1 },
  retenus: { experiences: 1 },
  ecartes: {},
  manquants: ["contact.phone", "contact.email", "contact.city"],
};

const pdf: FichierCv[] = [
  { uri: "file:///cv.pdf", nom: "cv.pdf", type: "application/pdf" },
];

/** Le rappel que le hook a posé sur `AppState` : le test joue l'arrière-plan en l'appelant. */
let surChangement: (etat: string) => void = () => undefined;

describe("L'import d'un CV", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, rappel) => {
      surChangement = rappel as (etat: string) => void;
      return { remove: jest.fn() };
    });
    effacerVerification();
    mockImporter.mockReset();
    mockLireMonCv.mockReset();
    mockChoisir.mockReset();
  });

  it("envoie le fichier choisi puis raconte, ligne par ligne, ce qui a été lu", async () => {
    mockChoisir.mockResolvedValue(pdf);
    let livrer: (r: ResultatImport) => void = () => undefined;
    mockImporter.mockImplementation(() => new Promise((resoudre) => (livrer = resoudre)));
    const renonce = jest.fn();
    const { result } = renderHook(() => ({
      importation: useImportCv(renonce),
      verification: useVerification(),
    }));

    act(() => result.current.importation.demarrer("fichier"));

    act(() => jest.advanceTimersByTime(DELAI_APRES_CONSENTEMENT_MS));
    await act(async () => await Promise.resolve());
    expect(mockImporter).toHaveBeenCalledWith(pdf);
    expect(result.current.importation.phase).toEqual({
      nom: "lecture",
      fichiers: 1,
      type: "Ton PDF",
    });

    await act(async () => {
      livrer(resultat);
      await Promise.resolve();
    });
    const notes = result.current.importation.phase;
    if (notes.nom !== "notes") throw new Error(`phase inattendue : ${notes.nom}`);
    expect(notes.lignes).toEqual([
      "Awa Diallo.",
      "1 expérience trouvée, chez Zara.",
      "Aucune formation trouvée.",
      "Aucune compétence trouvée.",
      "Pas de téléphone, e-mail ni de ville trouvés.",
    ]);
    expect(notes.visibles).toBe(1);
    // L'import marque les sections à vérifier.
    expect(result.current.verification.aVerifier).toEqual([
      "contact",
      "experiences",
      "educations",
    ]);

    act(() => jest.advanceTimersByTime(900));
    expect(result.current.importation.phase).toMatchObject({ nom: "notes", visibles: 2 });
    for (let i = 0; i < 5; i += 1) act(() => jest.advanceTimersByTime(900));
    expect(result.current.importation.phase.nom).toBe("fini");
    expect(renonce).not.toHaveBeenCalled();
  });

  it("revient en arrière si l'on renonce dans le sélecteur", async () => {
    mockChoisir.mockResolvedValue(null);
    const renonce = jest.fn();
    const { result } = renderHook(() => useImportCv(renonce));

    act(() => result.current.demarrer("camera"));

    act(() => jest.advanceTimersByTime(DELAI_APRES_CONSENTEMENT_MS));
    await waitFor(() => expect(renonce).toHaveBeenCalledTimes(1));
    expect(mockImporter).not.toHaveBeenCalled();
    expect(mockChoisir).toHaveBeenCalledWith("camera");
  });

  it("explique l'échec et garde les fichiers pour réessayer", async () => {
    mockChoisir.mockResolvedValue(pdf);
    mockImporter.mockRejectedValueOnce(
      new ErreurApi("x", 422, "document_not_a_cv", "file"),
    );
    mockImporter.mockResolvedValueOnce(resultat);
    const { result } = renderHook(() => useImportCv(() => undefined));

    act(() => result.current.demarrer("fichier"));

    act(() => jest.advanceTimersByTime(DELAI_APRES_CONSENTEMENT_MS));
    await waitFor(() => expect(result.current.phase.nom).toBe("erreur"));
    expect(result.current.phase).toMatchObject({
      message: expect.stringMatching(/bien ton CV/),
      fichiers: pdf,
    });

    act(() => result.current.reessayer());
    await waitFor(() => expect(result.current.phase.nom).toBe("notes"));
    expect(mockImporter).toHaveBeenCalledTimes(2);
  });

  it("retrouve un import abouti pendant un passage en arrière-plan", async () => {
    mockChoisir.mockResolvedValue(pdf);
    let echouer: (cause: unknown) => void = () => undefined;
    mockImporter.mockImplementation(
      () => new Promise((_, rejeter) => (echouer = rejeter)),
    );
    mockLireMonCv.mockResolvedValue({ ...cv, misAJour: "2999-01-01T00:00:00.000Z" });
    const { result } = renderHook(() => useImportCv(() => undefined));

    act(() => result.current.demarrer("fichier"));

    act(() => jest.advanceTimersByTime(DELAI_APRES_CONSENTEMENT_MS));
    await act(async () => await Promise.resolve());
    expect(result.current.phase.nom).toBe("lecture");

    // L'app passe en arrière-plan, puis la requête tombe (réseau coupé).
    act(() => surChangement("background"));
    await act(async () => {
      echouer(new ErreurApi("réseau", 0));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockLireMonCv).toHaveBeenCalledTimes(1);
    const phase = result.current.phase;
    if (phase.nom !== "notes") throw new Error(`phase inattendue : ${phase.nom}`);
    expect(phase.lignes[0]).toBe("Awa Diallo.");
    // Le compte rendu est reconstruit depuis le CV : ce qui manque est dit.
    expect(phase.lignes).toContain("Pas de téléphone, e-mail ni de ville trouvés.");
  });

  it("sans passage en arrière-plan, une coupure réseau est une erreur, et rien n'est relu", async () => {
    mockChoisir.mockResolvedValue(pdf);
    mockImporter.mockRejectedValue(new ErreurApi("réseau", 0));
    const { result } = renderHook(() => useImportCv(() => undefined));

    act(() => result.current.demarrer("fichier"));

    act(() => jest.advanceTimersByTime(DELAI_APRES_CONSENTEMENT_MS));
    await waitFor(() => expect(result.current.phase.nom).toBe("erreur"));

    expect(result.current.phase).toMatchObject({
      message: expect.stringMatching(/connexion/),
    });
    expect(mockLireMonCv).not.toHaveBeenCalled();
  });
});
