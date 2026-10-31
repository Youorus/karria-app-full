/**
 * Le bouton flottant « Parler à l'équipe » du Profil : où il mène, et son
 * point de non-lu.
 *
 * ═══ Le non-lu ═══
 *
 * Relu à chaque retour sur le Profil et à chaque retour au premier plan —
 * c'est là que la personne revient après avoir écarté une notification.
 * Une requête légère (`/support/me/unread`) qui ne crée rien. Pas de flux
 * ici : le Profil n'est pas une conversation, quelques secondes de retard
 * sur un point discret ne coûtent rien.
 *
 * ═══ Sans compte ═══
 *
 * Le bouton reste visible : on doit pouvoir trouver l'équipe avant de
 * s'inscrire. Le toucher ouvre la porte de connexion, et l'échange s'ouvre
 * tout seul une fois la session ouverte (`useReprise`).
 */

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { AppState } from "react-native";

import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
import { useNavigationUnique } from "@/lib/navigation";

import { lireNonLu } from "../api/equipe.api";

const INTENTION = "equipe.ouvrir";

export interface BoutonEquipe {
  nonLu: boolean;
  ouvrir: () => void;
}

export function useBoutonEquipe(): BoutonEquipe {
  const { pousser } = useNavigationUnique();
  const { exiger, invite } = usePorte();
  const [nonLu, setNonLu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (invite) return undefined;
      let vivant = true;
      const lire = () =>
        lireNonLu().then(
          (valeur) => {
            if (vivant) setNonLu(valeur);
          },
          (cause: unknown) =>
            console.warn("[karria] non-lu de l'équipe illisible", cause),
        );
      void lire();
      // Revenir au premier plan sur le Profil, c'est souvent revenir d'une
      // notification écartée : on relit.
      const abonnement = AppState.addEventListener("change", (etat) => {
        if (etat === "active") void lire();
      });
      return () => {
        vivant = false;
        abonnement.remove();
      };
    }, [invite]),
  );

  const ouvrir = useCallback(() => {
    if (exiger("equipe", { cle: INTENTION })) pousser("/equipe");
  }, [exiger, pousser]);

  useReprise(
    INTENTION,
    useCallback(() => pousser("/equipe"), [pousser]),
  );

  return { nonLu: !invite && nonLu, ouvrir };
}
