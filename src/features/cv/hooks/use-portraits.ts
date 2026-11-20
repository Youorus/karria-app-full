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
 *
 * ═══ Et la proposition d'abonnement, quand le quota est atteint ═══
 *
 * La même feuille qu'après un CV filigrané (`soutien/components/
 * feuille-proposition.tsx`), avec ses mots à elle. Elle monte dans deux cas :
 *
 * - en **ouvrant** la photo avec les portraits du mois déjà épuisés — une
 *   fois par lancement de l'app, pas à chaque visite ;
 * - sur un **refus** du serveur (`signalerRefus`), quand le compteur n'avait
 *   pas pu prévenir.
 *
 * Elle ne monte pas à la relecture qui suit une tentative : le troisième
 * portrait vient d'arriver, la personne compare ses deux photos — ce n'est
 * pas le moment. Jamais pour un abonné, jamais là où le paiement est coupé
 * (`offreSansPub`). Elle se ferme d'un geste, et ne retient rien : changer
 * ou garder sa photo n'est jamais limité.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { offreSansPub } from "@/features/soutien/services/offre-disponible";
import {
  propositionPortraits,
  type TextesProposition,
} from "@/features/soutien/services/proposition";
import { acheterSansPub } from "@/features/soutien/services/achat-direct";
import { quotaAtteint, VERS_SANS_PUB } from "@/features/soutien/services/quotas";
import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";
import { noterSollicitation } from "@/lib/sollicitations";

import { lireQuotaPortraits } from "../api/cv.api";
import { mentionPortraits } from "../services/photo";
import type { QuotaPortraits } from "../types/cv.types";

export interface PropositionPortraits {
  visible: boolean;
  textes: TextesProposition;
  /** « Voir Karria sans pub » : ferme, puis ouvre l'offre. */
  accepter: () => void;
  fermer: () => void;
  apresFermeture: () => void;
}

export interface Portraits {
  /** « 2 portraits retravaillés restants ce mois-ci. », ou `null` tant qu'on ne sait pas. */
  mention: string | null;
  /** Plus aucun portrait ce mois-ci : le bouton se désactive. */
  epuises: boolean;
  /** Relire le compteur, après une tentative. */
  rafraichir: () => void;
  /** Un refus du serveur : s'il s'agit du quota, la proposition monte. */
  signalerRefus: (cause: unknown) => void;
  proposition: PropositionPortraits;
}

/** La proposition a déjà été faite à l'ouverture, ce lancement-ci. */
let dejaProposee = false;

/** Pour les tests : comme un nouveau lancement. */
export function oublierPropositionPortraits(): void {
  dejaProposee = false;
}

/** `actif` faux : rien n'est lu (une section du CV qui n'est pas la photo). */
export function usePortraits(actif = true): Portraits {
  const { pousser } = useNavigationUnique();
  const [quota, setQuota] = useState<QuotaPortraits | null>(null);
  const [proposee, setProposee] = useState<{
    limite: number | null;
    prixCentimes: number | null;
  } | null>(null);
  const [visible, setVisible] = useState(false);
  const suite = useRef<(() => void) | null>(null);
  const vivant = useRef(true);

  /** Monte la feuille, si l'offre est ouverte sur cette plateforme. */
  const proposer = useCallback((limite: number | null) => {
    void offreSansPub().then((offre) => {
      if (!vivant.current || !offre.ouverte) return;
      dejaProposee = true;
      setProposee({ limite, prixCentimes: offre.prixCentimes });
      setVisible(true);
      // Une seule sollicitation à la fois (`lib/sollicitations.ts`).
      noterSollicitation("proposition-abonnement");
    });
  }, []);

  /** La première lecture aboutie de cet écran : la seule qui peut proposer.
   *  Les suivantes suivent une tentative — la création repasse même par
   *  « inactif » pendant l'envoi — et ne sollicitent plus. */
  const ouverture = useRef(true);

  const rafraichir = useCallback(() => {
    if (!actif) return;
    lireQuotaPortraits()
      .then((lu) => {
        if (!vivant.current) return;
        setQuota(lu);
        const premiere = ouverture.current;
        ouverture.current = false;
        if (premiere && !dejaProposee && !lu.abonne && lu.restants <= 0)
          proposer(lu.limite);
      })
      .catch((cause: unknown) => {
        // Sans compteur, on n'empêche rien : le serveur tranche.
        console.warn("[karria] compteur de portraits illisible", cause);
      });
  }, [actif, proposer]);

  useEffect(() => {
    vivant.current = true;
    rafraichir();
    return () => {
      vivant.current = false;
    };
  }, [rafraichir]);

  const signalerRefus = useCallback(
    (cause: unknown) => {
      const refus = quotaAtteint(cause);
      if (refus === null || !refus.proposerSansPub) return;
      const limite = cause instanceof ErreurApi ? cause.details.limit : undefined;
      proposer(typeof limite === "number" ? limite : null);
    },
    [proposer],
  );

  const fermer = useCallback(() => setVisible(false), []);

  const accepter = useCallback(() => {
    // Le paiement s'ouvre sur place (`soutien/services/achat-direct.ts`) ;
    // abonnée, la limite est levée et le compteur se relit.
    suite.current = () => {
      void acheterSansPub().then((issue) => {
        if (issue === "livre") rafraichir();
        else if (issue === "echec") pousser(VERS_SANS_PUB);
      });
    };
    setVisible(false);
  }, [pousser, rafraichir]);

  const apresFermeture = useCallback(() => {
    const action = suite.current;
    suite.current = null;
    action?.();
  }, []);

  return {
    mention: quota === null ? null : mentionPortraits(quota),
    epuises: quota !== null && quota.restants <= 0,
    rafraichir,
    signalerRefus,
    proposition: {
      visible,
      textes: propositionPortraits(
        proposee?.limite ?? null,
        proposee?.prixCentimes ?? null,
      ),
      accepter,
      fermer,
      apresFermeture,
    },
  };
}
