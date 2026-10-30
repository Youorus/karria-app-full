/**
 * Exiger un compte avant un geste — et reprendre le geste après.
 *
 * ═══ Deux hooks, un contrat ═══
 *
 * `usePorte().exiger(raison, intention)` : connecté, rend `true` et le hook
 * appelant fait son geste ; invité, ouvre la feuille de connexion avec la
 * bonne raison, retient l'intention, rend `false`.
 *
 * `useReprise(cle, action)` : dès que la session s'ouvre, si l'intention
 * en attente porte cette clé, l'action est jouée **une fois**, avec la
 * charge (l'identifiant visé). L'écran qui avait demandé la connexion est
 * toujours monté dessous : il reprend là où il en était.
 *
 * L'action est lue par une référence : l'effet ne dépend que de la session,
 * et une fonction recréée à chaque rendu ne relance rien.
 */

import { useCallback, useEffect, useRef } from "react";

import { consommerIntention, type Intention } from "@/lib/intention";

import type { RaisonConnexion } from "../services/porte";
import { ouvrirPorte } from "./porte-store";
import { useSession } from "./use-session";

export interface Porte {
  /** Vrai : connecté, vas-y. Faux : la feuille s'ouvre, l'intention attend. */
  exiger: (raison: RaisonConnexion, intention?: Intention) => boolean;
  invite: boolean;
}

export function usePorte(): Porte {
  const { etat } = useSession();
  const connecte = etat === "connecte";
  const exiger = useCallback(
    (raison: RaisonConnexion, intention?: Intention) => {
      if (connecte) return true;
      ouvrirPorte(raison, intention);
      return false;
    },
    [connecte],
  );
  return { exiger, invite: !connecte };
}

export function useReprise(
  cle: string,
  action: (charge: string | undefined) => void,
): void {
  const { etat } = useSession();
  const derniere = useRef(action);
  useEffect(() => {
    derniere.current = action;
  }, [action]);

  useEffect(() => {
    if (etat !== "connecte") return;
    const intention = consommerIntention(cle);
    if (intention !== null) derniere.current(intention.charge);
  }, [etat, cle]);
}
