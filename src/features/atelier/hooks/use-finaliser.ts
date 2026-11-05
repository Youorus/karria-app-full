/**
 * Finaliser : exporter, lire le score ATS, télécharger, envoyer, et dire
 * si l'on a candidaté.
 *
 * ═══ Deux documents, deux exports ═══
 *
 * Le CV adapté (`POST /cv/me/generated-cvs` avec `cv` et `dossier_id`) et
 * la lettre (`POST /documents/letters/export`, `dossier_id`) partent
 * ensemble à l'ouverture, en parallèle. Le serveur met en page (PDF et
 * DOCX, 1 à 3 s chacun) : l'écran le dit, l'orbe tourne, une annonce
 * native occupe l'attente. Le score ATS est celui de **ce** CV.
 *
 * ═══ Télécharger ═══
 *
 * Le fichier est enregistré dans le cache (`expo-file-system`), sous son
 * nom lisible (« CV - Awa Diallo.pdf »), puis la feuille de partage du
 * système s'ouvre (`expo-sharing`) : Fichiers, AirDrop, Mail, WhatsApp —
 * c'est le téléphone qui décide où. Les URL signées valent une heure.
 *
 * ═══ Envoyer par e-mail ═══
 *
 * Les deux exports dans un seul e-mail (`POST /documents/exports/send`),
 * à l'adresse du compte (pré-remplie, `to: null`) ou à une autre, saisie
 * et confirmée visuellement. Les quotas du serveur (5 par jour, 2 par
 * adresse tierce) s'expliquent humainement (`messageDEnvoi`).
 *
 * ═══ Puis « As-tu candidaté ? » ═══
 *
 * Après un téléchargement ou un envoi réussi, la feuille du domaine
 * Candidatures : « Oui » marque le dossier et y renvoie.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useRef, useState } from "react";

import { lireMoi } from "@/features/auth/api/auth.api";
import { lireDossier } from "@/features/candidatures/api/candidatures.api";
import {
  dossierMemorise,
  memoriserDossier,
} from "@/features/candidatures/services/memoire-dossiers";
import type { Dossier } from "@/features/candidatures/types/candidatures.types";
import { lireMesModeles, lireModeles } from "@/features/modeles/api/modeles.api";
import type { Modele } from "@/features/modeles/types/modeles.types";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnonceEmplacement } from "@/features/publicite/hooks/use-annonce-emplacement";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique, type Chemin } from "@/lib/navigation";

import {
  envoyerExports,
  exporterCvDuDossier,
  exporterLettre,
  lireModeleChoisi,
} from "../api/documents.api";
import { lireBrouillonAtelier } from "../services/brouillon-atelier";
import { documentDeLettre } from "../services/lettre";
import { modeleDuDossier } from "../services/modele";
import {
  correctionDe,
  messageDEnvoi,
  messageDExport,
  nomDeFichier,
  phraseAts,
  pointsAAmeliorer,
  TEXTES,
  type CorrectionAts,
} from "../services/presentation";
import type { ControleAts, Export, ScoreAts } from "../types/atelier.types";

export type Format = "pdf" | "docx";
export type Document = "cv" | "lettre";

export interface Telechargement {
  document: Document;
  format: Format;
}

export interface EcranFinaliser {
  dossier: Dossier | null;
  erreur: string | null;
  /** Les documents se génèrent : l'attente. */
  generation: boolean;
  /** Une nouvelle génération « optimisée ATS » est en cours. */
  optimisation: boolean;
  exportCv: Export | null;
  exportLettre: Export | null;
  score: ScoreAts | null;
  phrase: string | null;
  points: ControleAts[];
  annonce: NativeAd | null;
  telechargement: Telechargement | null;
  telecharger: (document: Document, format: Format) => void;
  corriger: (controle: ControleAts) => void;
  optimiser: () => void;
  /** L'adresse du compte, pour la pré-remplir. */
  adresseDuCompte: string | null;
  envoi: {
    ouvert: boolean;
    enCours: boolean;
    erreur: string | null;
    fait: string | null;
  };
  ouvrirEnvoi: () => void;
  fermerEnvoi: () => void;
  envoyer: (a: string | null) => void;
  /** La feuille « As-tu candidaté ? ». */
  question: boolean;
  fermerQuestion: () => void;
  reessayer: () => void;
  retour: () => void;
}

