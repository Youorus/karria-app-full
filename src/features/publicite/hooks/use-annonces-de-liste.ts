/**
 * Les annonces prêtes pour une liste de `nombre` offres.
 *
 * ═══ Le bon moment pour demander le consentement ═══
 *
 * Jamais au premier écran : la personne doit d'abord avoir vu ce que
 * l'application lui apporte. On attend que la liste soit **affichée avec
 * du contenu** depuis `DELAI_MS` — elle lit ses premières offres, la
 * première annonce n'arrive qu'après `intervalle` cartes — puis on pose
 * la question (UMP, puis ATT) et l'on précharge. Avant cela, aucune
 * requête ne part.
 */

import { useEffect, useSyncExternalStore } from "react";

import { emplacementsPour, type RegleDeListe } from "../services/regles-publicite";
import type { NativeAd } from "../api/publicite.api";
import { abonner, annoncesPretes, prechauffer } from "./reserve-annonces";

const DELAI_MS = 2500;

export function useAnnoncesDeListe(
  nombre: number,
  regle: RegleDeListe,
): ReadonlyMap<number, NativeAd> {
  const pretes = useSyncExternalStore(abonner, annoncesPretes);
  const nombreEmplacements = emplacementsPour(nombre, regle).length;

  useEffect(() => {
    if (nombreEmplacements === 0) return;
    const minuterie = setTimeout(
      () => prechauffer(Array.from({ length: nombreEmplacements }, (_, e) => e)),
      DELAI_MS,
    );
    return () => clearTimeout(minuterie);
  }, [nombreEmplacements]);

  return pretes;
}
