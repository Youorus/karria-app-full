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
 * ═══ Le serveur a le dernier mot, mais on ne l'attend pas ═══
 *
 * `services/validation-edition.ts` juge ce qu'on tape : une incohérence
 * (fin avant début, e-mail sans arobase) s'affiche tout de suite sous le
 * champ et **bloque** le bouton (`bloque`) ; un manque (prénom, entreprise)
 * ne s'affiche qu'à la première tentative d'enregistrement (`tentative`).
 * Le serveur revalide ensuite (`422 chapter_invalid`, avec `fields`) et ses
 * raisons reviennent sous les champs concernés, par-dessus les nôtres.
 *
 * Ouvrir cet écran compte comme une **vérification** de la section après un
 * import (`marquerVerifie`).
 *
 * ═══ La photo : la changer, et la rendre plus pro ═══
 *
 * Une photo prise ou choisie ne part pas tout de suite : Karria propose
 * d'abord de la retravailler (`etape: amelioration`) — la même promesse que
 * dans la création. Oui → `POST /cv/photo` avec `enhance`, puis l'originale
 * et la retravaillée côte à côte (`comparaison`) ; la retenue s'enregistre
 * (l'améliorée par son `imageId`, l'originale après un envoi sans
 * amélioration). Non → l'envoi direct, comme avant.
 *
 * La photo **déjà en place** se retravaille aussi, sans la rechoisir
 * (`POST /cv/me/photo/enhance`) : la comparaison montre la photo du CV et sa
 * version retravaillée ; garder l'originale ne demande rien au serveur, elle
 * n'a pas bougé.
 *
 * Chaque amélioration passe par l'accord sur l'IA (`useActionIa`) : la
 * feuille avant le premier geste, et le geste rejoué sur un
 * `403 ai_consent_required`. Un refus du générateur ou une panne se dit avec
 * des mots (`services/photo.ts`) et laisse l'originale, qui reste un très
 * bon choix.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import { ErreurApi } from "@/lib/http";

import {
  ameliorerPhotoActuelle,
  lireMonCv,
  modifierSection,
  televerserPhoto,
} from "../api/cv.api";
import {
  garderBrouillon,
  lireBrouillon,
  oublierBrouillon,
} from "../services/brouillons-edition";
import { messageDAmelioration } from "../services/photo";
import {
  estBloque,
  messagesDe,
  validerElement,
  validerSection,
} from "../services/validation-edition";
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

/**
 * Où en est le parcours de la photo.
 *
 * - `repos` : la photo du CV (ou aucune) et les gestes.
 * - `amelioration` : une nouvelle photo est choisie, pas encore envoyée ;
 *   Karria propose de la retravailler.
 * - `comparaison` : l'originale et la retravaillée (`null` si l'amélioration
 *   a échoué) ; `origine` dit si l'originale est la nouvelle photo (à
 *   envoyer si on la garde) ou celle déjà sur le CV (rien à faire).
 */
