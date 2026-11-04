/**
 * Importer un CV existant : choisir, envoyer, raconter ce qui a été lu,
 * puis mener au CV.
 *
 * ═══ Le déroulé ═══
 *
 * `choix` (le sélecteur est ouvert) → `lecture` (le fichier est chez
 * Karria, l'orbe travaille) → `notes` (les notes de lecture apparaissent
 * une à une) → `fini` (« Voir mon CV ») ; ou `erreur`, avec de quoi
 * réessayer le **même** fichier, en choisir un autre, ou créer de zéro.
 *
 * ═══ Les notes ne disent que le vrai ═══
 *
 * L'extraction est un seul appel au serveur (5 à 10 s mesurées) : il n'y a
 * rien d'honnête à dire pendant qu'il tourne, sinon ce qui part (« 2 pages
 * photographiées »). Les lignes viennent du **compte rendu réel** rendu par
 * le serveur (`lignesDeLecture`), révélées une à une une fois la réponse
 * arrivée — jamais d'une liste de phrases d'attente. Si Marc veut des
 * lignes pendant l'appel, c'est un flux côté serveur (voir
 * `karria_api_v2/docs/PLUS-TARD.md`).
 *
 * ═══ L'arrière-plan et le réseau lent ═══
 *
 * Le serveur écrit le CV avant de répondre : si l'app passe en arrière-plan
 * et que la réponse se perd (iOS coupe la requête), le CV est quand même
 * là. Au retour, une erreur réseau survenue pendant une lecture déclenche
 * une relecture de `GET /cv/me` : si le CV a changé depuis le départ, c'est
 * que l'import a abouti, et l'on raconte ce qu'il contient.
 *
 * ═══ L'accord sur l'IA, avant le sélecteur ═══
 *
 * Le fichier part chez un modèle tiers : la feuille de consentement se
 * montre avant de choisir (`useActionIa`) ; un `403 ai_consent_required`
 * du serveur la rouvre et rejoue l'envoi.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import { ErreurApi } from "@/lib/http";

import { importerCv, lireMonCv, type FichierCv } from "../api/cv.api";
import { lignesDeLecture, messageDImport } from "../services/import";
import { manquantsDuCv, marquerImporte } from "../services/verification";
import type { Cv, ResultatImport } from "../types/cv.types";
import {
  ChoixImpossible,
  useChoixFichiers,
  type SourceImport,
} from "./use-choix-fichiers";

export type PhaseImport =
  | { nom: "choix" }
  | { nom: "lecture"; fichiers: number; type: string }
  | { nom: "notes"; lignes: string[]; visibles: number; resultat: ResultatImport }
  | { nom: "fini"; resultat: ResultatImport }
  | { nom: "erreur"; message: string; fichiers: FichierCv[] | null };

/** Le temps entre deux notes : assez pour les lire, pas pour s'ennuyer. */
export const CADENCE_NOTES_MS = 900;
/** Le temps laissé à la feuille de consentement pour disparaître avant le sélecteur. */
export const DELAI_APRES_CONSENTEMENT_MS = 450;

export interface ImportCv {
  phase: PhaseImport;
  /** Ouvre la source et envoie ce qui est choisi. Rien ne part sans l'accord IA. */
  demarrer: (source: SourceImport) => void;
  /** Après une erreur : renvoyer les mêmes fichiers. */
  reessayer: () => void;
  /** Raccourcit la révélation : tout d'un coup. */
  toutVoir: () => void;
}

/** Le compte rendu d'un import retrouvé après coup, depuis le CV seul. */
function resultatDepuisLeCv(cv: Cv): ResultatImport {
  return {
    cv,
    source: { type: "", fichiers: 0, pages: null },
    retenus: {},
    ecartes: {},
    manquants: manquantsDuCv(cv),
  };
}

function typeLisible(fichiers: FichierCv[]): string {
  if (fichiers.length > 1) return `${fichiers.length} pages photographiées`;
  const type = fichiers[0]?.type ?? "";
  if (type === "application/pdf") return "Ton PDF";
  if (type.includes("wordprocessingml")) return "Ton document Word";
  if (type.startsWith("image/")) return "Ta photo";
  return "Ton fichier";
}

