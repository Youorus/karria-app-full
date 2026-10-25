/**
 * Les paramètres : l'apparence, les notifications, les documents, la
 * version, la déconnexion — et la porte vers la suppression du compte.
 *
 * ═══ La déconnexion demande confirmation ═══
 *
 * Comme la V1 (« Déconnexion ») : un bouton rouge touché par erreur ne
 * doit pas renvoyer à l'écran d'accueil sans prévenir.
 *
 * ═══ Les notifications, relues à chaque retour ═══
 *
 * La permission se change dans les réglages du téléphone, hors de
 * l'application. On la relit donc quand l'écran reprend la main, et non
 * une fois au montage — sinon « désactivées » resterait affiché après
 * qu'on les a réactivées. Et si elle a changé, l'appareil se réenregistre
 * pour que le serveur le sache.
 *
 * ═══ La suppression n'est pas ici ═══
 *
 * Elle a son écran : une raison à choisir, ce qui disparaît à lire, un
 * dernier geste. Une alerte système ne peut pas porter ça.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Linking } from "react-native";

import { useSession } from "@/features/auth/hooks/use-session";
import { ouvrirDocument, type Document } from "@/features/auth/services/documents";
import { synchroniserAppareil } from "@/features/notifications/hooks/synchroniser-appareil";
import { lirePermission } from "@/features/notifications/services/notifications";
import type { PermissionPush } from "@/features/notifications/types/appareils.types";
import {
  choixDeConfidentialiteRequis,
  ouvrirLesChoixDeConfidentialite,
} from "@/features/publicite/api/publicite.api";
import { useNavigationUnique } from "@/lib/navigation";
import { VERSION } from "@/lib/version";
import { useTheme, type Theme } from "@/theme/preference";

export interface Parametres {
  theme: Theme;
  changerTheme: (theme: Theme) => void;
  /** `null` tant qu'on ne sait pas : rien à afficher plutôt qu'un faux état. */
  notifications: PermissionPush | null;
  /** Refusées → les réglages du téléphone ; jamais demandées → l'écran
   *  qui les propose ; accordées → les réglages, pour les ajuster. */
  gererNotifications: () => void;
  /** UMP exige une entrée « gérer mes choix » (EEE) : la ligne s'affiche. */
  choixPublicitaires: boolean;
  gererChoixPublicitaires: () => void;
  lire: (document: Document) => void;
  seDeconnecter: () => void;
  supprimerLeCompte: () => void;
  retour: () => void;
  version: string;
}

export function useParametres(): Parametres {
  const { fermer } = useSession();
  const { theme, changerTheme } = useTheme();
  const { pousser, remplacer } = useNavigationUnique();
  const router = useRouter();
  const [notifications, setNotifications] = useState<PermissionPush | null>(null);
  const [choixPublicitaires, setChoixPublicitaires] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      void choixDeConfidentialiteRequis().then((requis) => {
        if (vivant) setChoixPublicitaires(requis);
      });
      return () => {
        vivant = false;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let vivant = true;
      void lirePermission().then((permission) => {
        if (!vivant) return;
        setNotifications((precedente) => {
          if (precedente !== null && precedente !== permission) {
            void synchroniserAppareil();
          }
          return permission;
        });
      });
      return () => {
        vivant = false;
      };
    }, []),
  );

  const gererNotifications = useCallback(() => {
    if (notifications === "undetermined") {
      pousser("/notifications");
      return;
    }
    void Linking.openSettings().catch((cause: unknown) =>
      console.warn("[karria] réglages inaccessibles", cause),
    );
  }, [notifications, pousser]);

  const seDeconnecter = useCallback(() => {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => void fermer() },
    ]);
  }, [fermer]);

  const retour = useCallback(() => {
    if (router.canGoBack()) router.back();
    else remplacer("/profil");
  }, [router, remplacer]);

  return {
    theme,
    changerTheme,
    notifications,
    gererNotifications,
    choixPublicitaires,
    gererChoixPublicitaires: useCallback(() => {
      ouvrirLesChoixDeConfidentialite().catch((cause: unknown) => {
        console.warn("[karria] choix publicitaires non ouverts", cause);
        Alert.alert(
          "Choix publicitaires indisponibles",
          "Vérifie ta connexion, puis réessaie.",
        );
      });
    }, []),
    lire: useCallback((document: Document) => void ouvrirDocument(document), []),
    seDeconnecter,
    supprimerLeCompte: useCallback(() => pousser("/compte/supprimer"), [pousser]),
    retour,
    version: VERSION,
  };
}
