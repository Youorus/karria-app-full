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
 * nombre d'annonces affichées ; un échec vaut « non » et se retentera à la
 * prochaine demande.
 *
 * ═══ Et le prix, pour qui propose l'abonnement ═══
 *
 * La proposition faite après un CV filigrané ou des portraits épuisés
 * (`services/proposition.ts`) écrit le prix dans sa phrase. Il vient de la
 * même lecture (`offreSansPub`) : aucun montant n'est écrit dans l'app
 * (AGENTS.md §6.4).
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { lireCatalogue } from "../api/soutien.api";

/** L'offre telle que le serveur la vend ici. */
export interface OffreSansPub {
  /** Le paiement est ouvert sur cette plateforme. */
  ouverte: boolean;
  /** Le prix mensuel, en centimes ; `null` tant qu'on ne le connaît pas. */
  prixCentimes: number | null;
}

const OFFRE_FERMEE: OffreSansPub = { ouverte: false, prixCentimes: null };

let lecture: Promise<OffreSansPub> | null = null;

/** Lit (une fois) l'offre sans pub : ouverte ici ou non, et son prix mensuel. */
export function offreSansPub(): Promise<OffreSansPub> {
  lecture ??= lireCatalogue(Platform.OS).then(
    (catalogue) => ({
      ouverte: catalogue.actif,
      prixCentimes: catalogue.sansPub?.prixCentimes ?? null,
    }),
    (cause: unknown) => {
      console.warn("[karria] catalogue des paiements illisible", cause);
      lecture = null;
      return OFFRE_FERMEE;
    },
  );
  return lecture;
}

/** Lit (une fois) si l'offre sans pub est ouverte sur cette plateforme. */
export function offreSansPubDisponible(): Promise<boolean> {
  return offreSansPub().then((offre) => offre.ouverte);
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
