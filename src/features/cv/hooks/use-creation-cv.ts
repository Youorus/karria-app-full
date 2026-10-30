/**
 * La création du CV avec Karria : un chapitre à la fois.
 *
 * ═══ Le cycle d'un chapitre ═══
 *
 *   question ──(écrit ou voix)──▶ réflexion ──▶ jet ──▶ validé ✓
 *       ▲                                       │
 *       └──────────── corriger ◀────────────────┘
 *
 * La réponse part au serveur, qui en tire un premier jet au format du CV
 * (Gemini, à schéma imposé). L'utilisateur le valide tel quel, ou le
 * corrige : il redit ce qui ne va pas, et le jet à corriger repart avec
 * la nouvelle réponse — Karria corrige, il ne recommence pas de zéro.
 *
 * Les chapitres en boucle (expériences, formations) gardent leurs éléments
 * validés ici, puis les envoient ensemble quand on répond « non » à
 * « Une autre ? ». La photo a son propre petit parcours (oui/non, source,
 * amélioration proposée, choix).
 *
 * ═══ Les propositions d'un CV importé ═══
 *
 * Après « J'ai déjà un CV », le serveur pose dans le brouillon des
 * chapitres `en-cours` **avec** des données : ce que Karria a lu, pas
 * encore ce que l'utilisateur a dit. Un tel chapitre s'ouvre directement
 * sur son jet (« Voici ce que j'ai lu… »), à valider ou corriger comme
 * n'importe quelle réponse. Un chapitre en boucle fait défiler ses
 * propositions une à une (`aVenir`), puis demande « Une autre ? ». Rien
 * n'est compté comme fait tant que ce n'est pas validé : seule la
 * validation écrit dans le brouillon.
 *
 * ═══ L'accord sur l'IA, au premier geste qui en a besoin ═══
 *
 * Répondre (interprétation), dicter (transcription), améliorer la photo :
 * chacun part chez un modèle tiers. Avant le premier, la feuille de
 * consentement se montre (`useActionIa`) et le geste reprend après
 * « J'accepte et je continue ». Un `403 ai_consent_required` du serveur
 * fait pareil : la feuille, puis le geste rejoué.
 *
 * ═══ Rien ne se perd ═══
 *
 * Le brouillon vit sur le serveur, chapitre validé par chapitre validé :
 * on peut fermer l'application au milieu et reprendre au même endroit,
 * même sur un autre téléphone.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import { ErreurApi } from "@/lib/http";
import {
  finaliser,
  interpreter,
  ouvrirBrouillon,
  televerserPhoto,
  transcrire,
  validerChapitre,
} from "../api/cv.api";
import { DEFINITIONS, veutPasser, type DefinitionChapitre } from "../services/chapitres";
import { CHAPITRES, type Brouillon, type CleChapitre, type Jet } from "../types/cv.types";
import { useChoixPhoto } from "./use-choix-photo";
import { useImportCv } from "./use-import-cv";
import { useMicro } from "./use-micro";

const PAROLE_PROPOSITION = "Voici ce que j'ai lu dans ton CV. C'est bon, ou je corrige ?";
const PAROLE_PROPOSITION_SUIVANTE = "Et celle-ci, c'est bon ?";

export type Phase =
  | { nom: "chargement" }
  | { nom: "erreur"; message: string }
  | { nom: "question" }
  | { nom: "ecoute" }
  | { nom: "reflexion"; reponse: string }
  | { nom: "jet"; jet: Jet; relance: string | null }
  | { nom: "encore" }
  | { nom: "photo-choix" }
  | { nom: "photo-source" }
  | { nom: "photo-amelioration"; originale: string }
  | {
      nom: "photo-comparaison";
      originale: string;
      amelioree: string | null;
      /** L'identifiant serveur de l'améliorée, déjà téléversée. */
      idAmelioree: string | null;
    }
  | { nom: "envoi" }
  | { nom: "finalisation" }
  | { nom: "termine" };

export interface CreationCv {
  phase: Phase;
  chapitre: DefinitionChapitre;
  /** Les chapitres, pour la frise : fait, en cours, à venir. */
  progression: {
    cle: CleChapitre;
    titre: string;
    etat: "fait" | "courant" | "a-venir";
  }[];
  /** Ce que Karria dit au-dessus de la saisie (relance, recentrage). */
  parole: string;
  /** Vrai quand la réponse attendue corrige un jet. */
  enCorrection: boolean;
  /** Les éléments validés du chapitre en boucle. */
  elements: Jet[];
  /** Ce qui s'empile dans le mini-CV, dans l'ordre. */
  valides: Jet[];
  niveauMicro: number;
  probleme: string | null;
  texte: string;
  setTexte: (t: string) => void;
  envoyer: () => void;
  toucherSuggestion: (s: string) => void;
  basculerMicro: () => void;
  valider: () => void;
  corriger: () => void;
  passer: () => void;
  encore: (oui: boolean) => void;
  photo: {
    vouloir: (oui: boolean) => void;
    choisir: (source: "camera" | "galerie") => void;
    ameliorer: (oui: boolean) => void;
    garder: (image: string) => void;
  };
  /** « J'ai déjà un CV » : proposé tant que rien n'est validé. */
  importation: {
    possible: boolean;
    importer: () => void;
    enCours: boolean;
  };
  fermer: () => void;
  recommencer: () => void;
}

