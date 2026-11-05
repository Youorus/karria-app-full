/**
 * La feuille « As-tu candidaté à cette offre ? » — ce qu'elle fait quand
 * on lui répond.
 *
 * « Oui, c'est fait » marque le dossier (`POST /applied`), laisse une
 * phrase pour l'onglet Candidatures (`retour-discret.ts`) et y renvoie :
 * la personne voit son dossier passer « Candidaté aujourd'hui » là où
 * elle le retrouvera. « Pas encore » referme la feuille, et c'est tout :
 * elle est sans doute encore dans l'atelier, on ne la déplace pas.
 *
 * Un refus du serveur ne bloque pas : la feuille se ferme, la cause est
 * journalisée et une alerte dit de réessayer depuis le dossier.
 */

import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

import { ErreurApi } from "@/lib/http";

import { marquerCandidate } from "../api/candidatures.api";
import { memoriserDossier } from "../services/memoire-dossiers";
import { TEXTES } from "../services/presentation";
import { poserRetourDiscret } from "../services/retour-discret";
import type { Dossier } from "../types/candidatures.types";

export interface FeuilleCandidature {
  /** Le marquage part : les deux boutons attendent. */
  enregistrement: boolean;
  oui: () => void;
  pasEncore: () => void;
}

export function useFeuilleCandidature(
  dossierId: string,
  onFermer: () => void,
  onMarque?: (dossier: Dossier) => void,
): FeuilleCandidature {
  const router = useRouter();
  const [enregistrement, setEnregistrement] = useState(false);
  const enVol = useRef(false);

  const oui = useCallback(() => {
    if (enVol.current) return;
    enVol.current = true;
    setEnregistrement(true);
    marquerCandidate(dossierId)
      .then((dossier) => {
        memoriserDossier(dossier);
        onMarque?.(dossier);
        poserRetourDiscret(TEXTES.noteCandidate);
        onFermer();
        router.navigate("/dossiers");
      })
      .catch((cause: unknown) => {
        console.warn("[karria] candidature non marquée", cause);
        onFermer();
        Alert.alert(
          "Ça n'a pas été enregistré",
          cause instanceof ErreurApi && cause.estReseau
            ? "Vérifie ta connexion, puis dis-le depuis ton dossier."
            : "Tu pourras le dire depuis ton dossier, dans Candidatures.",
        );
      })
      .finally(() => {
        enVol.current = false;
        setEnregistrement(false);
      });
  }, [dossierId, onFermer, onMarque, router]);

  return {
    enregistrement,
    oui,
    pasEncore: useCallback(() => {
      if (enVol.current) return;
      onFermer();
    }, [onFermer]),
  };
}
