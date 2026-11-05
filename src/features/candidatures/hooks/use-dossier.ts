/**
 * Le détail d'un dossier : l'offre figée, le CV adapté, la lettre, les
 * exports, et les gestes — « j'ai candidaté », l'atelier, supprimer.
 *
 * ═══ Relu tant que Karria travaille ═══
 *
 * Un dossier `en_cours` se relit toutes les deux secondes, comme le
 * contrat le prévoit, jusqu'à `faite` ou `echouee` ; l'écran le dit
 * (« Karria adapte ton CV… ») au lieu d'attendre en silence.
 *
 * ═══ L'offre existe-t-elle encore ? ═══
 *
 * L'offre du dossier est figée : elle se lit même si elle a quitté
 * l'index. Mais « Voir l'offre » doit mener quelque part de vrai : on
 * demande son détail au fil (`lireOffre`) ; un 404 veut dire qu'elle est
 * partie, et le lien ouvre alors la source (où postuler), ou rien.
 *
 * ═══ « J'ai candidaté » se dit ici, sans feuille ═══
 *
 * Le détail est l'endroit où l'on revient voir ce qu'on a fait : marquer
 * ou retirer se fait d'un toucher, avec la date, et une phrase le
 * confirme. La feuille « As-tu candidaté ? » est pour l'atelier, après un
 * export (`components/feuille-candidature.tsx`).
 *
 * ═══ L'atelier ═══
 *
 * « Continuer dans l'atelier » navigue vers `/atelier/[dossierId]`, la
 * route que l'atelier d'édition crée de son côté. Tant qu'elle n'existe
 * pas, expo-router affiche son écran « introuvable » : attendu.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import { lireOffre } from "@/features/offres/api/offres.api";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique, type Chemin } from "@/lib/navigation";

import {
  lireDossier,
  lireExportsDuDossier,
  marquerCandidate,
  retirerCandidate,
  supprimerDossier,
} from "../api/candidatures.api";
import { memoriserDossier, oublierDossier } from "../services/memoire-dossiers";
import {
  apercuDeLaLettre,
  apercuDuCv,
  etatDuDossier,
  TEXTES,
  type EtatLisible,
} from "../services/presentation";
import type { Dossier, ExportDossier } from "../types/candidatures.types";

/** La relecture pendant l'adaptation, comme le contrat le suggère. */
export const RELECTURE_MS = 2_000;
const DUREE_NOTE_MS = 3_000;

export type DocumentDuDossier = "cv" | "lettre";

export interface EcranDossier {
  dossier: Dossier | null;
  /** L'état en une phrase, et les aperçus des deux feuilles. */
  etat: EtatLisible | null;
  apercuCv: string[];
  apercuLettre: string[];
  chargement: boolean;
  erreur: string | null;
  exports: ExportDossier[];
  /** L'offre est encore dans l'index : « Voir l'offre » ouvre sa fiche. */
  offreDansLIndex: boolean | null;
  /** Le marquage « candidaté » part ou revient : le bouton attend. */
  enregistrement: boolean;
  /** « C'est noté. Bonne chance ! », quelques secondes. */
  note: string | null;
  maintenant: Date;
  marquerCandidate: () => void;
  retirerCandidate: () => void;
  ouvrirOffre: () => void;
  ouvrirDocument: (document: DocumentDuDossier) => void;
  ouvrirExport: (exporte: ExportDossier) => void;
  ouvrirAtelier: () => void;
  supprimer: () => void;
  recharger: () => void;
  retour: () => void;
}

function messageDe(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.statut === 404) return TEXTES.dossierIntrouvable;
    if (cause.estReseau) return TEXTES.erreurReseau;
  }
  return TEXTES.erreurDetail;
}

