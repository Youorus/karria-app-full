/**
 * Modifier une section du CV à la main.
 *
 * ═══ Une section par écran, la route dit laquelle ═══
 *
 * `/cv/modifier/contact`, `/cv/modifier/experiences`… Le hook charge le
 * CV, en tire la valeur de la section, et la rend typée par section
 * (`ValeurSection`) : l'écran n'a qu'à choisir le formulaire.
 *
 * ═══ Deux façons d'enregistrer ═══
 *
 * - Les **formulaires simples** (identité, coordonnées, à propos,
 *   compétences, intérêts) s'enregistrent d'un bouton : on relit, on
 *   touche « Enregistrer », on voit « Enregistré », on revient.
 * - Les **listes** (expériences, formations) s'enregistrent à chaque
 *   geste — ajouter, modifier, supprimer, déplacer — parce qu'un geste
 *   est déjà une décision, et qu'un « Enregistrer » oublié en bas d'une
 *   liste de six éléments perdrait tout. L'état « Enregistré » s'affiche
 *   à chaque fois ; une panne garde la liste à l'écran et propose de
 *   réessayer.
 *
 * ═══ Rien ne se perd en quittant ═══
 *
 * Chaque frappe d'un formulaire simple est gardée dans
 * `brouillons-edition.ts` ; revenir sur la section la restitue et le dit.
 * Enregistrer ou « Annuler » l'efface.
 *
 * ═══ Le serveur a le dernier mot ═══
 *
 * On vérifie le minimum avant d'envoyer (un prénom, un nom, un canal de
 * contact, un poste et une entreprise) pour que l'erreur apparaisse sous
 * le champ, mais c'est le serveur qui revalide (`422 chapter_invalid`,
 * avec `fields`) : ses raisons reviennent sous les champs concernés.
 *
 * Ouvrir cet écran compte comme une **vérification** de la section après un
 * import (`marquerVerifie`).
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { ErreurApi } from "@/lib/http";

import { lireMonCv, modifierSection, televerserPhoto } from "../api/cv.api";
import {
  garderBrouillon,
  lireBrouillon,
  oublierBrouillon,
} from "../services/brouillons-edition";
import { marquerVerifie } from "../services/verification";
import {
  CHAPITRES,
  type CleChapitre,
  type Competences,
  type Contact,
  type Cv,
  type Experience,
  type Formation,
  type Identite,
  type Interets,
  type Jet,
  type Photo,
  type Presentation,
} from "../types/cv.types";
import { useChoixPhoto } from "./use-choix-photo";

export type ValeurSection =
  | { section: "identity"; valeur: Identite }
  | { section: "contact"; valeur: Contact }
  | { section: "summary"; valeur: Presentation }
  | { section: "experiences"; valeur: Experience[] }
  | { section: "educations"; valeur: Formation[] }
  | { section: "skills"; valeur: Competences }
  | { section: "interests"; valeur: Interets }
  | { section: "photo"; valeur: Photo };

export type ValeurDe = ValeurSection["valeur"];
export type ElementListe = Experience | Formation;

export type Enregistrement = "repos" | "en-cours" | "fait" | "erreur";

export const TITRES: Record<CleChapitre, string> = {
  identity: "Identité",
  contact: "Coordonnées",
  summary: "À propos",
  experiences: "Expériences",
  educations: "Formations",
  skills: "Compétences et langues",
  interests: "Centres d'intérêt",
  photo: "Photo",
};

export const SECTIONS_EN_LISTE: readonly CleChapitre[] = ["experiences", "educations"];

export interface EditionElement {
  /** `null` : un nouvel élément. */
  index: number | null;
  valeur: ElementListe;
}

export interface ModifierCv {
  section: CleChapitre;
  titre: string;
  enListe: boolean;
  chargement: boolean;
  erreur: string | null;
  valeur: ValeurSection | null;
  /** Des saisies non enregistrées d'une visite précédente ont été restituées. */
  restaure: boolean;
  modifie: boolean;
  enregistrement: Enregistrement;
  probleme: string | null;
  /** Erreurs par champ (clés françaises des types). */
  erreursChamps: Record<string, string>;
  changer: (valeur: ValeurDe) => void;
  enregistrer: () => void;
  annuler: () => void;
  liste: {
    enEdition: EditionElement | null;
    ajouter: () => void;
    editer: (index: number) => void;
    supprimer: (index: number) => void;
    monter: (index: number) => void;
    descendre: (index: number) => void;
    changerElement: (valeur: ElementListe) => void;
    validerElement: () => void;
    fermerElement: () => void;
  };
  photo: {
    changer: (source: "camera" | "galerie") => void;
    retirer: () => void;
    enCours: boolean;
    probleme: string | null;
  };
}