export type EtapePhoto =
  | { nom: "repos" }
  | { nom: "amelioration"; originale: string }
  | {
      nom: "comparaison";
      origine: "nouvelle" | "actuelle";
      originale: string;
      amelioree: string | null;
      /** L'identifiant serveur de la retravaillée, déjà en attente. */
      idAmelioree: string | null;
    };

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
  /** Erreurs par champ (clés françaises des types), les nôtres et celles du serveur. */
  erreursChamps: Record<string, string>;
  /** Vrai tant qu'une incohérence empêche d'enregistrer (le bouton est bloqué). */
  bloque: boolean;
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
    etape: EtapePhoto;
    changer: (source: "camera" | "galerie") => void;
    /** Étape `amelioration` : oui, Karria la retravaille ; non, elle part telle quelle. */
    ameliorer: (oui: boolean) => void;
    /** Étape `repos`, avec une photo : la retravailler sans la rechoisir. */
    ameliorerActuelle: () => void;
    /** Étape `comparaison` : laquelle on garde. */
    garder: (choix: "originale" | "amelioree") => void;
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
    // `links.0.url` → la ligne de lien (`liens.0.url`) ; `first_name` → le champ lui-même.
    const [premier = f.field, index, dernier] = f.field.split(".");
    const cle =
      premier === "links" && index !== undefined
        ? `liens.${index}.${dernier === "label" ? "libelle" : (dernier ?? "url")}`
        : (CHAMPS_SERVEUR[premier] ?? premier);
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
  const [erreursServeur, setErreursServeur] = useState<Record<string, string>>({});
  /** On a tenté d'enregistrer : les manques se montrent aussi. */
  const [tentative, setTentative] = useState(false);
  const [enEdition, setEnEdition] = useState<EditionElement | null>(null);
  const [photoEnCours, setPhotoEnCours] = useState(false);
  const [etapePhoto, setEtapePhoto] = useState<EtapePhoto>({ nom: "repos" });
  /** Ce qui a échoué autour de la photo — amélioration surtout. */
  const [problemePhoto, setProblemePhoto] = useState<string | null>(null);
  const choixPhoto = useChoixPhoto();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  // Le rejeu après l'accord passe par une référence : la fonction se cite
  // elle-même, et React refuse qu'une valeur soit lue avant sa déclaration.
  const rejouerAmelioration = useRef<(etape: EtapePhoto) => void>(() => undefined);
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

  // ── Ce qu'on juge nous-mêmes ──────────────────────────────────────────

  const erreursLocales = useMemo(() => {
    if (enEdition !== null) return validerElement(section, enEdition.valeur);
    if (valeur !== null && !enListe) return validerSection(valeur);
    return [];
  }, [enEdition, section, valeur, enListe]);
  const bloque = estBloque(erreursLocales);
  const erreursChamps = useMemo(
    () => ({
      ...messagesDe(erreursLocales, { avecRequis: tentative }),
      ...erreursServeur,
    }),
    [erreursLocales, tentative, erreursServeur],
  );

  const sauver = useCallback((v: ValeurSection, apres?: () => void) => {
    if (validerSection(v).length > 0) {
      setTentative(true);
      setEnregistrement("erreur");
      setProbleme("Corrige les champs signalés, puis réessaie.");
      return;
    }
    setEnregistrement("en-cours");
    setProbleme(null);
    setErreursServeur({});
    modifierSection(v.section, versContenu(v))
      .then((cv) => {
        if (!vivant.current) return;
        oublierBrouillon(v.section);
        setValeur(valeurDuCv(v.section, cv));
        setModifie(false);
        setRestaure(false);
        setTentative(false);
        setEnregistrement("fait");
        apres?.();
      })
      .catch((cause: unknown) => {
        console.warn("[karria] enregistrement du CV en échec", cause);
        if (!vivant.current) return;
        setErreursServeur(erreursDuServeur(cause));
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

  const validerElementEnEdition = useCallback(() => {
    if (enEdition === null) return;
    if (validerElement(section, enEdition.valeur).length > 0) {
      setTentative(true);
      return;
    }
    const liste = [...elements()];
    if (enEdition.index === null) liste.push(enEdition.valeur);
    else liste[enEdition.index] = enEdition.valeur;
    setTentative(false);
    setErreursServeur({});
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
        setEtapePhoto({ nom: "repos" });
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

  /** Une nouvelle photo part telle quelle, puis s'enregistre. */
  const envoyerNouvelle = useCallback(
    (uri: string) => {
      setPhotoEnCours(true);
      setProblemePhoto(null);
      televerserPhoto(uri, false)
        .then((envoyee) => {
          if (!vivant.current) return;
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
    [poserPhoto],
  );

  /**
   * L'amélioration : d'une nouvelle photo (envoi avec `enhance`) ou de celle
   * déjà sur le CV (`POST /cv/me/photo/enhance`). Les deux mènent à la
   * comparaison ; un échec y mène aussi, sans retravaillée, avec le mot qui
   * explique — sauf le 403 d'accord, qui ouvre la feuille et rejoue.
   */
  const ameliorerDepuis = useCallback(
    (depuis: EtapePhoto) => {
      const origine = depuis.nom === "amelioration" ? "nouvelle" : "actuelle";
      const originale =
        depuis.nom === "amelioration"
          ? depuis.originale
          : valeur?.section === "photo"
            ? valeur.valeur.image
            : null;
      if (originale === null || depuis.nom === "comparaison") return;
      setPhotoEnCours(true);
      setProblemePhoto(null);
      const appel =
        origine === "nouvelle"
          ? televerserPhoto(originale, true)
          : ameliorerPhotoActuelle();
      appel
        .then((r) => {
          if (!vivant.current) return;
          setEtapePhoto({
            nom: "comparaison",
            origine,
            originale,
            amelioree: r.image,
            idAmelioree: r.imageId,
          });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] amélioration de la photo en échec", cause);
          if (!vivant.current) return;
          if (
            rejouerSiConsentementRequis(cause, "photo_enhancement", () =>
              rejouerAmelioration.current(depuis),
            )
          ) {
            return;
          }
          setProblemePhoto(messageDAmelioration(cause));
          // L'originale reste un très bon choix : on la montre, seule.
          setEtapePhoto({
            nom: "comparaison",
            origine,
            originale,
            amelioree: null,
            idAmelioree: null,
          });
        })
        .finally(() => {
          if (vivant.current) setPhotoEnCours(false);
        });
    },
    [valeur, rejouerSiConsentementRequis],
  );
  useEffect(() => {
    rejouerAmelioration.current = ameliorerDepuis;
  }, [ameliorerDepuis]);

  const changerPhoto = useCallback(
    (source: "camera" | "galerie") => {
      setPhotoEnCours(true);
      setProblemePhoto(null);
      choixPhoto
        .choisir(source)
        .then((uri) => {
          if (!vivant.current) return;
          setPhotoEnCours(false);
          if (uri !== null) setEtapePhoto({ nom: "amelioration", originale: uri });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] choix de la photo en échec", cause);
          if (vivant.current) setPhotoEnCours(false);
        });
    },
    [choixPhoto],
  );

  const ameliorer = useCallback(
    (oui: boolean) => {
      if (etapePhoto.nom !== "amelioration") return;
      if (!oui) {
        envoyerNouvelle(etapePhoto.originale);
        return;
      }
      const depuis = etapePhoto;
      avecConsentement("photo_enhancement", () => ameliorerDepuis(depuis));
    },
    [etapePhoto, envoyerNouvelle, avecConsentement, ameliorerDepuis],
  );

  const ameliorerActuelle = useCallback(() => {
    if (etapePhoto.nom !== "repos" || valeur?.section !== "photo") return;
    if (valeur.valeur.image === null) return;
    avecConsentement("photo_enhancement", () => ameliorerDepuis({ nom: "repos" }));
  }, [etapePhoto, valeur, avecConsentement, ameliorerDepuis]);

  const garder = useCallback(
    (choix: "originale" | "amelioree") => {
      if (etapePhoto.nom !== "comparaison") return;
      setProblemePhoto(null);
      if (choix === "amelioree") {
        if (etapePhoto.amelioree === null || etapePhoto.idAmelioree === null) return;
        setPhotoEnCours(true);
        poserPhoto({ image: etapePhoto.amelioree, imageId: etapePhoto.idAmelioree });
        return;
      }
      if (etapePhoto.origine === "nouvelle") {
        envoyerNouvelle(etapePhoto.originale);
        return;
      }
      // La photo du CV n'a pas bougé : rien à enregistrer.
      setEtapePhoto({ nom: "repos" });
    },
    [etapePhoto, poserPhoto, envoyerNouvelle],
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
    bloque,
    changer,
    enregistrer,
    annuler,
    liste: {
      enEdition,
      ajouter: () => {
        setTentative(false);
        setErreursServeur({});
        setEnEdition({ index: null, valeur: elementVide(section) });
      },
      editer: (index) => {
        const element = elements()[index];
        if (element !== undefined) {
          setTentative(false);
          setErreursServeur({});
          setEnEdition({ index, valeur: element });
        }
      },
      supprimer: (index) => remplacerListe(elements().filter((_, i) => i !== index)),
      monter: (index) => deplacer(index, index - 1),
      descendre: (index) => deplacer(index, index + 1),
      changerElement: (v) =>
        setEnEdition((e) => (e === null ? null : { ...e, valeur: v })),
      validerElement: validerElementEnEdition,
      fermerElement: () => {
        setTentative(false);
        setErreursServeur({});
        setEnEdition(null);
      },
    },
    photo: {
      etape: etapePhoto,
      changer: changerPhoto,
      ameliorer,
      ameliorerActuelle,
      garder,
      retirer: () => {
        setPhotoEnCours(true);
        setProblemePhoto(null);
        poserPhoto({ image: null, imageId: null });
      },
      enCours: photoEnCours,
      probleme: choixPhoto.probleme ?? problemePhoto,
    },
  };
}
