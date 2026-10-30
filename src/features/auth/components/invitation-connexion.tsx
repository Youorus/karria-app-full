/**
 * L'invitation à se connecter : la feuille qui monte quand un invité fait
 * un geste qui demande un compte.
 *
 * Montée **une fois**, au-dessus de tout l'espace `(app)` : n'importe quel
 * écran l'ouvre par la porte (`hooks/porte-store.ts`), et la pile en
 * dessous ne bouge pas — c'est ce qui permet de reprendre le geste après la
 * connexion, exactement là où l'on était.
 */

import { Modal, Pressable } from "react-native";

import { Box } from "@/components/ui/box";

import { useInvitationConnexion } from "../hooks/use-invitation-connexion";
import { FeuilleConnexion } from "./feuille-connexion";

export function InvitationConnexion() {
  const invitation = useInvitationConnexion();
  if (invitation.textes === null) return null;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={invitation.visible}
      onRequestClose={invitation.fermer}
    >
      <Box className="flex-1 justify-end bg-scrim-fort">
        <Pressable
          style={{ flex: 1 }}
          onPress={invitation.fermer}
          accessibilityLabel="Fermer"
          accessibilityRole="button"
        />
        <FeuilleConnexion
          {...invitation}
          invitation
          titre={invitation.textes.titre}
          phrase={invitation.textes.phrase}
          onFermer={invitation.fermer}
          onPlusTard={invitation.plusTard}
        />
      </Box>
    </Modal>
  );
}