function sectionDepuis(param: string | string[] | undefined): CleChapitre {
  const valeur = Array.isArray(param) ? param[0] : param;
  return CHAPITRES.find((c) => c === valeur) ?? "identity";
}

/** La valeur de la section, lue dans le CV. */
export function valeurDuCv(section: CleChapitre, cv: Cv): ValeurSection {
  switch (section) {
    case "identity":
      return { section, valeur: cv.identite ?? { prenom: "", nom: "", titre: null } };
    case "contact":
      return {
        section,
        valeur: cv.contact ?? { email: null, telephone: null, ville: null, liens: [] },
      };
    case "summary":
      return { section, valeur: { texte: cv.presentation ?? "" } };
    case "experiences":
      return { section, valeur: cv.experiences };
    case "educations":
      return { section, valeur: cv.formations };
    case "skills":
      return { section, valeur: { competences: cv.competences, langues: cv.langues } };
    case "interests":
      return { section, valeur: { interets: cv.interets } };
    case "photo":
      return { section, valeur: { image: cv.photo, imageId: null } };
  }
}

/** Ce qu'on envoie au serveur : un jet, une liste de jets, ou `null` (vider). */
export function versContenu(v: ValeurSection): Jet | Jet[] | null {
  switch (v.section) {
    case "identity":
      return { chapitre: "identity", donnees: v.valeur };
    case "contact":
      // Une ligne de lien laissée vide n'est pas un lien : on ne l'envoie pas.
      return {
        chapitre: "contact",
        donnees: {
          ...v.valeur,
          liens: v.valeur.liens.filter(
            (l) => l.libelle.trim() !== "" || l.url.trim() !== "",
          ),
        },
      };
    case "summary":
      return v.valeur.texte.trim() === ""
        ? null
        : { chapitre: "summary", donnees: { texte: v.valeur.texte.trim() } };
    case "experiences":
      return v.valeur.map((e) => ({ chapitre: "experiences", donnees: e }));
    case "educations":
      return v.valeur.map((f) => ({ chapitre: "educations", donnees: f }));
    case "skills":
      return { chapitre: "skills", donnees: v.valeur };
    case "interests":
      return { chapitre: "interests", donnees: v.valeur };
    case "photo":
      return { chapitre: "photo", donnees: v.valeur };
  }
}

/** Ce qui doit être là avant d'envoyer : l'erreur sous le champ, pas un 422. */
export function erreursLocales(v: ValeurSection): Record<string, string> {
  const erreurs: Record<string, string> = {};
  if (v.section === "identity") {
    if (v.valeur.prenom.trim() === "") erreurs.prenom = "Ton prénom est nécessaire.";
    if (v.valeur.nom.trim() === "") erreurs.nom = "Ton nom est nécessaire.";
  }
  if (v.section === "contact" && !v.valeur.email?.trim() && !v.valeur.telephone?.trim()) {
    erreurs.telephone = "Un téléphone ou un e-mail : il faut pouvoir te joindre.";
  }
  return erreurs;
}

/** Les noms de champs du serveur → ceux des formulaires. */
const CHAMPS_SERVEUR: Record<string, string> = {
  first_name: "prenom",
  last_name: "nom",
  headline: "titre",
  email: "email",
  phone: "telephone",
  city: "ville",
  links: "liens",
  summary: "texte",
  position: "poste",
  company: "entreprise",
  location: "lieu",
  start_date: "debut",
  end_date: "fin",
  degree: "diplome",
  school: "ecole",
};

function erreursDuServeur(cause: unknown): Record<string, string> {
  if (!(cause instanceof ErreurApi) || cause.raison !== "chapter_invalid") return {};
  const details = cause.details as
    { fields?: { field: string; reason: string }[] } | undefined;
  const erreurs: Record<string, string> = {};
  for (const f of details?.fields ?? []) {
    // `links.0.url` → le bloc des liens ; `first_name` → le champ lui-même.
    const premier = f.field.split(".")[0] ?? f.field;
    const dernier = f.field.split(".").pop() ?? f.field;
    const cle = premier === "links" ? "liens" : (CHAMPS_SERVEUR[dernier] ?? dernier);
    erreurs[cle] = f.reason;
  }
  return erreurs;
}

