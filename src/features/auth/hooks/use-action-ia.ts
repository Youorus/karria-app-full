/**
 * Envelopper la première action d'IA : l'accord d'abord, le geste ensuite.
 *
 * ═══ Ce que fait `avecConsentement(usage, action)` ═══
 *
 * - l'accord est connu et vaut → le geste part tout de suite ;
 * - l'accord manque (ou n'a jamais été lu) → on relit le serveur ; s'il
 *   dit « requis », la feuille s'ouvre et le geste attend « J'accepte et je
 *   continue » ; sinon il part ;
 * - le serveur est injoignable → le geste part quand même : c'est **lui**
 *   qui tranche, et il répondra `403 ai_consent_required` au besoin.
 *
 * ═══ Et le filet, `rejouerSiConsentementRequis(cause, usage, action)` ═══
 *
 * Dans le `catch` d'un appel d'IA : si la cause est ce 403, l'état est marqué
 * « requis », la feuille s'ouvre, et l'action sera rejouée après l'accord.
 * Rend vrai pour que l'appelant n'affiche pas d'erreur.
 */

import { useCallback } from "react";

import { lireConsentementIa } from "../api/consentement-ia.api";
import {
  consentementIa,
  demanderConsentementIa,
  estConsentementIaRequis,
  poserConsentementIa,
} from "../services/consentement-ia";
import type { UsageIa } from "../types/auth.types";

export interface ActionIa {
  avecConsentement: (usage: UsageIa, action: () => void) => void;
  rejouerSiConsentementRequis: (
    cause: unknown,
    usage: UsageIa,
    action: () => void,
  ) => boolean;
}

export function useActionIa(): ActionIa {
  const avecConsentement = useCallback((usage: UsageIa, action: () => void) => {
    const connu = consentementIa();
    if (connu !== null && !connu.requis) {
      action();
      return;
    }
    lireConsentementIa().then(
      (lu) => {
        poserConsentementIa(lu);
        if (lu.requis) demanderConsentementIa(usage, action);
        else action();
      },
      (cause: unknown) => {
        // Le serveur tranchera : s'il exige l'accord, le 403 ouvrira la feuille.
        console.warn("[karria] consentement IA illisible, le serveur décidera", cause);
        action();
      },
    );
  }, []);

  const rejouerSiConsentementRequis = useCallback(
    (cause: unknown, usage: UsageIa, action: () => void) => {
      if (!estConsentementIaRequis(cause)) return false;
      const connu = consentementIa();
      if (connu !== null) poserConsentementIa({ ...connu, requis: true });
      demanderConsentementIa(usage, action);
      return true;
    },
    [],
  );

  return { avecConsentement, rejouerSiConsentementRequis };
}
