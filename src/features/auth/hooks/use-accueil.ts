/**
 * Tout ce dont l'écran d'accueil a besoin, derrière un seul hook.
 *
 * L'accueil offre trois portes — Apple, Google, e-mail — et deux liens
 * légaux. Les réunir ici garde l'écran fidèle à la règle §3.1 : il lit
 * un hook et rend du JSX, rien d'autre.
 *
 * ═══ L'au revoir ═══
 *
 * Quand on arrive ici juste après avoir supprimé son compte, l'accueil le
 * dit en une ligne. L'information voyage dans l'adresse (`?adieu=1`) et
 * non dans un état global : la session vient d'être oubliée, il n'y a
 * plus rien pour la porter — et un rechargement de l'écran n'a pas à
 * redire au revoir.
 */

import { useLocalSearchParams } from "expo-router";
import { useCallback } from "react";

import { useNavigationUnique } from "@/lib/navigation";
import { ouvrirDocument, type Document } from "../services/documents";
import { useConnexionSociale, type ConnexionSociale } from "./use-connexion-sociale";
import { PARAMETRE_ADIEU } from "./use-session";

export interface Accueil extends ConnexionSociale {
  continuerParEmail: () => void;
  lire: (document: Document) => void;
  /** Vrai juste après la suppression d'un compte : on dit au revoir. */
  adieu: boolean;
}

export function useAccueil(): Accueil {
  const sociale = useConnexionSociale();
  const { pousser } = useNavigationUnique();
  const parametres = useLocalSearchParams<{ [PARAMETRE_ADIEU]?: string }>();

  const continuerParEmail = useCallback(() => pousser("/email"), [pousser]);
  const lire = useCallback((document: Document) => void ouvrirDocument(document), []);

  return {
    ...sociale,
    continuerParEmail,
    lire,
    adieu: parametres[PARAMETRE_ADIEU] === "1",
  };
}