function elementVide(section: CleChapitre): ElementListe {
  return section === "experiences"
    ? {
        poste: "",
        entreprise: "",
        lieu: null,
        debut: null,
        fin: null,
        enCours: false,
        missions: [],
      }
    : { diplome: "", ecole: "", lieu: null, debut: null, fin: null, enCours: false };
}

function elementComplet(section: CleChapitre, e: ElementListe): Record<string, string> {
  const erreurs: Record<string, string> = {};
  if (section === "experiences" && "poste" in e) {
    if (e.poste.trim() === "") erreurs.poste = "Le poste est nécessaire.";
    if (e.entreprise.trim() === "") erreurs.entreprise = "L'entreprise est nécessaire.";
  }
  if (section === "educations" && "diplome" in e) {
    if (e.diplome.trim() === "") erreurs.diplome = "Le diplôme est nécessaire.";
    if (e.ecole.trim() === "") erreurs.ecole = "L'établissement est nécessaire.";
  }
  return erreurs;
}

function messageDEnregistrement(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau)
      return "Pas de connexion. Rien n'est perdu : réessaie quand le réseau sera là.";
    if (cause.raison === "chapter_invalid")
      return "Corrige les champs signalés, puis réessaie.";
    if (cause.raison === "cv_not_found")
      return "Ton CV n'existe plus : crée-le ou importe-le d'abord.";
  }
  return "L'enregistrement a échoué. Réessaie.";
}

