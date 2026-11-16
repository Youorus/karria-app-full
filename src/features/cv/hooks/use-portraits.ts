/**
 * Les portraits retravaillés qui restent ce mois-ci — lus pour les montrer
 * près du bouton, avant d'appuyer.
 *
 * ═══ Une information, pas une barrière ═══
 *
 * Le serveur fait respecter le quota (`429 portrait_quota_exceeded`) ; ici
 * on ne fait que prévenir. Si la lecture échoue, on ne montre rien et le
 * bouton reste actif : au pire, le refus du serveur arrive avec son message
 * (`services/photo.ts`). On relit après chaque tentative, réussie ou non,
 * pour que le compteur dise toujours vrai.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { lireQuotaPortraits } from "../api/cv.api";
import { mentionPortraits } from "../services/photo";
import type { QuotaPortraits } from "../types/cv.types";

export interface Portraits {
  /** « 2 portraits retravaillés restants ce mois-ci. », ou `null` tant qu'on ne sait pas. */
  mention: string | null;
  /** Plus aucun portrait ce mois-ci : le bouton se désactive. */
  epuises: boolean;
  /** Relire le compteur, après une tentative. */
  rafraichir: () => void;
}

/** `actif` faux : rien n'est lu (une section du CV qui n'est pas la photo). */
export function usePortraits(actif = true): Portraits {
  const [quota, setQuota] = useState<QuotaPortraits | null>(null);
  const vivant = useRef(true);

  const rafraichir = useCallback(() => {
    if (!actif) return;
    lireQuotaPortraits()
      .then((lu) => {
        if (vivant.current) setQuota(lu);
      })
      .catch((cause: unknown) => {
        // Sans compteur, on n'empêche rien : le serveur tranche.
        console.warn("[karria] compteur de portraits illisible", cause);
      });
  }, [actif]);

  useEffect(() => {
    vivant.current = true;
    rafraichir();
    return () => {
      vivant.current = false;
    };
  }, [rafraichir]);

  return {
    mention: quota === null ? null : mentionPortraits(quota),
    epuises: quota !== null && quota.restants <= 0,
    rafraichir,
  };
}
