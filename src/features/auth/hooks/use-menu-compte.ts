/**
 * Le menu du compte, provisoire.
 *
 * Une feuille d'actions système avec « Se déconnecter », sans plus. Le
 * vrai espace compte viendra avec ses écrans ; d'ici là, il faut pouvoir
 * sortir pour éprouver la connexion.
 */

import { useCallback } from "react";
import { Alert } from "react-native";

import { useSession } from "./use-session";

export function useMenuCompte(): () => void {
  const { fermer } = useSession();
  return useCallback(() => {
    Alert.alert("Ton compte", undefined, [
      { text: "Se déconnecter", style: "destructive", onPress: () => void fermer() },
      { text: "Annuler", style: "cancel" },
    ]);
  }, [fermer]);
}
