/**
 * L'atelier d'un dossier : la feuille en temps réel, et tout ce qui la fait bouger.
 *
 * ═══ Trois horloges, et pourquoi elles diffèrent ═══
 *
 * - **Tout de suite** : chaque modification patche le texte dans la page
 *   (`differences` → `feuille.patcher`). L'écran, c'est le CV ; il ne doit
 *   jamais être en retard sur le doigt.
 * - **Au repos, 400 ms** : la file de rendu redemande le HTML au serveur
 *   (`services/file-de-rendu.ts`) — fidélité, pagination, intitulé synthétisé.
 * - **En différé, 1,5 s** : `PUT /applications/{id}/cv`, puis la couverture
 *   des mots-clés relue dans le dossier rendu. On ne sauve pas à la frappe :
 *   un geste n'est pas une décision tant que le suivant arrive.
 *
 * ═══ Le CV local a raison pendant qu'on travaille ═══
 *
 * Le dossier rendu par le serveur (après un PUT, une décision, une
 * relecture) remplace la **couverture** et les **propositions** ; son `cv`
 * ne remplace le CV local que s'il résulte d'une décision de Karria ou de
 * l'adaptation — jamais après un PUT, qui ne fait que confirmer ce qu'on a
 * envoyé (un PUT répondu en retard écraserait les frappes suivantes).
 *
 * ═══ Reprise ═══
 *
 * Le brouillon local (`services/brouillon-atelier.ts`) prime s'il est plus
 * récent que la dernière écriture serveur ; sinon, le serveur. Le modèle :
 * celui du dossier, sinon celui du brouillon, sinon le modèle choisi de la
 * personne (`/user-templates/me/selected`), sinon le premier modèle gratuit.
 * Sans modèle enregistré sur le dossier (le contrat ne le met pas à jour
 * après la création), la feuille « Avec quel modèle ? » s'ouvre d'elle-même
 * à la première visite, une fois l'adaptation finie.
 *
 * ═══ Karria propose, la personne décide ═══
 *
 * L'intitulé et l'à-propos arrivent déjà appliqués (`acceptee`, `before`
 * conservé) : une note discrète le dit, « voir / revenir ». Le reste attend
 * (`proposee`). Chaque décision passe par le serveur, qui rend le dossier ;
 * avant, on **vide** la sauvegarde différée pour ne pas rejouer une
 * décision sur un CV périmé.
 *
 * ═══ Les références ═══
 *
 * `cvRef` et `modeleRef` doublent l'état pour les rappels qui vivent hors
 * du rendu (la file, les minuteries) ; elles ne s'écrivent **jamais pendant
 * le rendu**, seulement là où l'état change — c'est ce que le compilateur
 * React exige, et ce qui garde les deux en accord.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import {
  deciderProposition,
  lireDossier,
  modifierCvDuDossier,
  relancerAdaptation,
} from "@/features/candidatures/api/candidatures.api";
import {
  dossierMemorise,
  memoriserDossier,
} from "@/features/candidatures/services/memoire-dossiers";
import type {
  Decision,
  Dossier,
  Proposition,
} from "@/features/candidatures/types/candidatures.types";
import { lireMonCv } from "@/features/cv/api/cv.api";
import type { ValeurSection } from "@/features/cv/hooks/use-modifier-cv";
import type { Cv, Experience, Formation } from "@/features/cv/types/cv.types";
import { lireMesModeles, lireModeles } from "@/features/modeles/api/modeles.api";
import type { Modele } from "@/features/modeles/types/modeles.types";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnonceEmplacement } from "@/features/publicite/hooks/use-annonce-emplacement";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import { lireModeleChoisi, rendreCv } from "../api/documents.api";
import type { FeuilleCvHandle } from "../components/feuille-cv";
import {
  brouillonPrime,
  ecrireBrouillonAtelier,
  lireBrouillonAtelier,
} from "../services/brouillon-atelier";
import {
  cheminDeCible,
  cibleDuChemin,
  differences,
  type Cible,
} from "../services/chemins";
import { poserDossierEnCours } from "../services/dossier-en-cours";
import { cvAvecElement, cvAvecIntitule, cvAvecSection } from "../services/edition";
import { creerFileDeRendu } from "../services/file-de-rendu";
import {
  annuler as annulerH,
  historiqueDe,
  peutAnnuler,
  peutRetablir,
  pousser,
  retablir as retablirH,
  type Historique,
} from "../services/historique";
import {
  deplacerElement,
  elementsMasques,
  masquerElement,
  montrerElement,
  type RubriqueEnListe,
} from "../services/mise-en-avant";
import { messageDeRendu, TEXTES } from "../services/presentation";

/** La relecture pendant l'adaptation, comme le contrat le suggère. */
export const RELECTURE_MS = 2_000;
/** La sauvegarde différée : une frappe n'est pas une décision. */
export const DELAI_SAUVEGARDE_MS = 1_500;

