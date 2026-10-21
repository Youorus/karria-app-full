/**
 * Le détail d'une offre : l'offre, son analyse, et les actions.
 *
 * ═══ L'analyse se génère à la demande, comme dans la V1 ═══
 *
 * L'API ne résume pas toutes les offres d'avance — ce serait payer une
 * génération pour des offres que personne n'ouvre. À l'ouverture :
 *
 * 1. on lit `summary-status` ;
 * 2. pas encore d'analyse (`missing`, ou `not_available` à la première
 *    lecture : c'est ainsi que la V1 dit « personne ne l'a demandée ») →
 *    on demande la génération (`POST …/summary`), comme la V1 ;
 * 3. tant que c'est `pending`, on relit toutes les 2,5 secondes, comme
 *    la V1 ;
 * 4. `ready` → l'analyse s'affiche, découpée en sections comme la V1 ;
 *    `not_available` **après** la demande → « Analyse non disponible »
 *    (la génération a échoué) ; une panne → l'état
 *    d'erreur de la V1.
 *
 * ═══ Le signet attend le serveur ═══
 *
 * La V1 basculait le signet en local et ne l'enregistrait nulle part. Ici,
 * l'état affiché est celui que le serveur confirme.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Share } from "react-native";

import { ErreurApi } from "@/lib/http";
import {
  demanderResume,
  garderOffre,
  lireOffre,
  lireResume,
  noterCandidatureOuverte,
} from "../api/offres.api";
import { messageDePartage } from "../services/presentation";
import type { Offre } from "../types/offres.types";
import { offreConnue } from "./memoire-offres";

/** Le rythme de sondage de la V1 (`summary-status` toutes les 2,5 s). */
const INTERVALLE_SONDAGE_MS = 2_500;

/** Le gras Markdown de l'IA, retiré comme dans la V1. */
function nettoyer(texte: string): string {
  return texte
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .trim();
}

/** Les quatre états de la V1 : en génération, prête, en erreur, ou
 *  indisponible (l'API dit qu'il n'y en aura pas). */
export type EtatAnalyse = "generation" | "prete" | "erreur" | "indisponible";

export interface DetailOffre {
  offre: Offre | null;
  chargement: boolean;
  erreur: string | null;
  etatAnalyse: EtatAnalyse;
  analyse: string;
  enregistrement: boolean;
  basculerSignet: () => void;
  partager: () => void;
  postuler: () => void;
  ouvrirCarte: () => void;
  recharger: () => void;
  /** Revient au fil — ou y mène, si l'offre a été ouverte par un lien. */
  retour: () => void;
}

function messageDErreur(cause: unknown): string {
  if (cause instanceof ErreurApi && cause.statut === 404) {
    return "Cette offre n'est plus disponible : l'entreprise l'a sans doute retirée.";
  }
  return cause instanceof ErreurApi && cause.estReseau
    ? "Pas de connexion. L'offre s'affichera dès que le réseau sera là."
    : "L'offre n'a pas pu être chargée. Réessaie dans un instant.";
}

export function useDetailOffre(): DetailOffre {
  const params = useLocalSearchParams<{ id: string }>();
  const id = Number(params.id);
  const connue = offreConnue(id);

  const [offre, setOffre] = useState<Offre | null>(connue ?? null);
  const [chargement, setChargement] = useState(connue === undefined);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);
  const [analyse, setAnalyse] = useState(connue?.resume ? nettoyer(connue.resume) : "");
  const [etatAnalyse, setEtatAnalyse] = useState<EtatAnalyse>(
    connue?.resume ? "prete" : "generation",
  );
  const [enregistrement, setEnregistrement] = useState(false);

  // L'offre, si la mémoire du fil ne l'a pas.
  useEffect(() => {
    if (offreConnue(id) !== undefined && tentative === 0) return;
    let vivant = true;
    lireOffre(id)
      .then(
        (resultat) => {
          if (!vivant) return;
          setOffre(resultat);
          setErreur(null);
        },
        (cause: unknown) => {
          console.warn("[karria] offre indisponible", cause);
          if (vivant) setErreur(messageDErreur(cause));
        },
      )
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, [id, tentative]);

  // L'analyse : lecture, génération si besoin, sondage jusqu'à « ready ».
  useEffect(() => {
    if (etatAnalyse !== "generation") return;
    let vivant = true;
    let minuteur: ReturnType<typeof setTimeout> | undefined;

    const sonder = (dejaDemandee: boolean) => {
      lireResume(id)
        .then(async (lu) => {
          if (!vivant) return;
          const aDemander =
            !dejaDemandee && (lu.status === "missing" || lu.status === "not_available");
          const statut = aDemander ? await demanderResume(id) : lu;
          if (!vivant) return;
          if (statut.status === "ready" && statut.summary) {
            setAnalyse(nettoyer(statut.summary));
            setEtatAnalyse("prete");
            return;
          }
          if (statut.status === "not_available") {
            setEtatAnalyse("indisponible");
            return;
          }
          minuteur = setTimeout(() => sonder(true), INTERVALLE_SONDAGE_MS);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] analyse en échec", cause);
          if (vivant) setEtatAnalyse("erreur");
        });
    };

    sonder(false);
    return () => {
      vivant = false;
      if (minuteur !== undefined) clearTimeout(minuteur);
    };
  }, [id, etatAnalyse]);

  const basculerSignet = useCallback(() => {
    if (offre === null || enregistrement) return;
    setEnregistrement(true);
    garderOffre(offre.id, !offre.enregistree)
      .then((enregistree) => setOffre({ ...offre, enregistree }))
      .catch((cause: unknown) => console.warn("[karria] signet non enregistré", cause))
      .finally(() => setEnregistrement(false));
  }, [offre, enregistrement]);

  const partager = useCallback(() => {
    if (offre === null) return;
    Share.share({ message: messageDePartage(offre) }).catch((cause: unknown) =>
      console.warn("[karria] partage impossible", cause),
    );
  }, [offre]);

  const postuler = useCallback(() => {
    if (offre?.lienCandidature == null) return;
    noterCandidatureOuverte(offre.id);
    WebBrowser.openBrowserAsync(offre.lienCandidature).catch((cause: unknown) =>
      console.warn("[karria] page de candidature impossible à ouvrir", cause),
    );
  }, [offre]);

  const ouvrirCarte = useCallback(() => {
    if (offre === null) return;
    // Repris de la V1 : Plans sur iOS, l'intention `geo` sur Android. Les
    // coordonnées quand l'API les a, la ville sinon.
    const cible =
      offre.latitude !== null && offre.longitude !== null
        ? `${offre.latitude},${offre.longitude}`
        : encodeURIComponent(`${offre.codePostal ?? ""} ${offre.ville ?? ""}`.trim());
    const url = Platform.OS === "ios" ? `maps:0,0?q=${cible}` : `geo:0,0?q=${cible}`;
    Linking.openURL(url).catch((cause: unknown) =>
      console.warn("[karria] carte impossible à ouvrir", cause),
    );
  }, [offre]);

  const router = useRouter();
  const retour = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/offres");
  }, [router]);

  const recharger = useCallback(() => {
    setChargement(true);
    setTentative((t) => t + 1);
  }, []);

  return {
    offre,
    chargement,
    erreur,
    etatAnalyse,
    analyse,
    enregistrement,
    basculerSignet,
    partager,
    postuler,
    ouvrirCarte,
    recharger,
    retour,
  };
}
