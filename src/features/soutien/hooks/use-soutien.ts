/**
 * L'état de la carte « offrir un café » : le catalogue, la taille choisie,
 * l'envoi, et le merci.
 *
 * ═══ Ce qu'il décide ═══
 *
 * - `catalogue` vaut `null` tant qu'on ne sait pas : la carte montre un
 *   squelette plutôt qu'un « Bientôt » qui clignoterait vers un prix.
 * - Deux tasses sont choisies d'office : le milieu, ni radin ni pressant.
 * - Renoncer dans la feuille du store n'est pas une erreur : rien ne
 *   s'affiche. Une vraie panne garde sa cause dans le journal et invite à
 *   réessayer — sans promettre « rien n'a été débité » : c'est le store
 *   qui le sait, pas nous.
 * - Le merci reste jusqu'à « En offrir un autre » : il ne s'efface pas
 *   seul sous les yeux de quelqu'un qui vient d'être généreux.
 */

import { useCallback, useEffect, useState } from "react";

import { pourboire } from "../services/pourboire";
import type { CatalogueDeCafes, OffreDeCafe, Tasses } from "../types/soutien.types";

export interface Soutien {
  catalogue: CatalogueDeCafes | null;
  choix: Tasses;
  /** L'offre choisie, ou `null` tant que le catalogue n'est pas lu. */
  offreChoisie: OffreDeCafe | null;
  envoi: boolean;
  merci: boolean;
  erreur: string | null;
  choisir: (tasses: Tasses) => void;
  offrir: () => void;
  recommencer: () => void;
}

export function useSoutien(): Soutien {
  const [catalogue, setCatalogue] = useState<CatalogueDeCafes | null>(null);
  const [choix, setChoix] = useState<Tasses>(2);
  const [envoi, setEnvoi] = useState(false);
  const [merci, setMerci] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    pourboire.lireCatalogue().then(
      (lu) => {
        if (vivant) setCatalogue(lu);
      },
      (cause: unknown) => console.warn("[karria] catalogue des cafés illisible", cause),
    );
    return () => {
      vivant = false;
    };
  }, []);

  const offreChoisie = catalogue?.offres.find((o) => o.tasses === choix) ?? null;

  const offrir = useCallback(() => {
    if (offreChoisie === null || !catalogue?.disponible || envoi) return;
    setEnvoi(true);
    setErreur(null);
    pourboire
      .offrir(offreChoisie.produitId)
      .then(
        (issue) => {
          if (issue === "merci") setMerci(true);
        },
        (cause: unknown) => {
          console.warn("[karria] café non offert", cause);
          setErreur("Le café n'est pas passé. Réessaie dans un instant.");
        },
      )
      .finally(() => setEnvoi(false));
  }, [offreChoisie, catalogue, envoi]);

  return {
    catalogue,
    choix,
    offreChoisie,
    envoi,
    merci,
    erreur,
    choisir: setChoix,
    offrir,
    recommencer: useCallback(() => setMerci(false), []),
  };
}
