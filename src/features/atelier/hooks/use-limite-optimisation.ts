/**
 * La limite des optimisations pour les ATS : trois par mois sans abonnement
 * (décision de Marc, 2026-11-20 — `429 optimization_quota_exceeded` de l'API).
 *
 * ═══ Ce qui se passe à la quatrième ═══
 *
 * Le serveur refuse l'optimisation ; le CV déjà affiché reste là, et se
 * télécharge. Si l'offre est ouverte sur cette plateforme, la feuille propose
 * Karria sans pub ; son bouton ouvre **directement** le paiement
 * (`soutien/services/achat-direct.ts`). Abonnée, l'optimisation demandée
 * repart toute seule. Offre fermée, ou personne déjà abonnée : le message du
 * serveur s'affiche, comme toute erreur.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { acheterSansPub } from "@/features/soutien/services/achat-direct";
import { offreSansPub } from "@/features/soutien/services/offre-disponible";
import {
  propositionOptimisations,
  type TextesProposition,
} from "@/features/soutien/services/proposition";
import { quotaAtteint, VERS_SANS_PUB } from "@/features/soutien/services/quotas";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";
import { noterSollicitation } from "@/lib/sollicitations";

export interface LimiteOptimisation {
  /**
   * Un refus du serveur. Rend `true` si c'est la limite des optimisations et
   * que la proposition va monter : l'appelant n'affiche alors pas d'erreur.
   */
  signaler: (cause: unknown) => Promise<boolean>;
  proposition: {
    visible: boolean;
    textes: TextesProposition;
    accepter: () => void;
    fermer: () => void;
    apresFermeture: () => void;
  };
}

function estLaLimite(cause: unknown): cause is ErreurApi {
  return cause instanceof ErreurApi && cause.raison === "optimization_quota_exceeded";
}

/** `relancer` : refaire l'optimisation demandée, une fois abonnée. */
export function useLimiteOptimisation(relancer: () => void): LimiteOptimisation {
  const { pousser } = useNavigationUnique();
  const [proposee, setProposee] = useState<{
    limite: number | null;
    prixCentimes: number | null;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const suite = useRef<(() => void) | null>(null);
  const vivant = useRef(true);
  const refaire = useRef(relancer);
  useEffect(() => {
    refaire.current = relancer;
  }, [relancer]);
  useEffect(() => {
    vivant.current = true;
    return () => {
      vivant.current = false;
    };
  }, []);

  const signaler = useCallback(async (cause: unknown) => {
    if (!estLaLimite(cause) || quotaAtteint(cause)?.proposerSansPub !== true)
      return false;
    const offre = await offreSansPub();
    if (!vivant.current || !offre.ouverte) return false;
    const limite = cause.details.limit;
    setProposee({
      limite: typeof limite === "number" ? limite : null,
      prixCentimes: offre.prixCentimes,
    });
    setVisible(true);
    noterSollicitation("proposition-abonnement");
    return true;
  }, []);

  const fermer = useCallback(() => setVisible(false), []);

  const accepter = useCallback(() => {
    suite.current = () => {
      void acheterSansPub().then((issue) => {
        if (issue === "livre") refaire.current();
        else if (issue === "echec") pousser(VERS_SANS_PUB);
      });
    };
    setVisible(false);
  }, [pousser]);

  const apresFermeture = useCallback(() => {
    const action = suite.current;
    suite.current = null;
    action?.();
  }, []);

  return {
    signaler,
    proposition: {
      visible,
      textes: propositionOptimisations(
        proposee?.limite ?? null,
        proposee?.prixCentimes ?? null,
      ),
      accepter,
      fermer,
      apresFermeture,
    },
  };
}
