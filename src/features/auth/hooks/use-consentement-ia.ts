/**
 * Tout ce dont la feuille de consentement à l'IA a besoin, derrière un
 * seul hook.
 *
 * ═══ Elle lit toujours le serveur en s'ouvrant ═══
 *
 * La version qu'on accepte doit être celle qu'on a **montrée** : la feuille
 * relit `GET /auth/me/ai-consent` à l'ouverture, puis renvoie cette version.
 * Si le serveur répond `ai_consent_version_mismatch` (l'information a changé
 * entre-temps), on relit et on remontre — jamais d'accord sur une version
 * qu'on n'a pas affichée.
 *
 * ═══ Deux modes ═══
 *
 * `demande` : avant un geste ; « J'accepte et je continue » enregistre puis
 * rejoue le geste ; « Pas maintenant » le laisse tomber. `consultation` :
 * depuis les paramètres ; la date de l'accord, et « Retirer mon
 * consentement » (`DELETE`), après quoi la feuille redemandera au prochain
 * geste.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { ErreurApi } from "@/lib/http";

import {
  accepterConsentementIa,
  lireConsentementIa,
  retirerConsentementIa,
} from "../api/consentement-ia.api";
import {
  abonnerConsentementIa,
  ceQuiPart,
  consentementIa,
  dateLisible,
  fermerFeuilleIa,
  feuilleIa,
  fournisseursLisibles,
  poserConsentementIa,
  reprendreApresAccord,
  type FeuilleIa,
} from "../services/consentement-ia";
import { ouvrirDocument } from "../services/documents";
import type { ConsentementIa } from "../types/auth.types";

export interface FeuilleConsentementIa {
  feuille: FeuilleIa | null;
  consentement: ConsentementIa | null;
  /** Ce qui part, l'outil courant en tête. */
  envois: string[];
  fournisseurs: string;
  /** « Accepté le 30 octobre 2026 », ou `null`. */
  accepteLe: string | null;
  enCours: boolean;
  erreur: string | null;
  accepter: () => void;
  retirer: () => void;
  plusTard: () => void;
  lirePolitique: () => void;
}

export function useConsentementIa(): FeuilleConsentementIa {
  const feuille = useSyncExternalStore(abonnerConsentementIa, feuilleIa, feuilleIa);
  const consentement = useSyncExternalStore(
    abonnerConsentementIa,
    consentementIa,
    consentementIa,
  );
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ouverte = feuille !== null;

  // À l'ouverture : relire, pour montrer — et accepter — la version du jour.
  useEffect(() => {
    if (!ouverte) return;
    let vivant = true;
    lireConsentementIa().then(
      (lu) => {
        if (!vivant) return;
        poserConsentementIa(lu);
        setErreur(null);
      },
      (cause: unknown) => {
        console.warn("[karria] consentement IA illisible", cause);
        if (vivant && consentementIa() === null) {
          setErreur("Je n'arrive pas à lire l'information. Vérifie ta connexion.");
        }
      },
    );
    return () => {
      vivant = false;
    };
  }, [ouverte]);

  const accepter = useCallback(() => {
    const montre = consentementIa();
    if (montre === null || enCours) return;
    setEnCours(true);
    setErreur(null);
    accepterConsentementIa(montre.version)
      .then((lu) => {
        poserConsentementIa(lu);
        reprendreApresAccord();
      })
      .catch((cause: unknown) => {
        console.warn("[karria] consentement IA non enregistré", cause);
        if (
          cause instanceof ErreurApi &&
          cause.raison === "ai_consent_version_mismatch"
        ) {
          // L'information a changé : on la relit, la feuille reste ouverte.
          lireConsentementIa().then(poserConsentementIa, () => undefined);
          setErreur("L'information a changé depuis : relis-la, puis accepte à nouveau.");
          return;
        }
        setErreur(
          cause instanceof ErreurApi && cause.estReseau
            ? "Pas de connexion. Réessaie dans un instant."
            : "Ton accord n'a pas pu être enregistré. Réessaie.",
        );
      })
      .finally(() => setEnCours(false));
  }, [enCours]);

  const retirer = useCallback(() => {
    if (enCours) return;
    setEnCours(true);
    setErreur(null);
    retirerConsentementIa()
      .then((lu) => {
        poserConsentementIa(lu);
        fermerFeuilleIa();
      })
      .catch((cause: unknown) => {
        console.warn("[karria] consentement IA non retiré", cause);
        setErreur("Le retrait n'a pas pu être enregistré. Réessaie.");
      })
      .finally(() => setEnCours(false));
  }, [enCours]);

  return {
    feuille,
    consentement,
    envois:
      consentement === null ? [] : ceQuiPart(consentement.usages, feuille?.usage ?? null),
    fournisseurs: fournisseursLisibles(consentement?.fournisseurs ?? []),
    accepteLe:
      consentement !== null && !consentement.requis
        ? dateLisible(consentement.accepteLe)
        : null,
    enCours,
    erreur,
    accepter,
    retirer,
    plusTard: useCallback(() => fermerFeuilleIa(), []),
    lirePolitique: useCallback(() => void ouvrirDocument("confidentialite"), []),
  };
}
