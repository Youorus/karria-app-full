/**
 * L'image choisie, avant de partir : on la voit en grand, on confirme.
 *
 * Une capture d'écran peut montrer plus qu'on ne voulait (une notification,
 * un nom). La revoir avant l'envoi est le seul moment où l'on peut encore
 * changer d'avis : une seule action principale, « Envoyer à l'équipe ».
 */

import { Image } from "expo-image";
import { Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import type { FichierAEnvoyer } from "../types/equipe.types";

interface Props {
  image: FichierAEnvoyer | null;
  onEnvoyer: () => void;
  onRenoncer: () => void;
}

export function ApercuImage({ image, onEnvoyer, onRenoncer }: Props) {
  return (
    <Modal
      visible={image !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onRenoncer}
    >
      <Box style={{ flex: 1 }} className="bg-background">
        <Aura />
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <VStack className="flex-1 gap-5 px-5 pb-4 pt-6">
            <Texte
              accessibilityRole="header"
              className="font-display text-title tracking-tight text-foreground"
            >
              Envoyer cette image ?
            </Texte>
            {image !== null ? (
              <Image
                source={{ uri: image.uri }}
                style={{ flex: 1, borderRadius: 18 }}
                contentFit="contain"
                accessibilityLabel="L'image que tu vas envoyer à l'équipe"
              />
            ) : null}
            <VStack className="gap-2">
              <BoutonAction libelle="Envoyer à l'équipe" onPress={onEnvoyer} />
              <BoutonAction libelle="Annuler" ton="discret" onPress={onRenoncer} />
            </VStack>
          </VStack>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}
