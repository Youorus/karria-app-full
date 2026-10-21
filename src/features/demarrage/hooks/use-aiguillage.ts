/**
 * Où va-t-on à l'ouverture, et juste après s'être connecté ?
 *
 * ═══ Trois destinations ═══
 *
 * - personne de connecté → l'accueil ;
 * - connecté, et la question des notifications n'a jamais été posée sur
 *   cette installation → l'écran qui la pose ;
 * - connecté, sinon → les offres du jour.
 *
 * ═══ Pourquoi la décision est asynchrone ═══
 *
 * Savoir si la question a été posée demande une lecture du magasin et
 * une du système. Quelques millisecondes, pendant lesquelles l'écran de
 * chargement reste affiché — le même qu'au démarrage, donc rien ne
 * clignote. Rediriger d'abord vers les offres puis vers la question
 * ferait apparaître le fil une fraction de seconde avant de le cacher.
 *
 * ═══ En cas de doute, les offres ═══
 *
 * Si la lecture échoue, on entre dans l'application. Rater une question
 * de confort vaut mieux que bloquer quelqu'un sur un chargeur.
 */

import type { Href } from "expo-router";
import { useEffect, useState } from "react";

import { useSession } from "@/features/auth/hooks/use-session";
import { fautIlProposerLesNotifications } from "@/features/notifications/services/notifications";

export function useAiguillage(): Href | null {
  const { etat } = useSession();
  // Seule la destination d'une personne connectée se décide dans un effet :
  // l'accueil se déduit de l'état sans attendre, et sans rendu de plus.
  const [connecteVers, setConnecteVers] = useState<Href | null>(null);

  useEffect(() => {
    if (etat !== "connecte") return;

    let vivant = true;
    fautIlProposerLesNotifications().then(
      (proposer) => {
        if (vivant) setConnecteVers(proposer ? "/notifications" : "/offres");
      },
      (cause: unknown) => {
        console.warn("[karria] aiguillage des notifications impossible", cause);
        if (vivant) setConnecteVers("/offres");
      },
    );
    return () => {
      vivant = false;
    };
  }, [etat]);

  if (etat === "anonyme") return "/bienvenue";
  return etat === "connecte" ? connecteVers : null;
}