export function useModifierCv(): ModifierCv {
  const router = useRouter();
  const { section: param } = useLocalSearchParams<{ section?: string }>();
  const section = sectionDepuis(param);
  const enListe = SECTIONS_EN_LISTE.includes(section);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [valeur, setValeur] = useState<ValeurSection | null>(null);
  const [restaure, setRestaure] = useState(false);
  const [modifie, setModifie] = useState(false);
  const [enregistrement, setEnregistrement] = useState<Enregistrement>("repos");
  const [probleme, setProbleme] = useState<string | null>(null);
  const [erreursChamps, setErreursChamps] = useState<Record<string, string>>({});
  const [enEdition, setEnEdition] = useState<EditionElement | null>(null);
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const choixPhoto = useChoixPhoto();
  const vivant = useRef(true);

  useEffect(() => {
    vivant.current = true;
    marquerVerifie(section);
    lireMonCv()
      .then((cv) => {
        if (!vivant.current) return;
        const lue = valeurDuCv(section, cv);
        const brouillon = enListe ? undefined : lireBrouillon<ValeurSection>(section);
        if (brouillon !== undefined && brouillon.section === section) {
          setValeur(brouillon);
          setRestaure(true);
          setModifie(true);
        } else {
          setValeur(lue);
        }
        setErreur(null);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] CV illisible avant modification", cause);
        if (vivant.current) {
          setErreur(
            cause instanceof ErreurApi && cause.estReseau
              ? "Pas de connexion. Réessaie quand le réseau sera là."
              : "Ton CV n'a pas pu être chargé.",
          );
        }
      })
      .finally(() => {
        if (vivant.current) setChargement(false);
      });
    return () => {
      vivant.current = false;
    };
  }, [section, enListe]);

  const sauver = useCallback((v: ValeurSection, apres?: () => void) => {
    const locales = erreursLocales(v);
    if (Object.keys(locales).length > 0) {
      setErreursChamps(locales);
      setEnregistrement("erreur");
      setProbleme("Corrige les champs signalés, puis réessaie.");
      return;
    }
    setEnregistrement("en-cours");
    setProbleme(null);
    setErreursChamps({});
    modifierSection(v.section, versContenu(v))
      .then((cv) => {
        if (!vivant.current) return;
        oublierBrouillon(v.section);
        setValeur(valeurDuCv(v.section, cv));
        setModifie(false);
        setRestaure(false);
        setEnregistrement("fait");
        apres?.();
      })
      .catch((cause: unknown) => {
        console.warn("[karria] enregistrement du CV en échec", cause);
        if (!vivant.current) return;
        setErreursChamps(erreursDuServeur(cause));
        setProbleme(messageDEnregistrement(cause));
        setEnregistrement("erreur");
      });
  }, []);

  const changer = useCallback(
    (nouvelle: ValeurDe) => {
      if (valeur === null) return;
      const suivante = { section: valeur.section, valeur: nouvelle } as ValeurSection;
      setValeur(suivante);
      setModifie(true);
      setEnregistrement("repos");
      if (!enListe) garderBrouillon(valeur.section, suivante);
    },
    [valeur, enListe],
  );

  const enregistrer = useCallback(() => {
    if (valeur === null) return;
    // Un formulaire simple revient au CV une fois « Enregistré » montré ;
    // une liste reste là, on continue d'y travailler.
    sauver(valeur, enListe ? undefined : () => setTimeout(() => router.back(), 650));
  }, [valeur, enListe, sauver, router]);

  const annuler = useCallback(() => {
    oublierBrouillon(section);
    router.back();
  }, [section, router]);

  // ── Les listes ────────────────────────────────────────────────────────

  const elements = useCallback((): ElementListe[] => {
    if (valeur === null) return [];
    if (valeur.section === "experiences" || valeur.section === "educations")
      return valeur.valeur;
    return [];
  }, [valeur]);

  const remplacerListe = useCallback(
    (liste: ElementListe[]) => {
      if (valeur === null) return;
      const suivante = { section: valeur.section, valeur: liste } as ValeurSection;
      setValeur(suivante);
      sauver(suivante);
    },
    [valeur, sauver],
  );

  const deplacer = useCallback(
    (index: number, vers: number) => {
      const liste = [...elements()];
      if (vers < 0 || vers >= liste.length) return;
      const [element] = liste.splice(index, 1);
      liste.splice(vers, 0, element);
      remplacerListe(liste);
    },
    [elements, remplacerListe],
  );

  const validerElement = useCallback(() => {
    if (enEdition === null) return;
    const erreurs = elementComplet(section, enEdition.valeur);
    if (Object.keys(erreurs).length > 0) {
      setErreursChamps(erreurs);
      return;
    }
    const liste = [...elements()];
    if (enEdition.index === null) liste.push(enEdition.valeur);
    else liste[enEdition.index] = enEdition.valeur;
    setErreursChamps({});
    setEnEdition(null);
    remplacerListe(liste);
  }, [enEdition, section, elements, remplacerListe]);

  // ── La photo ──────────────────────────────────────────────────────────

  const poserPhoto = useCallback((photo: Photo) => {
    setEnregistrement("en-cours");
    setProbleme(null);
    modifierSection("photo", { chapitre: "photo", donnees: photo })
      .then((cv) => {
        if (!vivant.current) return;
        setValeur(valeurDuCv("photo", cv));
        setEnregistrement("fait");
      })
      .catch((cause: unknown) => {
        console.warn("[karria] changement de photo en échec", cause);
        if (!vivant.current) return;
        setProbleme(messageDEnregistrement(cause));
        setEnregistrement("erreur");
      })
      .finally(() => {
        if (vivant.current) setPhotoEnCours(false);
      });
  }, []);

  const changerPhoto = useCallback(
    (source: "camera" | "galerie") => {
      setPhotoEnCours(true);
      choixPhoto
        .choisir(source)
        .then((uri) => {
          if (uri === null) {
            setPhotoEnCours(false);
            return null;
          }
          return televerserPhoto(uri, false);
        })
        .then((envoyee) => {
          if (envoyee === null || !vivant.current) return;
          poserPhoto({ image: envoyee.image, imageId: envoyee.imageId });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] envoi de la photo en échec", cause);
          if (!vivant.current) return;
          setPhotoEnCours(false);
          setProbleme(messageDEnregistrement(cause));
          setEnregistrement("erreur");
        });
    },
    [choixPhoto, poserPhoto],
  );

  return {
    section,
    titre: TITRES[section],
    enListe,
    chargement,
    erreur,
    valeur,
    restaure,
    modifie,
    enregistrement,
    probleme,
    erreursChamps,
    changer,
    enregistrer,
    annuler,
    liste: {
      enEdition,
      ajouter: () => {
        setErreursChamps({});
        setEnEdition({ index: null, valeur: elementVide(section) });
      },
      editer: (index) => {
        const element = elements()[index];
        if (element !== undefined) {
          setErreursChamps({});
          setEnEdition({ index, valeur: element });
        }
      },
      supprimer: (index) => remplacerListe(elements().filter((_, i) => i !== index)),
      monter: (index) => deplacer(index, index - 1),
      descendre: (index) => deplacer(index, index + 1),
      changerElement: (v) =>
        setEnEdition((e) => (e === null ? null : { ...e, valeur: v })),
      validerElement,
      fermerElement: () => {
        setErreursChamps({});
        setEnEdition(null);
      },
    },
    photo: {
      changer: changerPhoto,
      retirer: () => {
        setPhotoEnCours(true);
        poserPhoto({ image: null, imageId: null });
      },
      enCours: photoEnCours,
      probleme: choixPhoto.probleme,
    },
  };
}
