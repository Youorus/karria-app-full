/**
 * Le filigrane sur l'écran Finaliser : la ligne d'information, la
 * proposition d'abonnement après un export filigrané, et « Régénérer sans
 * filigrane » une fois abonné (ADR-0040 de l'API).
 *
 * ═══ Rien ici ne retient un document ═══
 *
 * Le hook n'a aucun moyen d'empêcher un téléchargement, un partage ou un
 * envoi : il ne rend que des mots, une feuille qu'on ferme, et un bouton en
 * plus. Toute lecture qui échoue — `/allowance` sur un serveur plus ancien
 * (`404`), le catalogue des paiements, une coupure réseau — vaut « ne rien
 * dire » : la cause est journalisée, l'écran continue.
 *
 * ═══ Quand lire `/allowance` ═══
 *
 * À l'ouverture (l'export part au même moment : la lecture décrit l'avant),
 * puis à chaque nouvel export — le compteur a bougé. Une lecture faite
 * **avant** l'export affiché n'est plus montrée une fois le document là
 * (`droitsAJour`) : la ligne ne dit alors que le fait porté par l'export, en
 * attendant la relecture. On ne recalcule pas le compteur ici.
 *
 * ═══ La feuille, une fois par export ═══
 *
 * Montrée quand le document est prêt, s'il porte le filigrane, à une
 * personne non abonnée, là où le paiement est ouvert (catalogue `enabled`).
 * Paiements coupés : la ligne seule. « Retirer le filigrane » ferme la
 * feuille puis ouvre **directement** la page de paiement
 * (`soutien/services/achat-direct.ts`) : le prix est sur la feuille, la
 * personne a déjà dit oui. Abonnée, son CV se régénère seul, sans filigrane.
 * Si la page ne s'ouvre pas, l'offre du profil prend le relais.
 *
 * ═══ Après l'abonnement ═══
 *
 * Le drapeau « sans pub » (`lib/sans-pub.ts`) passe à vrai dès que l'achat
 * est livré ou relu au retour au premier plan. Si le CV affiché porte encore
 * le filigrane, « Régénérer sans filigrane » relance l'export.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { acheterSansPub } from "@/features/soutien/services/achat-direct";
import { offreSansPub } from "@/features/soutien/services/offre-disponible";
import {
  propositionFiligrane,
  type TextesProposition,
} from "@/features/soutien/services/proposition";
import { VERS_SANS_PUB } from "@/features/soutien/services/quotas";
import { useSansPub } from "@/hooks/use-sans-pub";
import { useNavigationUnique } from "@/lib/navigation";
import { noterSollicitation } from "@/lib/sollicitations";

import { lireDroitsFiligrane } from "../api/documents.api";
import {
  doitProposer,
  ligneFiligrane,
  peutRegenererSansFiligrane,
  retenirProposition,
} from "../services/filigrane";
import type { DroitsFiligrane } from "../types/atelier.types";

export interface Filigrane {
  /** La ligne discrète, ou `null` : rien à dire. */
  ligne: string | null;
  proposition: {
    visible: boolean;
    textes: TextesProposition;
    /** « Retirer le filigrane » : ferme, puis ouvre le paiement. */
    accepter: () => void;
    /** « Garder mon CV avec le filigrane », la croix, le voile. */
    fermer: () => void;
    apresFermeture: () => void;
  };
  /** Abonné depuis, sur un CV sorti filigrané : on peut le refaire sans. */
  regenerable: boolean;
  regenerer: () => void;
}

interface Options {
  /** L'export de CV affiché, ou `null` tant qu'il n'y en a pas. */
  exporte: { id: string; filigrane: boolean } | null;
  /** L'export de la lettre, qui suit l'état du compte : elle aussi peut se refaire. */
  lettre?: { filigrane: boolean } | null;
  /** Les documents se génèrent : la feuille attend qu'ils soient prêts. */
  enAttente: boolean;
  /** Relance l'export (le « Réessayer » de Finaliser). */
  regenerer: () => void;
}

export function useFiligrane({
  exporte,
  lettre = null,
  enAttente,
  regenerer,
}: Options): Filigrane {
  const { pousser } = useNavigationUnique();
  const sansPub = useSansPub();
  const exportId = exporte?.id ?? null;
  const filigrane = exporte?.filigrane === true;

  /** Les droits, et l'export (ou son absence) pour lequel ils ont été lus. */
  const [lus, setLus] = useState<{ pour: string | null; droits: DroitsFiligrane } | null>(
    null,
  );
  const [prixCentimes, setPrixCentimes] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const suite = useRef<(() => void) | null>(null);

  // ── Le compteur : à l'ouverture, puis après chaque export ──────────────
  useEffect(() => {
    let actif = true;
    lireDroitsFiligrane().then(
      (droits) => {
        if (actif) setLus(droits === null ? null : { pour: exportId, droits });
      },
      (cause: unknown) => {
        // Une information en moins, rien de cassé.
        console.warn("[karria] droits de filigrane illisibles", cause);
        if (actif) setLus(null);
      },
    );
    return () => {
      actif = false;
    };
  }, [exportId]);

  // ── La feuille : quand le document est prêt, une fois par export ───────
  useEffect(() => {
    if (enAttente || exportId === null || !filigrane || sansPub) return;
    let actif = true;
    void offreSansPub().then((offre) => {
      if (!actif) return;
      const exporteLu = { id: exportId, filigrane };
      if (!doitProposer({ exporte: exporteLu, sansPub, offreOuverte: offre.ouverte }))
        return;
      retenirProposition(exportId);
      setPrixCentimes(offre.prixCentimes);
      setVisible(true);
      // Une seule sollicitation à la fois : la demande d'avis s'abstient
      // juste après cette feuille (`features/avis`).
      noterSollicitation("proposition-abonnement");
    });
    return () => {
      actif = false;
    };
  }, [enAttente, exportId, filigrane, sansPub]);

  const fermer = useCallback(() => setVisible(false), []);

  const relancer = useRef(regenerer);
  useEffect(() => {
    relancer.current = regenerer;
  }, [regenerer]);

  const accepter = useCallback(() => {
    suite.current = () => {
      void acheterSansPub().then((issue) => {
        // Abonnée : le CV affiché se refait tout de suite, sans filigrane.
        if (issue === "livre") relancer.current();
        // La page n'a pas pu s'ouvrir : l'offre du profil sait dire pourquoi.
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

  const droitsAJour = lus !== null && (enAttente || lus.pour === exportId);

  return {
    ligne: ligneFiligrane(
      droitsAJour ? lus.droits : null,
      enAttente || exporte === null ? null : exporte,
    ),
    proposition: {
      // Abonné entre-temps : la feuille n'a plus rien à proposer.
      visible: visible && !sansPub && !enAttente,
      textes: propositionFiligrane(prixCentimes),
      accepter,
      fermer,
      apresFermeture,
    },
    regenerable:
      !enAttente &&
      (peutRegenererSansFiligrane(exporte, sansPub) ||
        peutRegenererSansFiligrane(lettre, sansPub)),
    regenerer,
  };
}
