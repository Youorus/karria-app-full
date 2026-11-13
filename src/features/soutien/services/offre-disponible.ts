/**
 * L'offre « sans pub » est-elle proposable ici ? — la réponse partagée
 * par les annonces du fil.
 *
 * ═══ Pourquoi ═══
 *
 * Chaque annonce porte un petit « Masquer les annonces » qui mène à
 * l'offre : c'est le moment où la gêne se voit, celui où une proposition
 * a le plus de sens (refonte du 2026-11-13). Mais il ne doit apparaître
 * que si le serveur a ouvert le paiement sur cette plateforme ; sinon le
 * lien mènerait nulle part.
 *
 * Le catalogue n'est lu qu'**une fois** par lancement, quel que soit le
 * nombre d'annonces affichées ; un échec vaut « non » et se retentera au
 * lancement suivant.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { lireCatalogue } from "../api/soutien.api";

let lecture: Promise<boolean> | null = null;

/** Lit (une fois) si l'offre sans pub est ouverte sur cette plateforme. */
export function offreSansPubDisponible(): Promise<boolean> {
  lecture ??= lireCatalogue(Platform.OS).then(
    (catalogue) => catalogue.actif,
    () => {
      lecture = null;
      return false;
    },
  );
  return lecture;
}

/** Pour les tests : oublie la lecture en cache. */
export function oublierOffreDisponible(): void {
  lecture = null;
}

export function useOffreSansPubDisponible(): boolean {
  const [disponible, setDisponible] = useState(false);
  useEffect(() => {
    let vivant = true;
    void offreSansPubDisponible().then((oui) => {
      if (vivant) setDisponible(oui);
    });
    return () => {
      vivant = false;
    };
  }, []);
  return disponible;
}