export type FeuilleOuverte =
  | { type: "modifier"; cible: Cible | null }
  | { type: "karria" }
  | { type: "mise-en-avant" }
  | { type: "intitule" }
  | { type: "modele" };

export type Enregistrement = "repos" | "en-cours" | "fait" | "erreur";

export interface NoteKarria {
  texte: string;
  propositions: Proposition[];
}

export interface Atelier {
  dossier: Dossier | null;
  chargement: boolean;
  erreur: string | null;
  cv: Cv | null;
  cvDeBase: Cv | null;
  modeleId: string | null;
  modeles: Modele[];
  possedes: Set<string>;
  html: string | null;
  pages: number;
  renduEnCours: boolean;
  erreurRendu: string | null;
  avertissements: string[];
  /** La référence de rappel à poser sur `<FeuilleCv ref>` — jamais l'objet
   *  lui-même : un objet de référence rendu par un hook contamine tout ce qui
   *  l'accompagne aux yeux du compilateur React. */
  poserFeuille: (poignee: FeuilleCvHandle | null) => void;
  feuille: FeuilleOuverte | null;
  ouvrir: (feuille: FeuilleOuverte) => void;
  fermer: () => void;
  toucher: (chemin: string) => void;
  surPages: (pages: number | null) => void;
  cheminChoisi: string | null;
  enregistrement: Enregistrement;
  changerSection: (valeur: ValeurSection) => void;
  changerElement: (
    section: "experiences" | "educations",
    index: number,
    element: Experience | Formation,
  ) => void;
  changerIntitule: (titre: string) => void;
  /** Montre un texte sur la feuille sans rien retenir (à la frappe). */
  apercu: (chemin: string, texte: string) => void;
  annuler: () => void;
  retablir: () => void;
  peutAnnuler: boolean;
  peutRetablir: boolean;
  propositions: Proposition[];
  enAttente: number;
  decision: string | null;
  decider: (propositionId: string, decision: Decision) => void;
  toutAccepter: () => void;
  note: NoteKarria | null;
  fermerNote: () => void;
  relance: boolean;
  relancer: () => void;
  continuerALaMain: boolean;
  continuerSansKarria: () => void;
  annonce: NativeAd | null;
  choisirModele: (modeleId: string) => void;
  miseEnAvant: {
    deplacer: (rubrique: RubriqueEnListe, index: number, vers: number) => void;
    masquer: (rubrique: RubriqueEnListe, index: number) => void;
    montrer: (rubrique: RubriqueEnListe, cle: string) => void;
    masques: (rubrique: RubriqueEnListe) => ReturnType<typeof elementsMasques>;
  };
  allerALaLettre: () => void;
  allerAFinaliser: () => void;
  retour: () => void;
}

interface EntreeDeRendu {
  modeleId: string;
  cv: Cv;
}

function messageDe(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.statut === 404) return "Ce dossier n'existe plus.";
    if (cause.estReseau)
      return "Pas de connexion. L'atelier s'ouvrira dès que le réseau sera là.";
  }
  return "Ton dossier n'a pas pu être chargé.";
}

/** Les notes déjà fermées, pour la session : on ne la remontre pas à chaque retour. */
const notesFermees = new Set<string>();

