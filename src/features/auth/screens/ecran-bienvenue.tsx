/**
 * L'accueil : la seule porte d'entrée de Karria.
 *
 * ═══ Ce qu'il doit faire en trois secondes ═══
 *
 * Dire ce qu'est Karria et laisser entrer d'un geste. Marc l'a redessiné
 * (2026-10-29) : une image de fond (le « doodle » de la marque, clair ou
 * sombre selon le thème) sur la moitié haute, une fiche épurée en bas avec
 * un seul bouton « Commencer », et une feuille de connexion qui monte
 * par-dessus. Pas de carrousel, pas de formulaire.
 *
 * ═══ L'ordre des boutons, et la règle d'Apple ═══
 *
 * Apple exige que « Continuer avec Apple » soit une option **équivalente**
 * aux autres connexions tierces : même ton, même taille. Apple et Google
 * sont donc identiques. L'e-mail est le bouton principal — le seul en
 * bleu plein (AGENTS.md §7) — parce que c'est le seul chemin disponible
 * partout.
 *
 * ═══ Le consentement ═══
 *
 * Une phrase sous les boutons, avec les deux liens. Continuer vaut
 * acceptation ; les versions partent avec la requête de connexion (voir
 * `services/consentements.ts`). Il n'y a pas de case à cocher : elle
 * ajouterait un geste à chaque inscription sans rien prouver de plus.
 *
 * La feuille est un `Modal` natif et son état d'ouverture est purement
 * visuel : c'est le seul `useState` qu'un écran a le droit de porter (§3.1).
 */

import { useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { LogoApple, LogoGoogle } from "../components/logos-fournisseurs";
import { useAccueil } from "../hooks/use-accueil";

export function EcranBienvenue() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const [modalVisible, setModalVisible] = useState(false);

  const {
    enCours,
    erreur,
    connecter,
    appleDisponible,
    effacerErreur,
    continuerParEmail,
    lire,
    adieu,
  } = useAccueil();

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

              {/* Bouton principal Commencer */}
              <VStack space="sm" className="w-full pt-4">
                <BoutonAction
                  libelle="Commencer"
                  ton="principal"
                  onPress={() => setModalVisible(true)}
                />
              </VStack>
            </VStack>
          </SafeAreaView>
        </View>
      </View>

      {/* MODAL / SHEET DE CONNEXION */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Box className="flex-1 justify-end bg-scrim-fort">
          <Pressable style={{ flex: 1 }} onPress={() => setModalVisible(false)} />

          <View className="rounded-t-[32px] border-t border-border-subtle bg-card p-6 pb-8">
            <SafeAreaView edges={["bottom"]}>
              <VStack space="md">
                <HStack className="items-center justify-between pb-1">
                  <Box className="w-8" />
                  <Texte className="text-center font-display text-title-sm text-foreground">
                    Connexion ou inscription
                  </Texte>
                  <Pressable
                    onPress={() => setModalVisible(false)}
                    className="h-8 w-8 items-center justify-center rounded-full bg-remplissage active:opacity-70"
                    accessibilityLabel="Fermer"
                  >
                    <Texte className="font-bold text-body text-muted-foreground">✕</Texte>
                  </Pressable>
                </HStack>

                <Texte className="px-4 text-center text-footnote text-muted-foreground">
                  Choisissez votre méthode préférée pour accéder à votre compte.
                </Texte>

                {erreur !== null ? (
                  <MessageErreur
                    message={erreur}
                    action={effacerErreur}
                    libelleAction="Compris"
                  />
                ) : null}

                <VStack space="sm" className="pt-2">
                  <BoutonAction
                    libelle="Continuer avec un e-mail"
                    ton="principal"
                    desactive={enCours !== null}
                    onPress={() => {
                      setModalVisible(false);
                      continuerParEmail();
                    }}
                  />

                  <BoutonAction
                    libelle="Continuer avec Google"
                    ton="secondaire"
                    icone={<LogoGoogle />}
                    enCours={enCours === "google"}
                    libelleEnCours="Connexion…"
                    desactive={enCours !== null}
                    onPress={() => void connecter("google")}
                  />

                  {appleDisponible ? (
                    <BoutonAction
                      libelle="Continuer avec Apple"
                      ton="secondaire"
                      icone={<LogoApple couleur={couleurs.texte} />}
                      enCours={enCours === "apple"}
                      libelleEnCours="Connexion…"
                      desactive={enCours !== null}
                      onPress={() => void connecter("apple")}
                    />
                  ) : null}
                </VStack>

                <VStack space="xs" className="pt-3 items-center">
                  <Texte className="px-2 text-center text-caption text-muted-foreground">
                    En continuant, vous acceptez nos{" "}
                    <Texte
                      className="font-bold text-caption text-foreground underline"
                      accessibilityRole="link"
                      onPress={() => lire("conditions")}
                    >
                      Conditions Générales
                    </Texte>{" "}
                    et notre{" "}
                    <Texte
                      className="font-bold text-caption text-foreground underline"
                      accessibilityRole="link"
                      onPress={() => lire("confidentialite")}
                    >
                      Politique de Confidentialité
                    </Texte>
                    .
                  </Texte>
                </VStack>
              </VStack>
            </SafeAreaView>
          </View>
        </Box>
      </Modal>
    </Box>
  );
}