export function useImportCv(onRenonce: () => void): ImportCv {
  const [phase, setPhase] = useState<PhaseImport>({ nom: "choix" });
  const { choisir } = useChoixFichiers();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  const vivant = useRef(true);
  const depart = useRef<string | null>(null);
  const passeEnArrierePlan = useRef(false);
  const rejouer = useRef<(fichiers: FichierCv[]) => void>(() => undefined);
  const renonce = useRef(onRenonce);
  useEffect(() => {
    renonce.current = onRenonce;
  }, [onRenonce]);

  useEffect(() => {
    vivant.current = true;
    const abonnement = AppState.addEventListener("change", (etat) => {
      if (etat !== "active") passeEnArrierePlan.current = true;
    });
    return () => {
      vivant.current = false;
      abonnement.remove();
    };
  }, []);

  const raconter = useCallback((resultat: ResultatImport) => {
    marquerImporte();
    const lignes = lignesDeLecture(resultat);
    setPhase({ nom: "notes", lignes, visibles: 1, resultat });
  }, []);

  // Une note de plus à chaque battement, puis « fini ».
  useEffect(() => {
    if (phase.nom !== "notes") return;
    const minuterie = setTimeout(() => {
      if (!vivant.current) return;
      if (phase.visibles >= phase.lignes.length) {
        setPhase({ nom: "fini", resultat: phase.resultat });
      } else {
        setPhase({ ...phase, visibles: phase.visibles + 1 });
      }
    }, CADENCE_NOTES_MS);
    return () => clearTimeout(minuterie);
  }, [phase]);

  const retrouverApresCoupure = useCallback(async (): Promise<ResultatImport | null> => {
    // Le serveur écrit avant de répondre : si le CV a bougé depuis le
    // départ, l'import a abouti même si la réponse ne nous est pas parvenue.
    try {
      const cv = await lireMonCv();
      if (!cv.vide && depart.current !== null && cv.misAJour > depart.current) {
        return resultatDepuisLeCv(cv);
      }
    } catch (cause: unknown) {
      console.warn("[karria] relecture du CV après coupure en échec", cause);
    }
    return null;
  }, []);

  const envoyer = useCallback(
    (fichiers: FichierCv[]) => {
      depart.current = new Date().toISOString();
      passeEnArrierePlan.current = false;
      setPhase({
        nom: "lecture",
        fichiers: fichiers.length,
        type: typeLisible(fichiers),
      });
      importerCv(fichiers)
        .then((resultat) => {
          if (vivant.current) raconter(resultat);
        })
        .catch(async (cause: unknown) => {
          console.warn("[karria] import de CV en échec", cause);
          if (!vivant.current) return;
          if (
            rejouerSiConsentementRequis(cause, "cv_import", () =>
              rejouer.current(fichiers),
            )
          ) {
            return;
          }
          const coupure = cause instanceof ErreurApi && cause.estReseau;
          if (coupure && passeEnArrierePlan.current) {
            const retrouve = await retrouverApresCoupure();
            if (retrouve !== null && vivant.current) {
              raconter(retrouve);
              return;
            }
          }
          if (vivant.current) {
            setPhase({ nom: "erreur", message: messageDImport(cause), fichiers });
          }
        });
    },
    [raconter, rejouerSiConsentementRequis, retrouverApresCoupure],
  );

  useEffect(() => {
    rejouer.current = envoyer;
  }, [envoyer]);

  const choisirEtEnvoyer = useCallback(
    (source: SourceImport) => {
      setPhase({ nom: "choix" });
      choisir(source)
        .then((fichiers) => {
          if (!vivant.current) return;
          if (fichiers === null) {
            renonce.current();
            return;
          }
          envoyer(fichiers);
        })
        .catch((cause: unknown) => {
          if (!vivant.current) return;
          const message =
            cause instanceof ChoixImpossible
              ? cause.message
              : "Impossible d'ouvrir cette source.";
          setPhase({ nom: "erreur", message, fichiers: null });
        });
    },
    [choisir, envoyer],
  );

  const demarrer = useCallback(
    (source: SourceImport) => {
      // Un battement avant le sélecteur : quand la feuille de consentement
      // vient de se fermer, iOS refuse de présenter le sélecteur système
      // par-dessus une modale encore en train de disparaître — et la
      // promesse ne se résout jamais (constaté sur simulateur, 2026-11-04).
      avecConsentement("cv_import", () => {
        setTimeout(() => {
          if (vivant.current) choisirEtEnvoyer(source);
        }, DELAI_APRES_CONSENTEMENT_MS);
      });
    },
    [avecConsentement, choisirEtEnvoyer],
  );

  const reessayer = useCallback(() => {
    if (phase.nom === "erreur" && phase.fichiers !== null) envoyer(phase.fichiers);
  }, [phase, envoyer]);

  const toutVoir = useCallback(() => {
    if (phase.nom === "notes") setPhase({ nom: "fini", resultat: phase.resultat });
  }, [phase]);

  return { phase, demarrer, reessayer, toutVoir };
}
