/**
 * Le centre des notifications, monté une fois à la racine.
 *
 * ═══ Pourquoi à la racine, et non dans l'espace connecté ═══
 *
 * Une notification touchée peut lancer l'application avant que la
 * session soit relue, ou alors que personne n'est connecté. Montée dans
 * `(app)`, elle serait perdue : le groupe n'existe pas encore. Ici, elle
 * est reçue tout de suite, et l'aiguilleur la garde jusqu'à ce que
 * `peutNaviguer` dise oui — session ouverte, navigation montée, écrans
 * d'entrée passés.
 *
 * ═══ Les trois états de l'application ═══
 *
 * - **premier plan** : la bannière de Karria (`banniere`), qu'on touche
 *   pour ouvrir ou qui s'efface seule après `DUREE_BANNIERE_MS` ;
 * - **arrière-plan** : l'écouteur de réponses ;
 * - **lancement à froid** : `notificationQuiALance`, dédoublonnée avec
 *   l'écouteur par l'aiguilleur.
 *
 * ═══ La pile reconstruite ═══
 *
 * On revient d'abord à la racine des onglets (`dismissAll`), on choisit
 * l'onglet, puis on empile le détail : « retour » ramène toujours au fil
 * ou à la galerie, quel que soit l'écran où l'on était.
 */

import { useRootNavigationState, usePathname, useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useSession } from "@/features/auth/hooks/use-session";
import { ecranEquipeOuvert } from "@/features/equipe/services/presence";

import { AiguilleurNotifications } from "../services/aiguilleur";
import { analytiqueNotifications } from "../services/analytique";
import {
  effacerLaPastille,
  notificationQuiALance,
  preparerLesFamilles,
  surNotificationRecue,
  surReponse,
} from "../services/notifications";
import { peutNaviguer } from "../services/routeur-notifications";
import type { DestinationNotification } from "../types/notifications.types";

/** Le temps de lire deux lignes, sans que la bannière s'attarde. */
const DUREE_BANNIERE_MS = 6000;

export interface Banniere {
  cle: string;
  titre: string;
  corps: string | null;
  destination: DestinationNotification;
}

export interface CentreNotifications {
  banniere: Banniere | null;
  ouvrirBanniere: () => void;
  fermerBanniere: () => void;
}

type Routeur = ReturnType<typeof useRouter>;

function naviguerVers(routeur: Routeur, destination: DestinationNotification): void {
  const [base, ...dessus] = destination.pile;
  if (base === undefined) return;
  if (routeur.canDismiss()) routeur.dismissAll();
  // Les chemins sont validés par le routeur des notifications ; une route
  // inconnue tomberait sur l'écran « introuvable », jamais hors de l'app.
  routeur.navigate(base as Href);
  for (const ecran of dessus) routeur.push(ecran as Href);
}

export function useCentreNotifications(): CentreNotifications {
  const routeur = useRouter();
  const chemin = usePathname();
  const navigation = useRootNavigationState();
  const { etat } = useSession();

  const [aiguilleur] = useState(
    () => new AiguilleurNotifications(analytiqueNotifications),
  );
  // Le routeur change d'identité au fil des rendus ; l'aiguilleur, lui,
  // vit aussi longtemps que la racine et reçoit toujours le dernier.
  useEffect(
    () => aiguilleur.brancher((destination) => naviguerVers(routeur, destination)),
    [aiguilleur, routeur],
  );
  const [banniere, setBanniere] = useState<Banniere | null>(null);

  const connecte = etat === "connecte";
  const pret = peutNaviguer({
    connecte,
    navigationPrete: navigation?.key !== undefined,
    chemin,
  });
  useEffect(() => aiguilleur.signalerPret(pret), [aiguilleur, pret]);

  // Lu dans l'écouteur sans le réabonner à chaque changement de session.
  const connecteCourant = useRef(connecte);
  useEffect(() => {
    connecteCourant.current = connecte;
  }, [connecte]);

  useEffect(() => {
    let vivant = true;
    void preparerLesFamilles();
    void effacerLaPastille();

    void notificationQuiALance().then((reponse) => {
      if (vivant && reponse !== null)
        aiguilleur.repondre({ ...reponse, source: "lancement" });
    });
    const arreterReponses = surReponse((reponse) =>
      aiguilleur.repondre({ ...reponse, source: "systeme" }),
    );
    const arreterReceptions = surNotificationRecue((notification) => {
      const destination = aiguilleur.recevoir(notification.donnees);
      const titre = notification.titre ?? notification.corps;
      // Sans session, pas de bannière : elle mènerait à un écran fermé. La
      // notification reste dans le centre du système.
      if (titre === null || !connecteCourant.current) return;
      // La réponse de l'équipe est déjà à l'écran, arrivée en direct.
      if (destination.type === "support" && ecranEquipeOuvert()) return;
      setBanniere({
        cle: notification.identifiant,
        titre,
        corps: notification.titre === null ? null : notification.corps,
        destination,
      });
    });
    const arreterEtat = AppState.addEventListener("change", (etatApp) => {
      if (etatApp === "active") void effacerLaPastille();
    });
    return () => {
      vivant = false;
      arreterReponses();
      arreterReceptions();
      arreterEtat.remove();
    };
  }, [aiguilleur]);

  const fermerBanniere = useCallback(() => {
    if (banniere !== null) aiguilleur.banniere(banniere.destination, "ecartee");
    setBanniere(null);
  }, [aiguilleur, banniere]);

  const ouvrirBanniere = useCallback(() => {
    if (banniere !== null) aiguilleur.banniere(banniere.destination, "ouverte");
    setBanniere(null);
  }, [aiguilleur, banniere]);

  // Une nouvelle bannière relance le délai ; la précédente est remplacée.
  // L'expiration n'est pas un geste : elle ne compte pas comme « écartée ».
  const cleBanniere = banniere?.cle ?? null;
  useEffect(() => {
    if (cleBanniere === null) return;
    const minuterie = setTimeout(() => setBanniere(null), DUREE_BANNIERE_MS);
    return () => clearTimeout(minuterie);
  }, [cleBanniere]);

  return { banniere, ouvrirBanniere, fermerBanniere };
}
