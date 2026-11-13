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
 * ═══ Le mode libre ═══
 *
 * `useFinaliser(true)` (route `/atelier/libre/finaliser`) : un seul export,
 * le brouillon libre de l'atelier (`CLE_BROUILLON_LIBRE`) dans le champ `cv`,
 * **sans** `dossier_id` — c'est l'entrée de « Mes CV ». Pas de lettre, pas
 * de question « As-tu candidaté ? » ; à la place, « Voir mes CV » ramène à
 * la liste, où la nouvelle entrée est. Le CV de base n'est pas touché.
 *
 * ═══ Télécharger ═══
 *
 * `services/telechargement.ts` : le fichier dans `cache/atelier/exports/`
 * sous son nom lisible, la feuille de partage du système, puis le fichier
 * supprimé. Les URL signées valent une heure.
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
 *
 * ═══ Deux annonces, deux moments ═══
 *
 * Une pendant la génération (`finaliser`), une autre une fois les documents
 * là, sous le score ATS et au-dessus des documents (`finaliser_score`) —
 * jamais au-dessus du bouton « Envoyer par e-mail ». Deux emplacements, deux
 * objets, deux impressions : on ne réutilise pas la première.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { lireMoi } from "@/features/auth/api/auth.api";
import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import type { UsageIa } from "@/features/auth/types/auth.types";
import { lireDossier } from "@/features/candidatures/api/candidatures.api";
import {
  dossierMemorise,
  memoriserDossier,
} from "@/features/candidatures/services/memoire-dossiers";
import type { Dossier } from "@/features/candidatures/types/candidatures.types";
import { lireMonCv } from "@/features/cv/api/cv.api";
import type { Cv } from "@/features/cv/types/cv.types";
import { lireMesModeles, lireModeles } from "@/features/modeles/api/modeles.api";
import type { Modele } from "@/features/modeles/types/modeles.types";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnonceEmplacement } from "@/features/publicite/hooks/use-annonce-emplacement";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import {
  envoyerExports,
  exporterCvDuDossier,
  exporterCvLibre,
  exporterLettre,
  lireModeleChoisi,
} from "../api/documents.api";
import { memoriserApercu } from "../services/apercus";
import {
  brouillonPrime,
  CLE_BROUILLON_LIBRE,
  lireBrouillonAtelier,
  versionDesBrouillons,
} from "../services/brouillon-atelier";
import { documentDeLettre } from "../services/lettre";
import { modeleDuDossier } from "../services/modele";
import {
  correctionDe,
  gainAtsSafe,
  messageDEnvoi,
  messageDExport,
  nomDeFichier,
  phraseAts,
  pointsAAmeliorer,
  TEXTES,
  type CorrectionAts,
} from "../services/presentation";
import { telechargerEtPartager, type Format } from "../services/telechargement";
import type { ControleAts, Export, ScoreAts } from "../types/atelier.types";

export type { Format };
export type Document = "cv" | "lettre";

export interface Telechargement {
  document: Document;
  format: Format;
}

export interface EcranFinaliser {
  libre: boolean;
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
  /** Pendant la génération. */
  annonce: NativeAd | null;
  /** Une fois les documents là : sous le score, au-dessus des documents. */
  annonceScore: NativeAd | null;
  telechargement: Telechargement | null;
  telecharger: (document: Document, format: Format) => void;
  corriger: (controle: ControleAts) => void;
  /** Les points que la version optimisée ferait gagner (0 sans score). */
  gain: number;
  /** Ce que le serveur a replié pour tenir sur une page ; vide sinon. */
  resserre: Record<string, number>;
  /** « Voir mon CV » / « Voir ma lettre » : l'aperçu plein écran. */
  voirApercu: (document: Document) => void;
  /** Revoir le CV dans un autre modèle : l'atelier, la feuille du modèle ouverte. */
  changerDeModele: () => void;
  /** Changer la couleur principale : l'atelier, la feuille « Quelle couleur ? » ouverte. */
  changerDeCouleur: () => void;
  /** La couleur d'origine du modèle exporté, si la galerie la connaît. */
  couleurOrigine: string | null;
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
  /** Libre : « Voir mes CV » — la liste, avec la nouvelle entrée. */
  terminer: () => void;
}

