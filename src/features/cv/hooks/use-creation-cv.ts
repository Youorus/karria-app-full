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
 * ═══ Rien ne se perd ═══
 *
 * Le brouillon vit sur le serveur, chapitre validé par chapitre validé :
 * on peut fermer l'application au milieu et reprendre au même endroit,
 * même sur un autre téléphone.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

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
import { useMicro } from "./use-micro";

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

export function useCreationCv(): CreationCv {
  const router = useRouter();
  const micro = useMicro();
  const photo = useChoixPhoto();
  const [brouillon, setBrouillon] = useState<Brouillon | null>(null);
  const [phase, setPhase] = useState<Phase>({ nom: "chargement" });
  const [texte, setTexte] = useState("");
  const [parole, setParole] = useState<string | null>(null);
  const [correctionDe, setCorrectionDe] = useState<Jet | null>(null);
  const [elements, setElements] = useState<Jet[]>([]);
  const [probleme, setProbleme] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);
  // Une réponse qui revient après qu'on a quitté l'écran ne doit plus
  // rien écrire.
  const vivant = useRef(true);

  useEffect(() => {
    vivant.current = true;
    ouvrirBrouillon()
      .then((b) => {
        if (!vivant.current) return;
        setBrouillon(b);
        setPhase(
          b.chapitreCourant === "photo" ? { nom: "photo-choix" } : { nom: "question" },
        );
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
  }, [tentative]);

  const cle: CleChapitre = brouillon?.chapitreCourant ?? "identity";
  const chapitre = DEFINITIONS[cle];

  /** Le brouillon a avancé : on passe au chapitre suivant, ou on finit. */
  const avancer = useCallback((b: Brouillon) => {
    setBrouillon(b);
    setElements([]);
    setCorrectionDe(null);
    setParole(null);
    setTexte("");
    const fini = CHAPITRES.every((c) =>
      ["valide", "passe"].includes(b.chapitres[c].statut),
    );
    if (!fini) {
      setPhase(
        b.chapitreCourant === "photo" ? { nom: "photo-choix" } : { nom: "question" },
      );
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
  }, []);

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

  const repondre = useCallback(
    (reponse: string) => {
      const propre = reponse.trim();
      if (propre === "") return;
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
          setTexte(propre);
          setProbleme(lisible(cause, "Je n'ai pas pu réfléchir à ta réponse. Réessaie."));
          setPhase({ nom: "question" });
        });
    },
    [cle, correctionDe],
  );

  const toucherSuggestion = useCallback(
    (s: string) => (veutPasser(s) ? passer() : repondre(s)),
    [passer, repondre],
  );

  const basculerMicro = useCallback(() => {
    if (phase.nom === "ecoute") {
      setPhase({ nom: "reflexion", reponse: "" });
      micro
        .arreter()
        .then((uri) =>
          uri === null
            ? Promise.reject(new Error("aucun enregistrement"))
            : transcrire(uri),
        )
        .then((entendu) => {
          if (vivant.current) repondre(entendu);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] transcription en échec", cause);
          if (!vivant.current) return;
          setProbleme("Je ne t'ai pas bien entendu. Réessaie, ou écris-moi.");
          setPhase({ nom: "question" });
        });
      return;
    }
    micro.demarrer().then((ok) => {
      if (ok && vivant.current) setPhase({ nom: "ecoute" });
    });
  }, [phase.nom, micro, repondre]);

  const valider = useCallback(() => {
    if (phase.nom !== "jet") return;
    if (chapitre.boucle) {
      setElements((e) => [...e, phase.jet]);
      setPhase({ nom: "encore" });
      return;
    }
    enregistrer(phase.jet);
  }, [phase, chapitre.boucle, enregistrer]);

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
    [enregistrer],
  );

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
    probleme: probleme ?? micro.probleme ?? photo.probleme,
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
        envoyerPhoto(phase.originale, oui);
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
    fermer: () => router.back(),
    recommencer: () => {
      setPhase({ nom: "chargement" });
      setTentative((t) => t + 1);
    },
  };
}