export function useDossier(): EcranDossier {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { pousser, remplacer } = useNavigationUnique();
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [exports, setExports] = useState<ExportDossier[]>([]);
  const [offreDansLIndex, setOffreDansLIndex] = useState<boolean | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());
  const enVol = useRef(false);

  const poser = useCallback((lu: Dossier) => {
    memoriserDossier(lu);
    setDossier(lu);
    setMaintenant(new Date());
  }, []);

  const charger = useCallback(() => {
    let vivant = true;
    lireDossier(id)
      .then((lu) => {
        if (!vivant) return;
        poser(lu);
        setErreur(null);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] dossier illisible", cause);
        if (vivant) setErreur(messageDe(cause));
      })
      .finally(() => {
        if (vivant) setChargement(false);
      });
    // Les exports et l'existence de l'offre : en parallèle, sans bloquer
    // l'écran, et sans message s'ils échouent — le dossier se lit sans eux.
    lireExportsDuDossier(id).then(
      (lus) => {
        if (vivant) setExports(lus);
      },
      (cause: unknown) => console.warn("[karria] exports du dossier illisibles", cause),
    );
    return () => {
      vivant = false;
    };
  }, [id, poser]);

  useFocusEffect(charger);

  // L'offre est-elle encore dans l'index ? Une fois le dossier lu.
  const offreId = dossier?.offre.id ?? null;
  useEffect(() => {
    if (offreId === null) return undefined;
    let vivant = true;
    lireOffre(offreId).then(
      () => {
        if (vivant) setOffreDansLIndex(true);
      },
      (cause: unknown) => {
        if (!vivant) return;
        if (cause instanceof ErreurApi && cause.statut === 404) setOffreDansLIndex(false);
        else console.warn("[karria] existence de l'offre inconnue", cause);
      },
    );
    return () => {
      vivant = false;
    };
  }, [offreId]);

  // Tant que Karria adapte : relecture toutes les deux secondes.
  const adaptation = dossier?.adaptation ?? null;
  useEffect(() => {
    if (adaptation !== "en_cours") return undefined;
    const minuterie = setInterval(() => {
      lireDossier(id).then(poser, (cause: unknown) =>
        console.warn("[karria] relecture du dossier échouée", cause),
      );
    }, RELECTURE_MS);
    return () => clearInterval(minuterie);
  }, [adaptation, id, poser]);

  useEffect(() => {
    if (note === null) return undefined;
    const minuterie = setTimeout(() => setNote(null), DUREE_NOTE_MS);
    return () => clearTimeout(minuterie);
  }, [note]);

  const basculer = useCallback(
    async (geste: (id: string) => Promise<Dossier>, phrase: string) => {
      if (enVol.current) return;
      enVol.current = true;
      setEnregistrement(true);
      try {
        poser(await geste(id));
        setNote(phrase);
      } catch (cause) {
        console.warn("[karria] candidature non marquée", cause);
        Alert.alert(
          "Ça n'a pas été enregistré",
          cause instanceof ErreurApi && cause.estReseau
            ? "Vérifie ta connexion, puis réessaie."
            : "Réessaie dans un instant.",
        );
      } finally {
        enVol.current = false;
        setEnregistrement(false);
      }
    },
    [id, poser],
  );

  const retour = useCallback(() => {
    if (router.canGoBack()) router.back();
    else remplacer("/dossiers");
  }, [router, remplacer]);

  const supprimer = useCallback(() => {
    Alert.alert(TEXTES.supprimerTitre, TEXTES.supprimerPhrase, [
      { text: TEXTES.annuler, style: "cancel" },
      {
        text: TEXTES.supprimer,
        style: "destructive",
        onPress: () => {
          supprimerDossier(id).then(
            () => {
              oublierDossier(id);
              retour();
            },
            (cause: unknown) => {
              console.warn("[karria] dossier non supprimé", cause);
              Alert.alert("Le dossier n'a pas été supprimé", "Réessaie dans un instant.");
            },
          );
        },
      },
    ]);
  }, [id, retour]);

  const ouvrirOffre = useCallback(() => {
    if (dossier === null) return;
    if (offreDansLIndex !== false) {
      pousser({ pathname: "/offre/[id]", params: { id: dossier.offre.id } });
      return;
    }
    const lien = dossier.offre.lienCandidature ?? dossier.offre.siteEntreprise;
    if (lien === null) return;
    WebBrowser.openBrowserAsync(lien).catch((cause: unknown) =>
      console.warn("[karria] source de l'offre non ouverte", cause),
    );
  }, [dossier, offreDansLIndex, pousser]);

  return {
    dossier,
    etat:
      dossier === null
        ? null
        : etatDuDossier(
            {
              statut: dossier.statut,
              adaptation: dossier.adaptation,
              propositionsEnAttente: dossier.propositions.filter(
                (p) => p.etat === "proposee",
              ).length,
              candidateLe: dossier.candidateLe,
            },
            maintenant,
          ),
    apercuCv: dossier === null ? [] : apercuDuCv(dossier),
    apercuLettre: dossier === null ? [] : apercuDeLaLettre(dossier),
    chargement,
    erreur,
    exports,
    offreDansLIndex,
    enregistrement,
    note,
    maintenant,
    marquerCandidate: useCallback(
      () => void basculer(marquerCandidate, TEXTES.noteCandidate),
      [basculer],
    ),
    retirerCandidate: useCallback(
      () => void basculer(retirerCandidate, TEXTES.noteRetiree),
      [basculer],
    ),
    ouvrirOffre,
    ouvrirDocument: useCallback(
      (document: DocumentDuDossier) =>
        pousser({ pathname: "/candidatures/[id]/lecture", params: { id, document } }),
      [pousser, id],
    ),
    ouvrirExport: useCallback((exporte: ExportDossier) => {
      const lien = exporte.pdf ?? exporte.docx;
      if (lien === null) return;
      WebBrowser.openBrowserAsync(lien).catch((cause: unknown) =>
        console.warn("[karria] export non ouvert", cause),
      );
    }, []),
    // La route de l'atelier est créée par l'atelier lui-même : le chemin est
    // écrit, pas typé — expo-router ne le connaît pas encore.
    ouvrirAtelier: useCallback(() => pousser(`/atelier/${id}` as Chemin), [pousser, id]),
    supprimer,
    recharger: useCallback(() => {
      setChargement(true);
      charger();
    }, [charger]),
    retour,
  };
}
