/**
 * L'accueil : la porte d'entrée de Karria — avec ou sans compte.
 *
 * ═══ Ce qu'il doit faire en trois secondes ═══
 *
 * Dire ce qu'est Karria et laisser entrer d'un geste. Marc l'a redessiné
 * (2026-10-29) : une image de fond (le « doodle » de la marque, clair ou
 * sombre selon le thème) sur la moitié haute, une fiche épurée en bas avec
 * un bouton « Commencer », et la feuille de connexion qui monte par-dessus.
 * Pas de carrousel, pas de formulaire.
 *
 * ═══ Découvrir les offres, sans compte ═══
 *
 * Les offres ne sont pas un contenu de compte (App Store 5.1.1 v) : un
 * second bouton, en retrait, ouvre le fil en lecture. Un compte se propose
 * ensuite, au premier geste qui en demande un (garder, Karria, CV), par
 * l'invitation du mode invité — jamais avant.
 *
 * La feuille est un `Modal` natif et son état d'ouverture est purement
 * visuel : c'est le seul `useState` qu'un écran a le droit de porter (§3.1).
 * Son contenu est `FeuilleConnexion`, la même feuille que l'invitation.
 */

import { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { FeuilleConnexion } from "../components/feuille-connexion";
import { useAccueil } from "../hooks/use-accueil";

export function EcranBienvenue() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const [modalVisible, setModalVisible] = useState(false);
  const accueil = useAccueil();
  const { continuerParEmail, decouvrir, adieu } = accueil;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <View className="flex-1">
        {/* Partie supérieure 55% : Image de fond Doodle avec Logo K au centre */}
        <View className="h-[55%] w-full overflow-hidden bg-muted">
          <Image
            source={
              couleurs.mode === "light"
                ? require("@/assets/branding/welcome-doodle-bg-light.png")
                : require("@/assets/branding/welcome-doodle-bg-dark.png")
            }
            // Taille en style : `Image` de React Native ne lit pas de classe.
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>

        {/* Partie inférieure 45% : Fiche unique épurée */}
        <View className="-mt-8 flex-1 rounded-t-[36px] border-t border-border-subtle bg-card px-6 pb-6 pt-7">
          <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
            <VStack className="flex-1 justify-between">
              <VStack space="md" className="items-center text-center pt-2">
                <Texte
                  accessibilityRole="header"
                  className="text-center font-display text-title-lg text-foreground"
                >
                  Bienvenue sur Karria !
                </Texte>
                <Texte className="px-2 text-center text-body text-muted-foreground leading-relaxed">
                  Karria travaille 24h/24 et 7j/7 pour toi et analyse des dizaines de
                  milliers d&apos;offres chaque jour pour t&apos;aider à trouver ton
                  prochain travail.
                </Texte>

                {adieu ? (
                  <Animated.View
                    entering={reduit ? undefined : FadeInDown.duration(500)}
                    className="mt-2 self-stretch"
                  >
                    <HStack className="items-center gap-2.5 rounded-md border border-border-subtle bg-card px-4 py-2.5">
                      <Icone nom="main" couleur={couleurs.primaire} taille={16} />
                      <Texte
                        className="flex-1 text-footnote text-foreground"
                        accessibilityRole="alert"
                      >
                        Ton compte est supprimé. Merci d&apos;avoir essayé Karria, et
                        bonne route.
                      </Texte>
                    </HStack>
                  </Animated.View>
                ) : null}
              </VStack>

              {/* Commencer (compte), puis découvrir sans compte, en retrait. */}
              <VStack space="sm" className="w-full pt-4">
                <BoutonAction
                  libelle="Commencer"
                  ton="principal"
                  onPress={() => setModalVisible(true)}
                />
                <BoutonAction
                  libelle="Découvrir les offres"
                  ton="secondaire"
                  onPress={decouvrir}
                  accessibilityHint="Parcourir les offres sans créer de compte"
                />
              </VStack>
            </VStack>
          </SafeAreaView>
        </View>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Box className="flex-1 justify-end bg-scrim-fort">
          <Pressable style={{ flex: 1 }} onPress={() => setModalVisible(false)} />
          <FeuilleConnexion
            {...accueil}
            titre="Connexion ou inscription"
            phrase="Choisis ta méthode préférée pour accéder à ton compte."
            continuerParEmail={() => {
              setModalVisible(false);
              continuerParEmail();
            }}
            onFermer={() => setModalVisible(false)}
          />
        </Box>
      </Modal>
    </Box>
  );
}
