/**
 * Proposer les notifications, une fois, juste après être entré.
 *
 * ═══ Pourquoi un écran, et pas la boîte du système directement ═══
 *
 * La boîte d'iOS ne se montre qu'une fois : refusée, il faut aller dans
 * les réglages pour revenir dessus, et presque personne n'y va. On
 * explique donc **avant** — ce que Karria enverra, et pourquoi c'est
 * utile — et l'on ne déclenche la boîte que sur un geste volontaire. Les
 * taux d'acceptation doublent avec cette étape ; c'est pour cela que
 * toutes les grandes applications la font.
 *
 * ═══ La mise en scène ═══
 *
 * Karria parle : l'orbe vivante, un titre à la première personne, trois
 * raisons courtes. Une seule action en bleu plein ; « Plus tard » existe
 * sans peser. Une ligne rassure : rien n'est définitif.
 */

import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { TitreAccentue } from "@/components/titre-accentue";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import { useActivationNotifications } from "../hooks/use-activation-notifications";

const RAISONS: readonly string[] = [
  "Une offre qui te correspond vraiment, dès qu'elle sort.",
  "Ton CV prêt, sans avoir à revenir vérifier.",
  "Jamais de bruit : seulement ce qui te concerne.",
];

export function EcranActivationNotifications() {
  const reduit = useReducedMotion();
  const { enCours, activer, plusTard } = useActivationNotifications();

  return (
    // `flex: 1` en style : le conteneur racine d'un écran, seule exception
    // admise à la règle §3.2.
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura active assise />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <VStack className="flex-1 px-5 pb-3">
          {/* Le vide autour de l'orbe cède sur un petit téléphone, jamais
              les boutons : c'est lui qui prend `flex-1`. */}
          <VStack className="flex-1 items-center justify-center gap-7">
            <OrbeVivante taille={120} active>
              <SymboleKarria taille={44} teinte="reflet" />
            </OrbeVivante>

            <Animated.View
              entering={reduit ? undefined : FadeInDown.duration(500).delay(200)}
            >
              <VStack className="items-center gap-3">
                <TitreAccentue
                  avant={"Je te préviens\n"}
                  accent="au bon moment."
                  className="text-center"
                />
                <Texte className="px-2 text-center text-body text-muted-foreground">
                  Je travaille pour toi même quand l&apos;application est fermée. Une
                  notification, et tu sais.
                </Texte>
              </VStack>
            </Animated.View>

            <Animated.View
              entering={reduit ? undefined : FadeInDown.duration(500).delay(450)}
              className="w-full"
            >
              <VStack className="gap-3 rounded-lg border border-border-subtle bg-card p-4">
                {RAISONS.map((raison, i) => (
                  <Texte
                    key={raison}
                    className={`text-body text-foreground ${i > 0 ? "border-t border-border-subtle pt-3" : ""}`}
                  >
                    {raison}
                  </Texte>
                ))}
              </VStack>
            </Animated.View>
          </VStack>

          <Animated.View entering={reduit ? undefined : FadeIn.duration(400).delay(700)}>
            <VStack className="gap-1">
              <BoutonAction
                libelle="Activer les notifications"
                libelleEnCours="Un instant…"
                enCours={enCours}
                onPress={() => void activer()}
              />
              <BoutonAction
                libelle="Plus tard"
                ton="discret"
                desactive={enCours}
                onPress={() => void plusTard()}
              />
              <Texte className="px-4 text-center text-caption text-muted-foreground">
                Tu pourras changer d&apos;avis à tout moment, depuis ton profil ou les
                réglages du téléphone.
              </Texte>
            </VStack>
          </Animated.View>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