function noteDe(dossier: Dossier): NoteKarria | null {
  if (notesFermees.has(dossier.id)) return null;
  const appliquees = dossier.propositions.filter(
    (p) =>
      p.etat === "acceptee" &&
      (p.chemin === "identity.headline" || p.chemin === "summary") &&
      p.avant !== p.apres,
  );
  if (appliquees.length === 0) return null;
  const intitule = appliquees.some((p) => p.chemin === "identity.headline");
  const apropos = appliquees.some((p) => p.chemin === "summary");
  return {
    texte:
      intitule && apropos
        ? TEXTES.noteLesDeuxMisAJour
        : intitule
          ? TEXTES.noteIntituleMisAJour
          : TEXTES.noteAProposMisAJour,
    propositions: appliquees,
  };
}

/** La feuille que l'adresse demande (« Je corrige » depuis Finaliser). */
function feuilleDemandeePar(cible: string | undefined): FeuilleOuverte | null {
  if (!cible) return null;
  if (cible === "karria" || cible === "mise-en-avant" || cible === "modele")
    return { type: cible };
  const c = cibleDuChemin(cible);
  return c === null ? null : { type: "modifier", cible: c };
}

export function useAtelier(): Atelier {
  const { dossierId, cible: cibleDemandee } = useLocalSearchParams<{
    dossierId: string;
    cible?: string;
  }>();
  const router = useRouter();
  const { pousser: pousserRoute } = useNavigationUnique();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();

  const [dossier, setDossier] = useState<Dossier | null>(() =>
    dossierMemorise(dossierId),
  );
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cvDeBase, setCvDeBase] = useState<Cv | null>(null);
  const [historique, setHistorique] = useState<Historique<Cv> | null>(null);
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [possedes, setPossedes] = useState<Set<string>>(new Set());
  const [html, setHtml] = useState<string | null>(null);
  const [pages, setPages] = useState(1);
  const [renduEnCours, setRenduEnCours] = useState(false);
  const [erreurRendu, setErreurRendu] = useState<string | null>(null);
  const [avertissements, setAvertissements] = useState<string[]>([]);
  const [feuille, setFeuille] = useState<FeuilleOuverte | null>(null);
  const [cheminChoisi, setCheminChoisi] = useState<string | null>(null);
  const [enregistrement, setEnregistrement] = useState<Enregistrement>("repos");
  const [decision, setDecision] = useState<string | null>(null);
  const [note, setNote] = useState<NoteKarria | null>(null);
  const [relance, setRelance] = useState(false);
  const [continuerALaMain, setContinuerALaMain] = useState(false);

  const feuilleCv = useRef<FeuilleCvHandle | null>(null);
  const cvRef = useRef<Cv | null>(null);
  const modeleRef = useRef<string | null>(null);
  const cheminRef = useRef<string | null>(null);
  const vivant = useRef(true);
  /** Vrai tant que la feuille du modèle doit s'ouvrir d'elle-même (première visite). */
  const premiereVisite = useRef(false);
  const feuilleDemandee = useRef<FeuilleOuverte | null>(
    feuilleDemandeePar(cibleDemandee),
  );
  const sauvegarde = useRef<{
    minuterie: ReturnType<typeof setTimeout> | null;
    cv: Cv | null;
  }>({ minuterie: null, cv: null });

  const cv = historique?.present ?? null;

  const annonce = useAnnonceEmplacement(
    "atelier_attente",
    dossier?.adaptation === "en_cours",
  );

  // ── La file de rendu, une pour la vie de l'écran ───────────────────────

  const [file] = useState(() =>
    creerFileDeRendu<EntreeDeRendu, Awaited<ReturnType<typeof rendreCv>>>({
      // Rien n'est livré après `arreter()` (au démontage) : pas besoin de
      // garde ici — et le compilateur React refuse une référence lue dans
      // un initialiseur.
      rendre: (e) => rendreCv(e.modeleId, e.cv),
      surResultat: (rendu) => {
        setHtml(rendu.html);
        setPages(rendu.pages);
        setAvertissements(rendu.avertissements);
        setErreurRendu(null);
      },
      surErreur: (cause) => {
        console.warn("[karria] rendu de la feuille en échec", cause);
        setErreurRendu(messageDeRendu(cause));
      },
      surActivite: setRenduEnCours,
    }),
  );

  useEffect(() => {
    vivant.current = true;
    poserDossierEnCours(dossierId);
    const s = sauvegarde.current;
    return () => {
      vivant.current = false;
      file.arreter();
      if (s.minuterie !== null) clearTimeout(s.minuterie);
    };
  }, [dossierId, file]);

  const rendre = useCallback(
    (immediat: boolean) => {
      const courant = cvRef.current;
      const modele = modeleRef.current;
      if (courant === null || modele === null) return;
      if (immediat) file.rendreMaintenant({ modeleId: modele, cv: courant });
      else file.demander({ modeleId: modele, cv: courant });
    },
    [file],
  );

  const poserDossier = useCallback((lu: Dossier) => {
    memoriserDossier(lu);
    setDossier(lu);
  }, []);

  /** Le CV que le serveur impose (adaptation finie, décision de Karria). */
  const poserCvDuServeur = useCallback((lu: Dossier) => {
    const courant = cvRef.current;
    if (courant !== null) feuilleCv.current?.patcher(differences(courant, lu.cv));
    cvRef.current = lu.cv;
    setHistorique((h) => (h === null ? historiqueDe(lu.cv) : pousser(h, lu.cv)));
    setNote(noteDe(lu));
  }, []);

  /** Ce qui s'ouvre une fois la feuille prête : ce que l'adresse demande,
   *  ou le choix du modèle à la première visite. */
  const ouvrirLaSuite = useCallback((lu: Dossier) => {
    const demandee = feuilleDemandee.current;
    feuilleDemandee.current = null;
    if (demandee !== null) {
      setFeuille(demandee);
      return;
    }
    if (premiereVisite.current && lu.modeleId === null) {
      premiereVisite.current = false;
      setFeuille({ type: "modele" });
    }
  }, []);

  // ── Le brouillon local ─────────────────────────────────────────────────

  const retenir = useCallback(
    (courant: Cv) => {
      ecrireBrouillonAtelier({
        dossierId,
        cv: courant,
        modeleId: modeleRef.current,
        dernierChemin: cheminRef.current,
        ecritLe: new Date().toISOString(),
      });
    },
    [dossierId],
  );

  // ── La sauvegarde différée ─────────────────────────────────────────────

  const sauverMaintenant = useCallback(async (): Promise<void> => {
    const s = sauvegarde.current;
    if (s.minuterie !== null) {
      clearTimeout(s.minuterie);
      s.minuterie = null;
    }
    const aSauver = s.cv;
    if (aSauver === null) return;
    s.cv = null;
    setEnregistrement("en-cours");
    try {
      const lu = await modifierCvDuDossier(dossierId, aSauver);
      if (!vivant.current) return;
      // Le CV local garde la main ; la couverture et les propositions suivent.
      poserDossier(lu);
      setEnregistrement("fait");
    } catch (cause) {
      console.warn("[karria] CV du dossier non enregistré", cause);
      if (!vivant.current) return;
      if (cause instanceof ErreurApi && cause.raison === "adaptation_in_progress") {
        // Karria travaille encore : on réessaiera quand elle aura fini.
        s.cv = aSauver;
        setEnregistrement("repos");
        return;
      }
      s.cv ??= aSauver;
      setEnregistrement("erreur");
    }
  }, [dossierId, poserDossier]);

  const planifierSauvegarde = useCallback(
    (courant: Cv) => {
      const s = sauvegarde.current;
      s.cv = courant;
      if (s.minuterie !== null) clearTimeout(s.minuterie);
      setEnregistrement("repos");
      s.minuterie = setTimeout(() => {
        s.minuterie = null;
        void sauverMaintenant();
      }, DELAI_SAUVEGARDE_MS);
    },
    [sauverMaintenant],
  );

  // ── Le chargement ──────────────────────────────────────────────────────

  useEffect(() => {
    let actif = true;
    Promise.all([
      lireDossier(dossierId),
      lireMonCv().catch((cause: unknown) => {
        console.warn("[karria] CV de base illisible", cause);
        return null;
      }),
      lireModeleChoisi().catch((cause: unknown) => {
        console.warn("[karria] modèle choisi illisible", cause);
        return null;
      }),
      lireModeles().catch((cause: unknown) => {
        console.warn("[karria] galerie illisible dans l'atelier", cause);
        return [] as Modele[];
      }),
      lireMesModeles().catch((cause: unknown) => {
        console.warn("[karria] modèles possédés illisibles", cause);
        return new Set<string>();
      }),
    ])
      .then(([lu, base, choisi, galerie, miens]) => {
        if (!actif) return;
        poserDossier(lu);
        setCvDeBase(base);
        setModeles(galerie);
        setPossedes(miens);
        const brouillon = lireBrouillonAtelier(dossierId);
        const reprise = brouillon !== null && brouillonPrime(brouillon, lu.modifieLe);
        const cvInitial = reprise ? brouillon.cv : lu.cv;
        cvRef.current = cvInitial;
        setHistorique(historiqueDe(cvInitial));
        const gratuits = galerie.filter((m) => !m.premium || miens.has(m.id));
        const modele =
          lu.modeleId ??
          brouillon?.modeleId ??
          choisi?.modeleId ??
          gratuits[0]?.id ??
          null;
        modeleRef.current = modele;
        setModeleId(modele);
        premiereVisite.current = lu.modeleId === null && brouillon === null;
        if (reprise && brouillon.dernierChemin !== null) {
          cheminRef.current = brouillon.dernierChemin;
          setCheminChoisi(brouillon.dernierChemin);
        }
        setNote(noteDe(lu));
        setErreur(null);
        if (lu.adaptation !== "en_cours") {
          rendre(true);
          ouvrirLaSuite(lu);
        }
      })
      .catch((cause: unknown) => {
        console.warn("[karria] atelier : dossier illisible", cause);
        if (actif) setErreur(messageDe(cause));
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, [dossierId, poserDossier, rendre, ouvrirLaSuite]);

  // Tant que Karria adapte : relecture toutes les deux secondes.
  const adaptation = dossier?.adaptation ?? null;
  useEffect(() => {
    if (adaptation !== "en_cours") return undefined;
    const minuterie = setInterval(() => {
      lireDossier(dossierId).then(
        (lu) => {
          if (!vivant.current) return;
          poserDossier(lu);
          if (lu.adaptation === "en_cours") return;
          // Karria a rejoué ses propositions sur nos retouches : son CV a raison.
          poserCvDuServeur(lu);
          rendre(true);
          ouvrirLaSuite(lu);
          // Ce qu'on n'avait pas pu enregistrer pendant qu'elle travaillait.
          if (lu.adaptation === "faite" && sauvegarde.current.cv !== null)
            void sauverMaintenant();
        },
        (cause: unknown) => console.warn("[karria] relecture du dossier échouée", cause),
      );
    }, RELECTURE_MS);
    return () => clearInterval(minuterie);
  }, [
    adaptation,
    dossierId,
    poserDossier,
    poserCvDuServeur,
    rendre,
    ouvrirLaSuite,
    sauverMaintenant,
  ]);

  // ── Changer le CV : patch, rendu, sauvegarde ───────────────────────────

  const appliquer = useCallback(
    (suivant: Cv) => {
      const courant = cvRef.current;
      if (courant === null) return;
      feuilleCv.current?.patcher(differences(courant, suivant));
      cvRef.current = suivant;
      setHistorique((h) => (h === null ? historiqueDe(suivant) : pousser(h, suivant)));
      rendre(false);
      planifierSauvegarde(suivant);
      retenir(suivant);
    },
    [rendre, planifierSauvegarde, retenir],
  );

  const remplacerDepuisHistorique = useCallback(
    (h: Historique<Cv>) => {
      const courant = cvRef.current;
      if (courant !== null) feuilleCv.current?.patcher(differences(courant, h.present));
      cvRef.current = h.present;
      setHistorique(h);
      rendre(false);
      planifierSauvegarde(h.present);
      retenir(h.present);
    },
    [rendre, planifierSauvegarde, retenir],
  );

  const annuler = useCallback(() => {
    if (historique === null || !peutAnnuler(historique)) return;
    remplacerDepuisHistorique(annulerH(historique));
  }, [historique, remplacerDepuisHistorique]);

  const retablir = useCallback(() => {
    if (historique === null || !peutRetablir(historique)) return;
    remplacerDepuisHistorique(retablirH(historique));
  }, [historique, remplacerDepuisHistorique]);

  // ── Karria ─────────────────────────────────────────────────────────────

  const poserDossierEtCv = useCallback(
    (lu: Dossier) => {
      poserDossier(lu);
      poserCvDuServeur(lu);
      rendre(false);
      retenir(lu.cv);
    },
    [poserDossier, poserCvDuServeur, rendre, retenir],
  );

  const decider = useCallback(
    (propositionId: string, choix: Decision) => {
      if (decision !== null) return;
      setDecision(propositionId);
      void (async () => {
        try {
          await sauverMaintenant();
          const lu = await deciderProposition(dossierId, propositionId, choix);
          if (vivant.current) poserDossierEtCv(lu);
        } catch (cause) {
          console.warn("[karria] décision non enregistrée", cause);
          if (!vivant.current) return;
          Alert.alert(
            "Ça n'a pas été appliqué",
            cause instanceof ErreurApi && cause.raison === "proposition_path_invalid"
              ? "Cet élément n'est plus dans ton CV."
              : cause instanceof ErreurApi
                ? cause.message
                : "Réessaie dans un instant.",
          );
        } finally {
          if (vivant.current) setDecision(null);
        }
      })();
    },
    [decision, dossierId, sauverMaintenant, poserDossierEtCv],
  );

  const toutAccepter = useCallback(() => {
    if (dossier === null || decision !== null) return;
    const aAccepter = dossier.propositions.filter((p) => p.etat === "proposee");
    if (aAccepter.length === 0) return;
    setDecision("toutes");
    void (async () => {
      try {
        await sauverMaintenant();
        let dernier: Dossier | null = null;
        for (const p of aAccepter) {
          dernier = await deciderProposition(dossierId, p.id, "accepter");
        }
        if (vivant.current && dernier !== null) poserDossierEtCv(dernier);
      } catch (cause) {
        console.warn("[karria] « tout accepter » interrompu", cause);
        if (vivant.current) {
          Alert.alert(
            "Une proposition n'a pas pu être appliquée",
            "Les autres le sont. Relis la liste.",
          );
          lireDossier(dossierId).then(poserDossierEtCv, () => undefined);
        }
      } finally {
        if (vivant.current) setDecision(null);
      }
    })();
  }, [dossier, decision, dossierId, sauverMaintenant, poserDossierEtCv]);

  const relancer = useCallback(() => {
    if (relance) return;
    const geste = () => {
      setRelance(true);
      relancerAdaptation(dossierId)
        .then((lu) => {
          if (!vivant.current) return;
          setContinuerALaMain(false);
          poserDossierEtCv(lu);
        })
        .catch((cause: unknown) => {
          if (!vivant.current) return;
          if (rejouerSiConsentementRequis(cause, "application", geste)) return;
          console.warn("[karria] adaptation non relancée", cause);
          Alert.alert(
            "Karria n'a pas pu relire",
            cause instanceof ErreurApi ? cause.message : "Réessaie dans un instant.",
          );
        })
        .finally(() => {
          if (vivant.current) setRelance(false);
        });
    };
    avecConsentement("application", geste);
  }, [
    relance,
    dossierId,
    poserDossierEtCv,
    avecConsentement,
    rejouerSiConsentementRequis,
  ]);

  const continuerSansKarria = useCallback(() => {
    setContinuerALaMain(true);
    rendre(true);
    if (dossier !== null) ouvrirLaSuite(dossier);
  }, [rendre, dossier, ouvrirLaSuite]);

  // ── Les gestes ─────────────────────────────────────────────────────────

  const choisirChemin = useCallback((chemin: string | null) => {
    cheminRef.current = chemin;
    setCheminChoisi(chemin);
  }, []);

  const toucher = useCallback(
    (chemin: string) => {
      choisirChemin(chemin);
      const cible = cibleDuChemin(chemin);
      if (cible !== null) setFeuille({ type: "modifier", cible });
    },
    [choisirChemin],
  );

  const ouvrir = useCallback(
    (f: FeuilleOuverte) => {
      if (f.type === "modifier" && f.cible !== null) {
        const chemin = cheminDeCible(f.cible);
        choisirChemin(chemin);
        feuilleCv.current?.choisir(chemin);
      }
      setFeuille(f);
    },
    [choisirChemin],
  );

  const fermer = useCallback(() => setFeuille(null), []);

  const changerSection = useCallback(
    (valeur: ValeurSection) => {
      const courant = cvRef.current;
      if (courant !== null) appliquer(cvAvecSection(courant, valeur));
    },
    [appliquer],
  );

  const changerElement = useCallback<Atelier["changerElement"]>(
    (section, index, element) => {
      const courant = cvRef.current;
      if (courant !== null) appliquer(cvAvecElement(courant, section, index, element));
    },
    [appliquer],
  );

  const changerIntitule = useCallback(
    (titre: string) => {
      const courant = cvRef.current;
      if (courant === null) return;
      choisirChemin("identity.headline");
      appliquer(cvAvecIntitule(courant, titre));
    },
    [appliquer, choisirChemin],
  );

  const choisirModele = useCallback(
    (id: string) => {
      modeleRef.current = id;
      setModeleId(id);
      setPossedes((p) => (p.has(id) ? p : new Set([...p, id])));
      rendre(true);
      const courant = cvRef.current;
      if (courant !== null) retenir(courant);
    },
    [rendre, retenir],
  );

  const miseEnAvant = useMemo<Atelier["miseEnAvant"]>(
    () => ({
      deplacer: (rubrique, index, vers) => {
        const courant = cvRef.current;
        if (courant === null) return;
        const suivant = deplacerElement(courant, rubrique, index, vers);
        if (suivant !== courant) appliquer(suivant);
      },
      masquer: (rubrique, index) => {
        const courant = cvRef.current;
        if (courant !== null) appliquer(masquerElement(courant, rubrique, index));
      },
      montrer: (rubrique, cle) => {
        const courant = cvRef.current;
        if (courant === null || cvDeBase === null) return;
        appliquer(montrerElement(cvDeBase, courant, rubrique, cle));
      },
      masques: (rubrique) =>
        cvDeBase === null || cv === null ? [] : elementsMasques(cvDeBase, cv, rubrique),
    }),
    [appliquer, cvDeBase, cv],
  );

  const fermerNote = useCallback(() => {
    notesFermees.add(dossierId);
    setNote(null);
  }, [dossierId]);

  useFocusEffect(
    useCallback(() => {
      // En partant vers la lettre ou Finaliser : ce qui traîne part.
      return () => {
        void sauverMaintenant();
      };
    }, [sauverMaintenant]),
  );

  const retour = useCallback(() => {
    void sauverMaintenant();
    if (router.canGoBack()) router.back();
    else router.replace("/dossiers");
  }, [router, sauverMaintenant]);

  const poserFeuille = useCallback((poignee: FeuilleCvHandle | null) => {
    feuilleCv.current = poignee;
  }, []);

  const apercu = useCallback((chemin: string, texte: string) => {
    feuilleCv.current?.patcher([{ chemin, texte }]);
  }, []);

  const surPages = useCallback((p: number | null) => {
    if (p !== null) setPages(p);
  }, []);

  const allerALaLettre = useCallback(() => {
    void sauverMaintenant();
    pousserRoute({ pathname: "/atelier/[dossierId]/lettre", params: { dossierId } });
  }, [sauverMaintenant, pousserRoute, dossierId]);

  const allerAFinaliser = useCallback(() => {
    void sauverMaintenant();
    pousserRoute({ pathname: "/atelier/[dossierId]/finaliser", params: { dossierId } });
  }, [sauverMaintenant, pousserRoute, dossierId]);

  return {
    dossier,
    chargement,
    erreur,
    cv,
    cvDeBase,
    modeleId,
    modeles,
    possedes,
    html,
    pages,
    renduEnCours,
    erreurRendu,
    avertissements,
    poserFeuille,
    feuille,
    ouvrir,
    fermer,
    toucher,
    surPages,
    cheminChoisi,
    enregistrement,
    changerSection,
    changerElement,
    changerIntitule,
    apercu,
    annuler,
    retablir,
    peutAnnuler: historique !== null && peutAnnuler(historique),
    peutRetablir: historique !== null && peutRetablir(historique),
    propositions: dossier?.propositions ?? [],
    enAttente: dossier?.propositions.filter((p) => p.etat === "proposee").length ?? 0,
    decision,
    decider,
    toutAccepter,
    note,
    fermerNote,
    relance,
    relancer,
    continuerALaMain,
    continuerSansKarria,
    annonce,
    choisirModele,
    miseEnAvant,
    allerALaLettre,
    allerAFinaliser,
    retour,
  };
}