const MIME: Record<Format, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const UTI: Record<Format, string> = {
  pdf: "com.adobe.pdf",
  docx: "org.openxmlformats.wordprocessingml.document",
};

export function useFinaliser(): EcranFinaliser {
  const { dossierId } = useLocalSearchParams<{ dossierId: string }>();
  const router = useRouter();
  const { pousser, remplacer } = useNavigationUnique();

  const [dossier, setDossier] = useState<Dossier | null>(() =>
    dossierMemorise(dossierId),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [generation, setGeneration] = useState(true);
  const [optimisation, setOptimisation] = useState(false);
  const [exportCv, setExportCv] = useState<Export | null>(null);
  const [exportLettre, setExportLettre] = useState<Export | null>(null);
  const [telechargement, setTelechargement] = useState<Telechargement | null>(null);
  const [adresseDuCompte, setAdresseDuCompte] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<EcranFinaliser["envoi"]>({
    ouvert: false,
    enCours: false,
    erreur: null,
    fait: null,
  });
  const [question, setQuestion] = useState(false);
  const [tentative, setTentative] = useState(0);
  const modeleRef = useRef<string | null>(null);
  const vivant = useRef(true);

  const annonce = useAnnonceEmplacement("finaliser", generation || optimisation);

  useEffect(() => {
    vivant.current = true;
    return () => {
      vivant.current = false;
    };
  }, []);

  useEffect(() => {
    lireMoi().then(
      (moi) => {
        if (vivant.current) setAdresseDuCompte(moi.email);
      },
      (cause: unknown) => console.warn("[karria] adresse du compte illisible", cause),
    );
  }, []);

  // ── La génération ──────────────────────────────────────────────────────

  const generer = useCallback(
    async (atsSafe: boolean) => {
      const [lu, choisi, galerie, miens] = await Promise.all([
        lireDossier(dossierId),
        lireModeleChoisi().catch(() => null),
        lireModeles().catch(() => [] as Modele[]),
        lireMesModeles().catch(() => new Set<string>()),
      ]);
      if (!vivant.current) return;
      memoriserDossier(lu);
      setDossier(lu);
      const modeleId = modeleDuDossier({
        dossier: lu,
        brouillonModeleId: lireBrouillonAtelier(dossierId)?.modeleId,
        choisi: choisi?.modeleId,
        galerie,
        possedes: miens,
      });
      if (modeleId === null) {
        throw new ErreurApi(
          "Choisis un modèle dans l'atelier.",
          404,
          "template_not_found",
        );
      }
      modeleRef.current = modeleId;
      const [cv, lettre] = await Promise.all([
        exporterCvDuDossier({ cv: lu.cv, modeleId, dossierId, atsSafe }),
        lu.lettre === null
          ? Promise.resolve(null)
          : exporterLettre({
              lettre: documentDeLettre(lu, lu.lettre, lu.cv),
              modeleId,
              dossierId,
            }).catch((cause: unknown) => {
              // Le CV compte d'abord : une lettre qui échoue se dit, ne bloque pas.
              console.warn("[karria] export de la lettre en échec", cause);
              return null;
            }),
      ]);
      if (!vivant.current) return;
      setExportCv(cv);
      setExportLettre(lettre);
    },
    [dossierId],
  );

  // `generation` part à vrai, et « Réessayer » le remet avant de relancer :
  // l'effet ne pose aucun état lui-même.
  useEffect(() => {
    let actif = true;
    generer(false)
      .catch((cause: unknown) => {
        console.warn("[karria] génération des documents en échec", cause);
        if (actif) setErreur(messageDExport(cause));
      })
      .finally(() => {
        if (actif) setGeneration(false);
      });
    return () => {
      actif = false;
    };
  }, [generer, tentative]);

  const optimiser = useCallback(() => {
    if (optimisation || generation) return;
    setOptimisation(true);
    generer(true)
      .catch((cause: unknown) => {
        console.warn("[karria] export optimisé en échec", cause);
        if (vivant.current) setErreur(messageDExport(cause));
      })
      .finally(() => {
        if (vivant.current) setOptimisation(false);
      });
  }, [optimisation, generation, generer]);

  // ── Télécharger ────────────────────────────────────────────────────────

  const telecharger = useCallback(
    (document: Document, format: Format) => {
      const exporte = document === "cv" ? exportCv : exportLettre;
      const url = exporte === null ? null : format === "pdf" ? exporte.pdf : exporte.docx;
      if (url === null || telechargement !== null || dossier === null) return;
      setTelechargement({ document, format });
      const nom = nomDeFichier(
        document,
        `${dossier.cv.identite?.prenom ?? ""} ${dossier.cv.identite?.nom ?? ""}`.trim(),
        dossier.offre.entreprise,
        format,
      );
      void (async () => {
        try {
          const destination = new File(Paths.cache, nom);
          if (destination.exists) destination.delete();
          const fichier = await File.downloadFileAsync(url, destination);
          if (!vivant.current) return;
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fichier.uri, {
              mimeType: MIME[format],
              UTI: UTI[format],
              dialogTitle: nom,
            });
          }
          if (vivant.current) setQuestion(true);
        } catch (cause) {
          console.warn("[karria] téléchargement en échec", cause);
          if (vivant.current)
            setErreur("Le fichier n'a pas pu être enregistré. Réessaie dans un instant.");
        } finally {
          if (vivant.current) setTelechargement(null);
        }
      })();
    },
    [exportCv, exportLettre, telechargement, dossier],
  );

  // ── Envoyer ────────────────────────────────────────────────────────────

  const envoyer = useCallback(
    (a: string | null) => {
      if (exportCv === null || envoi.enCours) return;
      const ids = [exportCv.id, ...(exportLettre === null ? [] : [exportLettre.id])];
      setEnvoi((e) => ({ ...e, enCours: true, erreur: null }));
      envoyerExports(ids, a)
        .then((fait) => {
          if (!vivant.current) return;
          setEnvoi({ ouvert: false, enCours: false, erreur: null, fait: fait.a });
          setQuestion(true);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] envoi en échec", cause);
          if (vivant.current)
            setEnvoi((e) => ({ ...e, enCours: false, erreur: messageDEnvoi(cause) }));
        });
    },
    [exportCv, exportLettre, envoi.enCours],
  );

  // ── « Je corrige » ─────────────────────────────────────────────────────

  const corriger = useCallback(
    (controle: ControleAts) => {
      const correction: CorrectionAts = correctionDe(controle.cle);
      if (correction.geste === "ats-safe") {
        optimiser();
        return;
      }
      const cible =
        correction.geste === "modifier"
          ? correction.section === "contact"
            ? "contact.email"
            : "summary"
          : correction.geste;
      remplacer({
        pathname: `/atelier/${dossierId}`,
        params: { cible },
      } as unknown as Chemin);
    },
    [optimiser, remplacer, dossierId],
  );

  const score = exportCv?.ats ?? null;

  return {
    dossier,
    erreur,
    generation,
    optimisation,
    exportCv,
    exportLettre,
    score,
    phrase: score === null ? null : phraseAts(score.niveau),
    points: score === null ? [] : pointsAAmeliorer(score),
    annonce,
    telechargement,
    telecharger,
    corriger,
    optimiser,
    adresseDuCompte,
    envoi,
    ouvrirEnvoi: useCallback(
      () => setEnvoi((e) => ({ ...e, ouvert: true, erreur: null })),
      [],
    ),
    fermerEnvoi: useCallback(() => setEnvoi((e) => ({ ...e, ouvert: false })), []),
    envoyer,
    question,
    fermerQuestion: useCallback(() => setQuestion(false), []),
    reessayer: useCallback(() => {
      setGeneration(true);
      setErreur(null);
      setTentative((t) => t + 1);
    }, []),
    retour: useCallback(() => {
      if (router.canGoBack()) router.back();
      else pousser(`/atelier/${dossierId}` as Chemin);
    }, [router, pousser, dossierId]),
  };
}

export { TEXTES };
