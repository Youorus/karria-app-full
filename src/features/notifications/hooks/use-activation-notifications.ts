/**
 * L'écran d'activation des notifications : ce qu'il affiche et déclenche.
 *
 * ═══ Deux sorties, une seule destination ═══
 *
 * Activer ou remettre à plus tard mènent toutes deux aux offres : cet
 * écran est une parenthèse entre la connexion et l'application, pas une
 * étape qu'on peut rater. On en sort par `quitterLeParcours` pour qu'un
 * geste de retour ne le fasse jamais réapparaître.
 *
 * ═══ La réponse se retient avant de continuer ═══
 *
 * Quelle qu'elle soit. Si l'enregistrement de l'appareil échoue ensuite,
 * la question ne se reposera pas pour autant : elle a eu sa réponse, et
 * l'appareil se réenregistrera à la prochaine ouverture.
 *
 * ═══ Un refus n'est pas une erreur ═══
 *
 * Refuser la boîte du système est une réponse légitime : aucun message,
 * aucun reproche. L'onglet Profil proposera les réglages si la personne
 * change d'avis.
 */

import { useCallback, useState } from "react";

import { retenirReponseNotifications } from "@/lib/installation";
import { useNavigationUnique } from "@/lib/navigation";

import { demanderPermission } from "../services/notifications";
import { synchroniserAppareil } from "./synchroniser-appareil";

export interface ActivationNotifications {
  /** La boîte du système est ouverte, ou l'appareil s'enregistre. */
  enCours: boolean;
  activer: () => Promise<void>;
  plusTard: () => Promise<void>;
}

export function useActivationNotifications(): ActivationNotifications {
  const { quitterLeParcours } = useNavigationUnique();
  const [enCours, setEnCours] = useState(false);

  const activer = useCallback(async () => {
    if (enCours) return;
    setEnCours(true);
    try {
      const permission = await demanderPermission();
      await retenirReponseNotifications(
        permission === "granted" ? "acceptee" : "refusee",
      );
      await synchroniserAppareil();
    } catch (cause) {
      // Le système a refusé de répondre — cas rarissime. On n'enferme pas
      // la personne sur cet écran pour autant : la question se reposera.
      console.warn("[karria] demande de permission impossible", cause);
    } finally {
      setEnCours(false);
    }
    quitterLeParcours("/offres");
  }, [enCours, quitterLeParcours]);

  const plusTard = useCallback(async () => {
    if (enCours) return;
    try {
      await retenirReponseNotifications("plus_tard");
    } catch (cause) {
      console.warn("[karria] réponse aux notifications non retenue", cause);
    }
    // Sans attendre : l'appareil s'enregistre pendant que les offres
    // s'affichent, et un échec ne se voit pas.
    void synchroniserAppareil();
    quitterLeParcours("/offres");
  }, [enCours, quitterLeParcours]);

  return { enCours, activer, plusTard };
}
