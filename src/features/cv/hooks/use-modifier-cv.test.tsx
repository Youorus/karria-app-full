/**
 * Modifier une section du CV (`use-modifier-cv.ts`) : la valeur vient du
 * CV, l'enregistrement passe par `PUT /cv/me/chapters/{section}`, les
 * listes s'enregistrent à chaque geste, les saisies non enregistrées sont
 * restituées, et ouvrir la section la compte comme vérifiée.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ErreurApi } from "@/lib/http";

import { oublierBrouillon } from "../services/brouillons-edition";
import {
  effacerVerification,
  marquerImporte,
  useVerification,
} from "../services/verification";
import type { CleChapitre, Cv, Jet } from "../types/cv.types";
import { useModifierCv, valeurDuCv, versContenu } from "./use-modifier-cv";

const mockLireMonCv = jest.fn<() => Promise<Cv>>();
const mockModifier =
  jest.fn<(c: CleChapitre, contenu: Jet | Jet[] | null) => Promise<Cv>>();
const mockBack = jest.fn();
const mockTeleverser =
  jest.fn<
    (
      uri: string,
      ameliorer: boolean,
    ) => Promise<{ image: string; imageId: string; amelioree: boolean }>
  >();
const mockAmeliorerActuelle =
  jest.fn<() => Promise<{ image: string; imageId: string; amelioree: boolean }>>();
const mockChoisir = jest.fn<(source: string) => Promise<string | null>>();
const mockRejouer =
  jest.fn<(cause: unknown, usage: string, action: () => void) => boolean>();
let mockSection = "identity";

jest.mock("../api/cv.api", () => ({
  lireMonCv: () => mockLireMonCv(),
  modifierSection: (c: CleChapitre, contenu: Jet | Jet[] | null) =>
    mockModifier(c, contenu),
  televerserPhoto: (uri: string, ameliorer: boolean) => mockTeleverser(uri, ameliorer),
  ameliorerPhotoActuelle: () => mockAmeliorerActuelle(),
}));
jest.mock("@/features/auth/hooks/use-action-ia", () => ({
  useActionIa: () => ({
    avecConsentement: (_usage: string, action: () => void) => action(),
    rejouerSiConsentementRequis: (cause: unknown, usage: string, action: () => void) =>
      mockRejouer(cause, usage, action),
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ section: mockSection }),
}));
jest.mock("./use-choix-photo", () => ({
  useChoixPhoto: () => ({ probleme: null, choisir: (s: string) => mockChoisir(s) }),
}));

const cv: Cv = {
  identite: { prenom: "Awa", nom: "Diallo", titre: null },
  contact: { email: "awa@example.com", telephone: null, ville: "Montreuil", liens: [] },
  presentation: "Moi.",
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
    {
      poste: "Caissière",
      entreprise: "Lidl",
      lieu: null,
      debut: "2020-01",
      fin: "2021-12",
      enCours: false,
      missions: [],
    },
  ],
  formations: [],
  competences: [{ nom: "Vente", niveau: "Avancé" }],
  langues: [],
  interets: [],
  vide: false,
  misAJour: "",
};

describe("La valeur d'une section", () => {
  it("se lit dans le CV et repart sous la forme du contrat", () => {
    expect(valeurDuCv("summary", { ...cv, presentation: null })).toEqual({
      section: "summary",
      valeur: { texte: "" },
    });
    expect(versContenu({ section: "summary", valeur: { texte: "  " } })).toBeNull();
    expect(versContenu({ section: "experiences", valeur: cv.experiences })).toHaveLength(
      2,
    );
    expect(versContenu(valeurDuCv("skills", cv))).toEqual({
      chapitre: "skills",
      donnees: { competences: cv.competences, langues: [] },
    });
  });
});

describe("Modifier une section", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    effacerVerification();
    mockLireMonCv.mockReset();
    mockModifier.mockReset();
    mockBack.mockReset();
    for (const s of ["identity", "contact", "summary", "experiences"] as const)
      oublierBrouillon(s);
    mockLireMonCv.mockResolvedValue(cv);
  });

  it("charge la valeur, enregistre d'un bouton puis revient, et compte la section comme vérifiée", async () => {
    mockSection = "identity";
    marquerImporte();
    mockModifier.mockResolvedValue({
      ...cv,
      identite: { prenom: "Awa", nom: "Diallo", titre: "Vendeuse" },
    });
    const { result } = renderHook(() => ({ m: useModifierCv(), v: useVerification() }));

    await waitFor(() => expect(result.current.m.chargement).toBe(false));
    expect(result.current.m.valeur).toEqual({ section: "identity", valeur: cv.identite });
    expect(result.current.m.enListe).toBe(false);
    // Ouvrir « identité » ne touche pas la liste à vérifier (coordonnées, expériences, formations).
    expect(result.current.v.aVerifier).toEqual(["contact", "experiences", "educations"]);

    act(() =>
      result.current.m.changer({ prenom: "Awa", nom: "Diallo", titre: "Vendeuse" }),
    );
    expect(result.current.m.modifie).toBe(true);
    act(() => result.current.m.enregistrer());
    await waitFor(() => expect(result.current.m.enregistrement).toBe("fait"));
    expect(mockModifier).toHaveBeenCalledWith("identity", {
      chapitre: "identity",
      donnees: { prenom: "Awa", nom: "Diallo", titre: "Vendeuse" },
    });
    act(() => jest.advanceTimersByTime(700));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("refuse d'envoyer un prénom vide et montre l'erreur sous le champ", async () => {
    mockSection = "identity";
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.changer({ prenom: "", nom: "Diallo", titre: null }));
    act(() => result.current.enregistrer());

    expect(mockModifier).not.toHaveBeenCalled();
    expect(result.current.erreursChamps.prenom).toMatch(/prénom/);
    expect(result.current.enregistrement).toBe("erreur");
  });

  it("traduit les champs d'un 422 du serveur", async () => {
    mockSection = "contact";
    marquerImporte();
    mockModifier.mockRejectedValue(
      new ErreurApi("invalide", 422, "chapter_invalid", undefined, {
        reason: "chapter_invalid",
        fields: [
          { field: "links.0.url", reason: "Seules les adresses http(s) sont acceptées." },
        ],
      }),
    );
    const { result } = renderHook(() => ({ m: useModifierCv(), v: useVerification() }));
    await waitFor(() => expect(result.current.m.chargement).toBe(false));
    expect(result.current.v.aVerifier).toEqual(["experiences", "educations"]);

    act(() =>
      result.current.m.changer({
        email: "awa@example.com",
        telephone: null,
        ville: "Montreuil",
        // Valide pour nous ; c'est le serveur (simulé) qui le refuse.
        liens: [{ libelle: "x", url: "exemple.fr/cv" }],
      }),
    );
    act(() => result.current.m.enregistrer());
    await waitFor(() => expect(result.current.m.enregistrement).toBe("erreur"));
    expect(result.current.m.erreursChamps["liens.0.url"]).toMatch(/http/);
    expect(result.current.m.probleme).toMatch(/Corrige/);
  });

  it("restitue des saisies non enregistrées à la visite suivante", async () => {
    mockSection = "summary";
    const premiere = renderHook(() => useModifierCv());
    await waitFor(() => expect(premiere.result.current.chargement).toBe(false));
    act(() => premiere.result.current.changer({ texte: "Brouillon en cours" }));
    premiere.unmount();

    const seconde = renderHook(() => useModifierCv());
    await waitFor(() => expect(seconde.result.current.chargement).toBe(false));
    expect(seconde.result.current.restaure).toBe(true);
    expect(seconde.result.current.valeur).toEqual({
      section: "summary",
      valeur: { texte: "Brouillon en cours" },
    });

    act(() => seconde.result.current.annuler());
    expect(mockBack).toHaveBeenCalled();
    const troisieme = renderHook(() => useModifierCv());
    await waitFor(() => expect(troisieme.result.current.chargement).toBe(false));
    expect(troisieme.result.current.restaure).toBe(false);
  });

  it("bloque l'enregistrement sur une incohérence et montre l'erreur tout de suite", async () => {
    mockSection = "contact";
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.bloque).toBe(false);

    act(() =>
      result.current.changer({
        email: "awa@",
        telephone: null,
        ville: null,
        liens: [{ libelle: "", url: "linkedin.com/in/awa" }],
      }),
    );
    // L'incohérence s'affiche sans tentative ; le manque (libellé) attend.
    expect(result.current.bloque).toBe(true);
    expect(result.current.erreursChamps.email).toMatch(/e-mail/);
    expect(result.current.erreursChamps["liens.0.libelle"]).toBeUndefined();

    act(() => result.current.enregistrer());
    expect(mockModifier).not.toHaveBeenCalled();
    expect(result.current.erreursChamps["liens.0.libelle"]).toMatch(/nom/);

    act(() =>
      result.current.changer({
        email: "awa@example.com",
        telephone: null,
        ville: null,
        liens: [{ libelle: "LinkedIn", url: "linkedin.com/in/awa" }],
      }),
    );
    expect(result.current.bloque).toBe(false);
    expect(result.current.erreursChamps).toEqual({});
  });

  it("bloque la feuille d'un élément sur des dates incohérentes", async () => {
    mockSection = "experiences";
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.liste.editer(1));
    expect(result.current.bloque).toBe(false);
    act(() =>
      result.current.liste.changerElement({
        ...cv.experiences[1]!,
        debut: "2022-01",
        fin: "2021-06",
      }),
    );
    expect(result.current.bloque).toBe(true);
    expect(result.current.erreursChamps.fin).toMatch(/avant le début/);

    act(() => result.current.liste.validerElement());
    expect(mockModifier).not.toHaveBeenCalled();
    expect(result.current.liste.enEdition).not.toBeNull();
  });

  it("enregistre une liste à chaque geste : déplacer, supprimer, ajouter", async () => {
    mockSection = "experiences";
    mockModifier.mockImplementation((_c, contenu) =>
      Promise.resolve({
        ...cv,
        experiences: Array.isArray(contenu)
          ? contenu.flatMap((j) => (j.chapitre === "experiences" ? [j.donnees] : []))
          : cv.experiences,
      }),
    );
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));
    expect(result.current.enListe).toBe(true);

    act(() => result.current.liste.descendre(0));
    await waitFor(() => expect(result.current.enregistrement).toBe("fait"));
    const envoye = mockModifier.mock.calls[0]?.[1];
    expect(
      Array.isArray(envoye) &&
        envoye.map((j) => (j.chapitre === "experiences" ? j.donnees.entreprise : "")),
    ).toEqual(["Lidl", "Zara"]);

    act(() => result.current.liste.supprimer(1));
    await waitFor(() => expect(mockModifier).toHaveBeenCalledTimes(2));

    act(() => result.current.liste.ajouter());
    expect(result.current.liste.enEdition).toMatchObject({ index: null });
    act(() => result.current.liste.validerElement());
    // Sans poste ni entreprise, rien ne part : l'erreur est sous le champ.
    expect(mockModifier).toHaveBeenCalledTimes(2);
    expect(result.current.erreursChamps.poste).toBeDefined();

    act(() =>
      result.current.liste.changerElement({
        poste: "Hôtesse",
        entreprise: "Carrefour",
        lieu: null,
        debut: "2019-01",
        fin: null,
        enCours: false,
        missions: ["Accueillir"],
      }),
    );
    act(() => result.current.liste.validerElement());
    await waitFor(() => expect(mockModifier).toHaveBeenCalledTimes(3));
    expect(result.current.liste.enEdition).toBeNull();
    const valeur = result.current.valeur;
    if (valeur?.section !== "experiences") throw new Error("section inattendue");
    expect(valeur.valeur.map((e) => e.entreprise)).toEqual(["Lidl", "Carrefour"]);
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe("La photo : la changer, et la rendre plus pro", () => {
  const avecPhoto: Cv = { ...cv, photo: "https://s/actuelle.jpg" };

  beforeEach(() => {
    mockSection = "photo";
    mockLireMonCv.mockReset();
    mockModifier.mockReset();
    mockTeleverser.mockReset();
    mockAmeliorerActuelle.mockReset();
    mockChoisir.mockReset();
    mockRejouer.mockReset().mockReturnValue(false);
    mockModifier.mockImplementation((_c, contenu) =>
      Promise.resolve({
        ...cv,
        photo:
          contenu !== null && !Array.isArray(contenu) && contenu.chapitre === "photo"
            ? contenu.donnees.image
            : null,
      }),
    );
  });

  it("propose l'amélioration après le choix, compare, puis retient la retravaillée par son identifiant", async () => {
    mockLireMonCv.mockResolvedValue(cv);
    mockChoisir.mockResolvedValue("file:///nouvelle.jpg");
    mockTeleverser.mockResolvedValue({
      image: "https://s/retravaillee.jpg",
      imageId: "img_2",
      amelioree: true,
    });
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.photo.changer("galerie"));
    await waitFor(() =>
      expect(result.current.photo.etape).toEqual({
        nom: "amelioration",
        originale: "file:///nouvelle.jpg",
      }),
    );
    // Rien n'est parti : la décision est à la personne.
    expect(mockTeleverser).not.toHaveBeenCalled();

    act(() => result.current.photo.ameliorer(true));
    await waitFor(() => expect(result.current.photo.etape.nom).toBe("comparaison"));
    expect(mockTeleverser).toHaveBeenCalledWith("file:///nouvelle.jpg", true);
    expect(result.current.photo.etape).toMatchObject({
      origine: "nouvelle",
      originale: "file:///nouvelle.jpg",
      amelioree: "https://s/retravaillee.jpg",
      idAmelioree: "img_2",
    });

    act(() => result.current.photo.garder("amelioree"));
    await waitFor(() => expect(result.current.enregistrement).toBe("fait"));
    expect(mockModifier).toHaveBeenCalledWith("photo", {
      chapitre: "photo",
      donnees: { image: "https://s/retravaillee.jpg", imageId: "img_2" },
    });
    expect(result.current.photo.etape).toEqual({ nom: "repos" });
    expect(result.current.valeur).toEqual({
      section: "photo",
      valeur: { image: "https://s/retravaillee.jpg", imageId: null },
    });
  });

  it("garder l'originale d'une nouvelle photo l'envoie telle quelle ; refuser l'amélioration aussi", async () => {
    mockLireMonCv.mockResolvedValue(cv);
    mockChoisir.mockResolvedValue("file:///nouvelle.jpg");
    mockTeleverser.mockResolvedValue({
      image: "https://s/nouvelle.jpg",
      imageId: "img_1",
      amelioree: false,
    });
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.photo.changer("camera"));
    await waitFor(() => expect(result.current.photo.etape.nom).toBe("amelioration"));
    act(() => result.current.photo.ameliorer(false));
    await waitFor(() => expect(result.current.enregistrement).toBe("fait"));
    expect(mockTeleverser).toHaveBeenCalledWith("file:///nouvelle.jpg", false);
    expect(mockModifier).toHaveBeenCalledWith("photo", {
      chapitre: "photo",
      donnees: { image: "https://s/nouvelle.jpg", imageId: "img_1" },
    });
  });

  it("retravaille la photo déjà en place sans la rechoisir, et la garder ne demande rien", async () => {
    mockLireMonCv.mockResolvedValue(avecPhoto);
    mockAmeliorerActuelle.mockResolvedValue({
      image: "https://s/retravaillee.jpg",
      imageId: "img_9",
      amelioree: true,
    });
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.photo.ameliorerActuelle());
    await waitFor(() => expect(result.current.photo.etape.nom).toBe("comparaison"));
    expect(mockAmeliorerActuelle).toHaveBeenCalledTimes(1);
    expect(mockChoisir).not.toHaveBeenCalled();
    expect(result.current.photo.etape).toMatchObject({
      origine: "actuelle",
      originale: "https://s/actuelle.jpg",
      amelioree: "https://s/retravaillee.jpg",
    });

    act(() => result.current.photo.garder("originale"));
    expect(result.current.photo.etape).toEqual({ nom: "repos" });
    expect(mockModifier).not.toHaveBeenCalled();
    expect(mockTeleverser).not.toHaveBeenCalled();
  });

  it("dit avec des mots un refus du générateur et laisse l'originale", async () => {
    mockLireMonCv.mockResolvedValue(avecPhoto);
    mockAmeliorerActuelle.mockRejectedValue(
      new ErreurApi("Impossible d'améliorer", 422, "photo_enhance_refused"),
    );
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.photo.ameliorerActuelle());
    await waitFor(() => expect(result.current.photo.etape.nom).toBe("comparaison"));
    expect(result.current.photo.etape).toMatchObject({
      amelioree: null,
      idAmelioree: null,
    });
    expect(result.current.photo.probleme).toMatch(/une autre/);
    expect(result.current.photo.probleme).not.toMatch(/photo_enhance/);
    expect(result.current.photo.enCours).toBe(false);
  });

  it("sur un 403 d'accord IA, ouvre la feuille et rejoue le geste sans afficher d'erreur", async () => {
    mockLireMonCv.mockResolvedValue(avecPhoto);
    mockAmeliorerActuelle
      .mockRejectedValueOnce(new ErreurApi("accord", 403, "ai_consent_required"))
      .mockResolvedValueOnce({
        image: "https://s/retravaillee.jpg",
        imageId: "img_3",
        amelioree: true,
      });
    let rejeu: (() => void) | null = null;
    mockRejouer.mockImplementation((cause, usage, action) => {
      if (!(cause instanceof ErreurApi) || cause.raison !== "ai_consent_required")
        return false;
      expect(usage).toBe("photo_enhancement");
      rejeu = action;
      return true;
    });
    const { result } = renderHook(() => useModifierCv());
    await waitFor(() => expect(result.current.chargement).toBe(false));

    act(() => result.current.photo.ameliorerActuelle());
    await waitFor(() => expect(rejeu).not.toBeNull());
    expect(result.current.photo.etape).toEqual({ nom: "repos" });
    expect(result.current.photo.probleme).toBeNull();

    act(() => rejeu?.());
    await waitFor(() => expect(result.current.photo.etape.nom).toBe("comparaison"));
    expect(mockAmeliorerActuelle).toHaveBeenCalledTimes(2);
  });
});
