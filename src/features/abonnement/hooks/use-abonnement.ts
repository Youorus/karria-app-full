/**
 * L'abonnement de la personne connectée, prêt à afficher.
 *
 * `null` tant qu'on ne sait pas : la carte montre alors un squelette
 * plutôt qu'un faux « Gratuit » qui clignoterait vers « Premium » le jour
 * où le serveur répondra autre chose. Une lecture ratée se journalise et
 * laisse `null` — l'abonnement est une information, pas une étape.
 */

import { useEffect, useState } from "react";

import { lireMonAbonnement } from "../api/abonnement.api";
import type { Abonnement } from "../types/abonnement.types";

export function useAbonnement(): Abonnement | null {
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null);

  useEffect(() => {
    let vivant = true;
    lireMonAbonnement().then(
      (lu) => {
        if (vivant) setAbonnement(lu);
      },
      (cause: unknown) => console.warn("[karria] abonnement illisible", cause),
    );
    return () => {
      vivant = false;
    };
  }, []);

  return abonnement;
}
