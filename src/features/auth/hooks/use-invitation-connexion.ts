/**
 * Tout ce dont l'invitation à se connecter a besoin, derrière un seul hook.
 *
 * ═══ Ouverte par n'importe qui, fermée par la session ═══
 *
 * La raison vient du store de la porte (`porte-store.ts`) : le fil, le
 * détail, l'onglet CV l'ouvrent sans se connaître. Elle se ferme sur
 * « Pas maintenant » (l'intention tombe), sur la croix, ou **d'elle-même**
 * quand la session s'ouvre — par Google ou Apple ici, ou au retour du
 * parcours e-mail. L'écran qui a demandé la connexion est toujours monté
 * dessous : il reprend son geste (`useReprise`).
 *
 * ═══ Le parcours e-mail part d'ici ═══
 *
 * On empile `/email` au-dessus de l'espace connecté. À la validation du
 * code, `use-saisie-code.ts` voit l'intention en attente et **revient**
 * (`dismissAll`) au lieu de rejouer l'aiguillage de l'accueil : la pile
 * dessous n'a pas bougé.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { ouvrirDocument, type Document } from "../services/documents";
import { textesDeLaPorte, type TextesPorte } from "../services/porte";
import { abonnerPorte, fermerPorte, raisonDeLaPorte } from "./porte-store";
import { useConnexionSociale, type ConnexionSociale } from "./use-connexion-sociale";
import { useSession } from "./use-session";

export interface InvitationConnexion extends ConnexionSociale {
  visible: boolean;
  textes: TextesPorte | null;
  continuerParEmail: () => void;
  lire: (document: Document) => void;
  fermer: () => void;
  plusTard: () => void;
}

export function useInvitationConnexion(): InvitationConnexion {
  const router = useRouter();
  const { etat } = useSession();
  const raison = useSyncExternalStore(abonnerPorte, raisonDeLaPorte, raisonDeLaPorte);
  // Connecté : la feuille n'a plus rien à dire, elle se ferme et l'écran
  // dessous reprend son geste.
  const sociale = useConnexionSociale({ apresConnexion: () => fermerPorte() });

  useEffect(() => {
    if (etat === "connecte" && raison !== null) fermerPorte();
  }, [etat, raison]);

  const continuerParEmail = useCallback(() => {
    // La porte se referme : l'intention, elle, reste pour le retour du code.
    fermerPorte();
    router.push("/email");
  }, [router]);

  return {
    ...sociale,
    visible: raison !== null,
    textes: raison === null ? null : textesDeLaPorte(raison),
    continuerParEmail,
    lire: useCallback((document: Document) => void ouvrirDocument(document), []),
    fermer: useCallback(() => fermerPorte(), []),
    plusTard: useCallback(() => fermerPorte(true), []),
  };
}