function lisible(cause: unknown, defaut: string): string {
  return cause instanceof ErreurApi && cause.message !== "" ? cause.message : defaut;
}

function jetsValides(brouillon: Brouillon): Jet[] {
  return CHAPITRES.flatMap((c) => {
    const ch = brouillon.chapitres[c];
    if (ch.statut !== "valide") return [];
    return ch.donnees !== null ? [ch.donnees] : ch.elements;
  });
}

/** Les propositions du chapitre courant — ce qu'un import y a posé sans
 *  le valider. Vide pour un chapitre qui attend une réponse. */
function propositions(brouillon: Brouillon): Jet[] {
  const ch = brouillon.chapitres[brouillon.chapitreCourant];
  if (ch.statut !== "en-cours") return [];
  return ch.donnees !== null ? [ch.donnees] : ch.elements;
}

function rienDeValide(brouillon: Brouillon | null): boolean {
  return (
    brouillon === null ||
    CHAPITRES.every((c) => !["valide", "passe"].includes(brouillon.chapitres[c].statut))
  );
}

export function useCreationCv(): CreationCv {
  const router = useRouter();
  const micro = useMicro();
  const photo = useChoixPhoto();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  // Les rejeux après l'accord passent par des références : chaque fonction se
  // cite elle-même, et React refuse qu'une valeur soit lue avant sa déclaration.
  const rejouerInterpretation = useRef<(propre: string) => void>(() => undefined);
  const rejouerTranscription = useRef<(uri: string) => void>(() => undefined);
  const rejouerPhoto = useRef<(image: string) => void>(() => undefined);
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [phase, setPhase] = useState<Phase>({ nom: "chargement" });
  const [texte, setTexte] = useState("");
  const [parole, setParole] = useState<string | null>(null);
  const [correctionDe, setCorrectionDe] = useState<Jet | null>(null);
  const [elements, setElements] = useState<Jet[]>([]);
  /** Les propositions d'un import qui attendent encore leur tour. */
  const [aVenir, setAVenir] = useState<Jet[]>([]);
  const [probleme, setProbleme] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);
  // Une réponse qui revient après qu'on a quitté l'écran ne doit plus
  // rien écrire.
  const vivant = useRef(true);

  /** Ouvre le chapitre courant d'un brouillon : sur sa question, sur la
   *  photo, ou sur la première proposition qu'un import y a laissée. */
  const ouvrirChapitre = useCallback((b: Brouillon) => {
    const [premiere, ...reste] = propositions(b);
    if (premiere !== undefined) {
      setAVenir(reste);
      setParole(PAROLE_PROPOSITION);
      setPhase({ nom: "jet", jet: premiere, relance: null });
      return;
    }
    setAVenir([]);
    setPhase(
      b.chapitreCourant === "photo" ? { nom: "photo-choix" } : { nom: "question" },
    );
  }, []);

  useEffect(() => {
    vivant.current = true;
    ouvrirBrouillon()
      .then((b) => {
        if (!vivant.current) return;
        setBrouillon(b);
        ouvrirChapitre(b);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] brouillon de CV introuvable", cause);
        if (vivant.current) {
          setPhase({
            nom: "erreur",
            message: lisible(cause, "Impossible d'ouvrir ton CV."),
          });
        }
      });
    return () => {
      vivant.current = false;
    };
  }, [tentative, ouvrirChapitre]);

  const cle: CleChapitre = brouillon?.chapitreCourant ?? "identity";
  const chapitre = DEFINITIONS[cle];

  /** Le brouillon a avancé : on passe au chapitre suivant, ou on finit. */
  const avancer = useCallback(
    (b: Brouillon) => {
      setBrouillon(b);
      setElements([]);
      setCorrectionDe(null);
      setParole(null);
      setTexte("");
      const fini = CHAPITRES.every((c) =>
        ["valide", "passe"].includes(b.chapitres[c].statut),
      );
      if (!fini) {
        ouvrirChapitre(b);
        return;
      }
      setPhase({ nom: "finalisation" });
      finaliser()
        .then(() => {
          if (vivant.current) setPhase({ nom: "termine" });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] finalisation du CV en échec", cause);
          if (vivant.current) {
            setPhase({
              nom: "erreur",
              message: lisible(cause, "Ton CV n'a pas pu être enregistré."),
            });
          }
        });
    },
    [ouvrirChapitre],
  );

  // Un CV importé depuis le parcours : le brouillon revient pré-rempli,
  // on le rouvre là où il en est — sur sa première proposition.
  const importCv = useImportCv(avancer);

  const enregistrer = useCallback(
    (contenu: Jet | Jet[] | null) => {
      setPhase({ nom: "envoi" });
      validerChapitre(cle, contenu)
        .then((b) => {
          if (vivant.current) avancer(b);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] chapitre non enregistré", cause);
          if (!vivant.current) return;
          setProbleme(lisible(cause, "Je n'ai pas pu enregistrer. Réessaie."));
          setPhase({ nom: "question" });
        });
    },
    [cle, avancer],
  );

  const passer = useCallback(() => {
    // Un chapitre en boucle déjà commencé se termine avec ses éléments ;
    // vide, il est passé.
    enregistrer(chapitre.boucle && elements.length > 0 ? elements : null);
  }, [chapitre.boucle, elements, enregistrer]);

  const interpreterLaReponse = useCallback(
    (propre: string) => {
      setTexte("");
      setProbleme(null);
      setPhase({ nom: "reflexion", reponse: propre });
      interpreter(cle, propre, correctionDe)
        .then((r) => {
          if (!vivant.current) return;
          if (r.jet === null) {
            setParole(r.relance ?? "Je n'ai pas bien compris. Tu peux reformuler ?");
            setPhase({ nom: "question" });
            return;
          }
          setCorrectionDe(null);
          setPhase({ nom: "jet", jet: r.jet, relance: r.relance });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] interprétation en échec", cause);
          if (!vivant.current) return;
          setPhase({ nom: "question" });
          if (
            rejouerSiConsentementRequis(cause, "cv_creation", () =>
              rejouerInterpretation.current(propre),
            )
          ) {
            return;
          }
          setTexte(propre);
          setProbleme(lisible(cause, "Je n'ai pas pu réfléchir à ta réponse. Réessaie."));
        });
    },
    [cle, correctionDe, rejouerSiConsentementRequis],
  );

  useEffect(() => {
    rejouerInterpretation.current = interpreterLaReponse;
  }, [interpreterLaReponse]);

  const repondre = useCallback(
    (reponse: string) => {
      const propre = reponse.trim();
      if (propre === "") return;
      avecConsentement("cv_creation", () => interpreterLaReponse(propre));
    },
    [avecConsentement, interpreterLaReponse],
  );

  const toucherSuggestion = useCallback(
    (s: string) => (veutPasser(s) ? passer() : repondre(s)),
    [passer, repondre],
  );

  const transcrireEtRepondre = useCallback(
    (uri: string) => {
      setPhase({ nom: "reflexion", reponse: "" });
      transcrire(uri)
        .then((entendu) => {
          if (vivant.current) repondre(entendu);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] transcription en échec", cause);
          if (!vivant.current) return;
          setPhase({ nom: "question" });
          if (
            rejouerSiConsentementRequis(cause, "transcription", () =>
              rejouerTranscription.current(uri),
            )
          ) {
            return;
          }
          setProbleme("Je ne t'ai pas bien entendu. Réessaie, ou écris-moi.");
        });
    },
    [repondre, rejouerSiConsentementRequis],
  );

  useEffect(() => {
    rejouerTranscription.current = transcrireEtRepondre;
  }, [transcrireEtRepondre]);

  const basculerMicro = useCallback(() => {
    if (phase.nom === "ecoute") {
      setPhase({ nom: "reflexion", reponse: "" });
      micro.arreter().then((uri) => {
        if (!vivant.current) return;
        if (uri === null) {
          setProbleme("Je ne t'ai pas bien entendu. Réessaie, ou écris-moi.");
          setPhase({ nom: "question" });
          return;
        }
        transcrireEtRepondre(uri);
      });
      return;
    }
    // L'accord d'abord, le micro ensuite : on ne fait pas parler quelqu'un
    // pour lui dire après que sa voix ne partira pas.
    avecConsentement("transcription", () => {
      micro.demarrer().then((ok) => {
        if (ok && vivant.current) setPhase({ nom: "ecoute" });
      });
    });
  }, [phase.nom, micro, transcrireEtRepondre, avecConsentement]);

  const valider = useCallback(() => {
    if (phase.nom !== "jet") return;
    if (chapitre.boucle) {
      setElements((e) => [...e, phase.jet]);
      const [suivante, ...reste] = aVenir;
      if (suivante !== undefined) {
        // Une proposition de l'import attend encore : on la montre avant
        // de demander « Une autre ? ».
        setAVenir(reste);
        setParole(PAROLE_PROPOSITION_SUIVANTE);
        setPhase({ nom: "jet", jet: suivante, relance: null });
        return;
      }
      setPhase({ nom: "encore" });
      return;
    }
    enregistrer(phase.jet);
  }, [phase, chapitre.boucle, aVenir, enregistrer]);

  const corriger = useCallback(() => {
    if (phase.nom !== "jet") return;
    setCorrectionDe(phase.jet);
    setParole("D'accord. Dis-moi ce qui ne va pas, je corrige.");
    setPhase({ nom: "question" });
  }, [phase]);

  const encore = useCallback(
    (oui: boolean) => {
      if (oui) {
        setParole(chapitre.encore ?? null);
        setPhase({ nom: "question" });
        return;
      }
      enregistrer(elements);
    },
    [chapitre.encore, elements, enregistrer],
  );

  const envoyerPhoto = useCallback(
    (image: string, ameliorer: boolean) => {
      setPhase({ nom: "envoi" });
      televerserPhoto(image, ameliorer)
        .then((r) => {
          if (!vivant.current) return;
          if (ameliorer) {
            setPhase({
              nom: "photo-comparaison",
              originale: image,
              amelioree: r.image,
              idAmelioree: r.imageId,
            });
            return;
          }
          enregistrer({
            chapitre: "photo",
            donnees: { image: r.image, imageId: r.imageId },
          });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] photo non envoyée", cause);
          if (!vivant.current) return;
          if (
            ameliorer &&
            rejouerSiConsentementRequis(cause, "photo_enhancement", () =>
              rejouerPhoto.current(image),
            )
          ) {
            setPhase({ nom: "photo-amelioration", originale: image });
            return;
          }
          if (ameliorer) {
            // L'amélioration a échoué : l'originale reste un très bon choix.
            setProbleme(lisible(cause, "Je n'ai pas pu améliorer ta photo."));
            setPhase({
              nom: "photo-comparaison",
              originale: image,
              amelioree: null,
              idAmelioree: null,
            });
            return;
          }
          setProbleme(lisible(cause, "Ta photo n'a pas pu être envoyée."));
          setPhase({ nom: "photo-source" });
        });
    },
    [enregistrer, rejouerSiConsentementRequis],
  );
  useEffect(() => {
    rejouerPhoto.current = (image) => envoyerPhoto(image, true);
  }, [envoyerPhoto]);

  return {
    phase,
    chapitre,
    progression: CHAPITRES.map((c) => ({
      cle: c,
      titre: DEFINITIONS[c].titre,
      etat:
        c === cle
          ? "courant"
          : brouillon !== null &&
              ["valide", "passe"].includes(brouillon.chapitres[c].statut)
            ? "fait"
            : "a-venir",
    })),
    parole: parole ?? chapitre.question,
    enCorrection: correctionDe !== null,
    elements,
    valides: brouillon === null ? [] : [...jetsValides(brouillon), ...elements],
    niveauMicro: micro.niveau,
    probleme: probleme ?? micro.probleme ?? photo.probleme ?? importCv.probleme,
    texte,
    setTexte,
    envoyer: () => repondre(texte),
    toucherSuggestion,
    basculerMicro,
    valider,
    corriger,
    passer,
    encore,
    photo: {
      vouloir: (oui) => {
        if (oui) {
          setParole("Super. Tu la prends maintenant, ou tu en choisis une ?");
          setPhase({ nom: "photo-source" });
          return;
        }
        enregistrer({ chapitre: "photo", donnees: { image: null, imageId: null } });
      },
      choisir: (source) => {
        photo.choisir(source).then((image) => {
          if (image !== null && vivant.current) {
            setProbleme(null);
            setPhase({ nom: "photo-amelioration", originale: image });
          }
        });
      },
      ameliorer: (oui) => {
        if (phase.nom !== "photo-amelioration") return;
        const { originale } = phase;
        if (!oui) {
          envoyerPhoto(originale, false);
          return;
        }
        avecConsentement("photo_enhancement", () => envoyerPhoto(originale, true));
      },
      garder: (image) => {
        if (phase.nom !== "photo-comparaison") return;
        // L'améliorée est déjà sur le serveur ; l'originale, pas encore.
        if (image === phase.amelioree && phase.idAmelioree !== null) {
          enregistrer({
            chapitre: "photo",
            donnees: { image, imageId: phase.idAmelioree },
          });
        } else {
          envoyerPhoto(image, false);
        }
      },
    },
    importation: {
      possible:
        phase.nom === "question" && correctionDe === null && rienDeValide(brouillon),
      importer: importCv.importer,
      enCours: importCv.enCours,
    },
    fermer: () => router.back(),
    recommencer: () => {
      setPhase({ nom: "chargement" });
      setTentative((t) => t + 1);
    },
  };
}
