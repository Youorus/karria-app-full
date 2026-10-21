/**
 * La saisie du code : ce que l'écran du code affiche et déclenche.
 *
 * ═══ Le sixième chiffre valide ═══
 *
 * Un code à six chiffres n'a qu'une longueur possible : quand elle est
 * atteinte, il n'y a plus rien à décider. Demander un geste de plus,
 * c'est perdre le bénéfice du remplissage automatique du système, qui
 * pose les six chiffres d'un coup.
 *
 * ═══ Les deux garde-fous ═══
 *
 * `dernierEnvoye` retient ce qui vient de partir. Sans lui, un code
 * refusé resterait complet à l'écran et l'effet le renverrait à chaque
 * rendu, jusqu'au blocage du parcours. `enCours` empêche le double envoi
 * pendant que le serveur répond. Le bouton « Valider » reste pour
 * retenter le même code après un refus.
 *
 * ═══ Pourquoi un hook et pas l'écran ═══
 *
 * Chez Zoumani, cet effet vivait dans l'écran. C'est précisément ce que
 * AGENTS.md §3.1 interdit : il est ici, éprouvable sans rendu.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { SIMULATION } from "@/lib/config";
import { CODE_SIMULATION } from "@/lib/dev/serveur-simule";
import { useNavigationUnique } from "@/lib/navigation";
import type { ErreurLisible } from "../services/erreurs-auth";
import { useParcours } from "./parcours-connexion";

export const LONGUEUR_CODE = 6;

export interface SaisieCode {
  code: string;
  changerCode: (saisie: string) => void;
  envoyeA: string;
  /** Durée de validité annoncée, en minutes. */
  valableMinutes: number;
  avantRenvoi: number;
  enCours: boolean;
  erreur: ErreurLisible | null;
  complet: boolean;
  valider: () => Promise<void>;
  renvoyer: () => void;
  recommencer: () => void;
  /** En simulation, le code à saisir. `null` contre un vrai serveur. */
  indiceSimulation: string | null;
}

export function useSaisieCode(): SaisieCode {
  const {
    parcours,
    validerCode,
    redemanderCode,
    avantRenvoi,
    enCours,
    erreur,
    effacerErreur,
    recommencer: oublierParcours,
  } = useParcours();
  const { quitterLeParcours, remplacer } = useNavigationUnique();
  const [code, setCode] = useState("");
  const dernierEnvoye = useRef<string | null>(null);

  const valider = useCallback(async () => {
    dernierEnvoye.current = code;
    if (await validerCode(code)) {
      quitterLeParcours("/");
    }
  }, [code, validerCode, quitterLeParcours]);

  useEffect(() => {
    if (code.length < LONGUEUR_CODE || enCours) return;
    if (dernierEnvoye.current === code) return;
    void valider();
  }, [code, enCours, valider]);

  const changerCode = useCallback(
    (saisie: string) => {
      setCode(saisie);
      if (erreur !== null) effacerErreur();
    },
    [erreur, effacerErreur],
  );

  const renvoyer = useCallback(() => {
    setCode("");
    dernierEnvoye.current = null;
    void redemanderCode();
  }, [redemanderCode]);

  const recommencer = useCallback(() => {
    oublierParcours();
    remplacer("/email");
  }, [oublierParcours, remplacer]);

  return {
    code,
    changerCode,
    envoyeA: parcours?.envoyeA ?? "",
    valableMinutes: Math.max(1, Math.round((parcours?.valableSecondes ?? 600) / 60)),
    avantRenvoi,
    enCours,
    erreur,
    complet: code.length === LONGUEUR_CODE,
    valider,
    renvoyer,
    recommencer,
    indiceSimulation: SIMULATION ? CODE_SIMULATION : null,
  };
}
