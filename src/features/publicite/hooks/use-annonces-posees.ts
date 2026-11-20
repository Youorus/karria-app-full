/**
 * Les annonces **posées** dans une liste : celles de la réserve, entrées au
 * bon moment et à la bonne place (`services/pose-annonces.ts`).
 *
 * - Rien n'entre pendant que la liste bouge (doigt posé ou élan) : la pose
 *   attend l'arrêt.
 * - Rien n'entre à une place visible ou déjà dépassée.
 *
 * La liste dit ce qu'elle montre (`noterVisibles`) et quand elle bouge
 * (`debutGlisse`, `finGlisse`, `debutElan`, `finElan`).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { poserLesAnnonces } from "../services/pose-annonces";
import type { RegleDeListe } from "../services/regles-publicite";

/** Après un doigt levé sans élan, la liste est tenue pour arrêtée. */
const ARRET_MS = 250;
/** Avant la première mesure : ce que la liste prépare d'emblée. */
const VISIBLES_AU_DEPART = 5;

export interface AnnoncesPosees<T> {
  annonces: ReadonlyMap<number, T>;
  /** L'indice du dernier élément à l'écran. */
  noterVisibles: (dernierIndice: number) => void;
  debutGlisse: () => void;
  finGlisse: () => void;
  debutElan: () => void;
  finElan: () => void;
}

export function useAnnoncesPosees<T>(
  pretes: ReadonlyMap<number, T>,
  regle: RegleDeListe,
): AnnoncesPosees<T> {
  const [posees, setPosees] = useState<ReadonlyMap<number, T>>(() => new Map());
  const enMouvement = useRef(false);
  const dernierVisible = useRef(VISIBLES_AU_DEPART);
  const source = useRef(pretes);
  const arret = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poser = useCallback(() => {
    setPosees((avant) =>
      poserLesAnnonces(avant, source.current, regle, dernierVisible.current),
    );
  }, [regle]);

  useEffect(() => {
    source.current = pretes;
    // Plus aucune annonce (passage à sans pub) : elles sortent tout de suite.
    if (!enMouvement.current || pretes.size === 0) poser();
  }, [pretes, poser]);

  const annulerArret = useCallback(() => {
    if (arret.current !== null) clearTimeout(arret.current);
    arret.current = null;
  }, []);
  useEffect(() => annulerArret, [annulerArret]);

  const bouger = useCallback(() => {
    annulerArret();
    enMouvement.current = true;
  }, [annulerArret]);

  const arreter = useCallback(() => {
    annulerArret();
    enMouvement.current = false;
    poser();
  }, [annulerArret, poser]);

  const finGlisse = useCallback(() => {
    // Un élan peut suivre : on n'est arrêté que s'il ne vient pas.
    annulerArret();
    arret.current = setTimeout(arreter, ARRET_MS);
  }, [annulerArret, arreter]);

  const noterVisibles = useCallback((dernierIndice: number) => {
    dernierVisible.current = dernierIndice;
  }, []);

  return {
    annonces: posees,
    noterVisibles,
    debutGlisse: bouger,
    finGlisse,
    debutElan: bouger,
    finElan: arreter,
  };
}