export function useFinaliser(libre = false): EcranFinaliser {
  const params = useLocalSearchParams<{ dossierId?: string }>();
  const dossierId = libre ? CLE_BROUILLON_LIBRE : (params.dossierId ?? "");
  const router = useRouter();
  const { pousser } = useNavigationUnique();
  // L'export porte le score ATS, expliqué par un modèle : le serveur exige
  // l'accord sur l'IA (`403 ai_consent_required`). Sans lui, la feuille
  // s'ouvre et la génération repart après « J'accepte et je continue ».
  const { rejouerSiConsentementRequis } = useActionIa();
  const usageIa: UsageIa = libre ? "cv_creation" : "application";

  const [dossier, setDossier] = useState<Dossier | null>(() =>
    dossierMemorise(dossierId),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [generation, setGeneration] = useState(true);
  const [optimisation, setOptimisation] = useState(false);
  const [exportCv, setExportCv] = useState<Export | null>(null);
  const [exportLettre, setExportLettre] = useState<Export | null>(null);
  /** Libre : le CV exporté, pour nommer les fichiers. */
  const [cvLibre, setCvLibre] = useState<Cv | null>(null);
  /** La galerie, pour la couleur d'origine du modèle exporté. */
  const [galerie, setGalerie] = useState<Modele[]>([]);
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
  const annonceScore = useAnnonceEmplacement(
    "finaliser_score",
    !generation && !optimisation && exportCv !== null,
  );

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

  /** Libre : le brouillon de l'atelier s'il est plus récent que le CV de
   *  base, sinon le CV de base ; le modèle du brouillon, sinon le choisi. */
  const genererLibre = useCallback(async (atsSafe: boolean) => {
    const [base, choisi, galerie, miens] = await Promise.all([
      lireMonCv(),
      lireModeleChoisi().catch(() => null),
      lireModeles().catch(() => [] as Modele[]),
      lireMesModeles().catch(() => new Set<string>()),
    ]);
    if (!vivant.current) return;
    setGalerie(galerie);
    if (base.vide) throw new ErreurApi(TEXTES.sansCvPhrase, 409, "cv_missing");
    const brouillon = lireBrouillonAtelier(CLE_BROUILLON_LIBRE);
    const reprise = brouillon !== null && brouillonPrime(brouillon, base.misAJour);
    const cv = reprise ? brouillon.cv : base;
    const gratuit = galerie.find((m) => !m.premium || miens.has(m.id));
    const modeleId =
      (reprise ? brouillon.modeleId : null) ?? choisi?.modeleId ?? gratuit?.id ?? null;
    if (modeleId === null) {
      throw new ErreurApi("Choisis un modèle dans l'atelier.", 404, "template_not_found");
    }
    modeleRef.current = modeleId;
    setCvLibre(cv);
    // La couleur : celle du brouillon repris, sinon celle du choix par défaut.
    // La couleur de ce CV seulement (brouillon) ; sinon celle d'origine du modèle.
    const couleur = (reprise ? brouillon.couleur : null) ?? null;
    const exporte = await exporterCvLibre({ cv, modeleId, atsSafe, couleur });
    if (!vivant.current) return;
    setExportCv(exporte);
    setExportLettre(null);
  }, []);

  const genererDossier = useCallback(
    async (atsSafe: boolean) => {
      const [lu, choisi, galerie, miens] = await Promise.all([
        lireDossier(dossierId),
        lireModeleChoisi().catch(() => null),
        lireModeles().catch(() => [] as Modele[]),
        lireMesModeles().catch(() => new Set<string>()),
      ]);
      if (!vivant.current) return;
      setGalerie(galerie);
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
      // Le dossier porte la couleur (elle survit au changement d'appareil) ;
      // le CV et la lettre partent avec la même.
      const couleur = lu.couleur;
      const [cv, lettre] = await Promise.all([
        exporterCvDuDossier({ cv: lu.cv, modeleId, dossierId, atsSafe, couleur }),
        lu.lettre === null
          ? Promise.resolve(null)
          : exporterLettre({
              lettre: documentDeLettre(lu, lu.lettre, lu.cv),
              modeleId,
              dossierId,
              couleur,
              // Le dossier retient aussi le style de lettre (ADR-0036).
              style: lu.styleLettre,
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

  const generer = libre ? genererLibre : genererDossier;

  const reessayer = useCallback(() => {
    setGeneration(true);
    setErreur(null);
    setTentative((t) => t + 1);
  }, []);

  // `generation` part à vrai, et « Réessayer » le remet avant de relancer :
  // l'effet ne pose aucun état lui-même.
  useEffect(() => {
    let actif = true;
    generer(false)
      .catch((cause: unknown) => {
        if (!actif) return;
        if (rejouerSiConsentementRequis(cause, usageIa, reessayer)) {
          // La feuille est ouverte par-dessus ; « Pas maintenant » laisse
          // ce mot et « Réessayer », qui la rouvre.
          setErreur(TEXTES.accordIaPourLeScore);
          return;
        }
        console.warn("[karria] génération des documents en échec", cause);
        setErreur(messageDExport(cause));
      })
      .finally(() => {
        if (actif) setGeneration(false);
      });
    return () => {
      actif = false;
    };
  }, [generer, tentative, rejouerSiConsentementRequis, usageIa, reessayer]);

  const optimiser = useCallback(() => {
    if (optimisation || generation) return;
    const geste = () => {
      setOptimisation(true);
      generer(true)
        .catch((cause: unknown) => {
          if (!vivant.current) return;
          if (rejouerSiConsentementRequis(cause, usageIa, geste)) return;
          console.warn("[karria] export optimisé en échec", cause);
          setErreur(messageDExport(cause));
        })
        .finally(() => {
          if (vivant.current) setOptimisation(false);
        });
    };
    geste();
  }, [optimisation, generation, generer, rejouerSiConsentementRequis, usageIa]);

  // ── Télécharger ────────────────────────────────────────────────────────

  const telecharger = useCallback(
    (document: Document, format: Format) => {
      const exporte = document === "cv" ? exportCv : exportLettre;
      const url = exporte === null ? null : format === "pdf" ? exporte.pdf : exporte.docx;
      const cv = libre ? cvLibre : (dossier?.cv ?? null);
      if (url === null || telechargement !== null || cv === null) return;
      setTelechargement({ document, format });
      const nom = nomDeFichier(
        document,
        `${cv.identite?.prenom ?? ""} ${cv.identite?.nom ?? ""}`.trim(),
        dossier?.offre.entreprise ?? null,
        format,
      );
      void (async () => {
        try {
          await telechargerEtPartager(url, nom, format);
          if (vivant.current && !libre) setQuestion(true);
        } catch (cause) {
          console.warn("[karria] téléchargement en échec", cause);
          if (vivant.current)
            setErreur("Le fichier n'a pas pu être enregistré. Réessaie dans un instant.");
        } finally {
          if (vivant.current) setTelechargement(null);
        }
      })();
    },
    [exportCv, exportLettre, telechargement, dossier, libre, cvLibre],
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
          if (!libre) setQuestion(true);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] envoi en échec", cause);
          if (vivant.current)
            setEnvoi((e) => ({ ...e, enCours: false, erreur: messageDEnvoi(cause) }));
        });
    },
    [exportCv, exportLettre, envoi.enCours, libre],
  );

  // ── « Je corrige » ─────────────────────────────────────────────────────

  const corriger = useCallback(
    (controle: ControleAts) => {
      const correction: CorrectionAts = correctionDe(controle.cle);
      if (correction.geste === "ats-safe") {
        optimiser();
        return;
      }
      // Sans dossier, « mots-clés » n'a pas de Karria à ouvrir : on va à l'à-propos.
      const geste =
        libre && correction.geste === "karria"
          ? ({ geste: "modifier", section: "summary" } as const)
          : correction;
      const cible =
        geste.geste === "modifier"
          ? geste.section === "contact"
            ? "contact.email"
            : "summary"
          : geste.geste;
      // L'atelier monte **au-dessus** : Finaliser reste dans la pile avec son
      // analyse, et « Finaliser » dans l'atelier y redescend (`retour`).
      if (libre)
        pousser({ pathname: "/atelier/libre", params: { cible, retour: "finaliser" } });
      else
        pousser({
          pathname: "/atelier/[dossierId]",
          params: { dossierId, cible, retour: "finaliser" },
        });
    },
    [optimiser, pousser, dossierId, libre],
  );

  const ouvrirAtelier = useCallback(
    (cible: "modele" | "couleur") => {
      if (libre)
        pousser({ pathname: "/atelier/libre", params: { cible, retour: "finaliser" } });
      else
        pousser({
          pathname: "/atelier/[dossierId]",
          params: { dossierId, cible, retour: "finaliser" },
        });
    },
    [pousser, dossierId, libre],
  );
  const changerDeModele = useCallback(() => ouvrirAtelier("modele"), [ouvrirAtelier]);
  const changerDeCouleur = useCallback(() => ouvrirAtelier("couleur"), [ouvrirAtelier]);

  // ── Le retour de l'atelier ─────────────────────────────────────────────
  // Finaliser reste dans la pile pendant qu'on corrige ; au retour, si le
  // brouillon a bougé, les documents se refont — sinon l'analyse reste.
  const versionVue = useRef(versionDesBrouillons());
  useFocusEffect(
    useCallback(() => {
      const version = versionDesBrouillons();
      if (version === versionVue.current) return;
      versionVue.current = version;
      reessayer();
    }, [reessayer]),
  );

  // ── « Voir mon CV » : l'aperçu plein écran ──────────────────────────────
  const voirApercu = useCallback(
    (document: Document) => {
      const exporte = document === "cv" ? exportCv : exportLettre;
      if (exporte === null) return;
      const cv = libre ? cvLibre : (dossier?.cv ?? null);
      const nom = `${cv?.identite?.prenom ?? ""} ${cv?.identite?.nom ?? ""}`.trim();
      const id = memoriserApercu({
        id: exporte.id,
        genre: exporte.genre,
        titre: document === "cv" ? "Mon CV" : "Ma lettre de motivation",
        pages: exporte.apercus,
        pdf: exporte.pdf,
        modele: exporte.modele?.libelle ?? null,
        complement: document === "cv" ? nom || null : (dossier?.offre.entreprise ?? null),
        retour: "Finaliser",
      });
      if (id !== null) pousser({ pathname: "/apercu-export", params: { id } });
    },
    [exportCv, exportLettre, dossier, cvLibre, libre, pousser],
  );

  const score = exportCv?.ats ?? null;
  const couleurOrigine =
    galerie.find((m) => m.id === exportCv?.modele?.id)?.couleur ?? null;

  return {
    libre,
    dossier,
    erreur,
    generation,
    optimisation,
    exportCv,
    exportLettre,
    score,
    phrase: score === null ? null : phraseAts(score.niveau),
    points: score === null ? [] : pointsAAmeliorer(score),
    gain: score === null ? 0 : gainAtsSafe(score),
    resserre: exportCv?.resserre ?? {},
    voirApercu,
    annonce,
    annonceScore,
    telechargement,
    telecharger,
    corriger,
    changerDeModele,
    changerDeCouleur,
    couleurOrigine,
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
    reessayer,
    retour: useCallback(() => {
      if (router.canGoBack()) router.back();
      else if (libre) pousser("/atelier/libre");
      else pousser({ pathname: "/atelier/[dossierId]", params: { dossierId } });
    }, [router, pousser, dossierId, libre]),
    // « Mes CV » est sous l'atelier dans la pile : on y redescend, et la
    // liste relue au focus montre la nouvelle entrée. Arrivé autrement
    // (lien), `dismissTo` y va quand même.
    terminer: useCallback(() => router.dismissTo("/cv/mes-cv"), [router]),
  };
}

export { TEXTES };
