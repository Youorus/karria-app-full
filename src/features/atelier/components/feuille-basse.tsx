/**
 * La feuille basse de l'atelier : ce qui monte sous la page sans la cacher.
 *
 * ═══ Deux hauteurs, une règle ═══
 *
 * - `demi` : une feuille transparente sur un voile léger, qui laisse le
 *   haut de la page visible — pour **voir le CV changer** pendant qu'on
 *   choisit un modèle, accepte une proposition, réordonne. C'est l'atelier :
 *   l'écran, c'est le CV.
 * - `pleine` : une feuille native (`pageSheet`) quand il y a un clavier —
 *   le formulaire d'un élément. Le clavier ne bouscule pas la page derrière,
 *   et l'on ferme d'un geste, comme les formulaires du CV.
 *
 * ═══ Le mouvement ═══
 *
 * La demi-feuille glisse depuis le bas sur la courbe des feuilles d'iOS,
 * 300 ms perçus ; le voile apparaît en fondu. On la ferme d'un toucher sur
 * le voile, du retour Android, ou d'un glissement vers le bas (seuil ou
 * vitesse : un petit coup sec suffit). Mouvement réduit : fondu seul.
 * Elle remonte avec le clavier (iOS) : un champ en bas de feuille — le code
 * couleur — reste visible pendant la saisie.
 */

import { useEffect, type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icone } from "@/components/icone";
import { useCouleurs } from "@/theme/use-couleurs";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { BORDS_FEUILLE_NATIVE } from "@/lib/feuille-native";

const COURBE_FEUILLE = Easing.bezier(0.32, 0.72, 0, 1);
const SEUIL_FERMETURE = 90;
const VITESSE_FERMETURE = 800;

interface Props {
  visible: boolean;
  titre: string;
  /** Une ligne sous le titre, quand elle aide. */
  sousTitre?: string | null;
  hauteur?: "demi" | "pleine";
  onFermer: () => void;
  /** Pour présenter une autre fenêtre une fois celle-ci fermée. */
  apresFermeture?: () => void;
  /** Un bouton à droite du titre (« Enregistrer », « Tout accepter »). */
  action?: { libelle: string; onPress: () => void; desactive?: boolean } | null;
  /** Ce qui reste visible sous le défilement (un bouton principal). */
  pied?: ReactNode;
  children: ReactNode;
}

function EnTete({
  titre,
  sousTitre,
  onFermer,
  action,
  fermerParCroix,
}: Pick<Props, "titre" | "sousTitre" | "onFermer" | "action"> & {
  fermerParCroix: boolean;
}) {
  const couleurs = useCouleurs();
  // La feuille pleine : « Annuler » à gauche, l'action à droite, comme les
  // formulaires du CV — on doit toujours pouvoir sortir sans enregistrer.
  if (fermerParCroix) {
    return (
      <VStack className="gap-1 px-5 pb-2 pt-3">
        <HStack className="flex-wrap items-center justify-between gap-x-2">
          <Pressable
            onPress={onFermer}
            className="min-h-touch min-w-touch justify-center"
            accessibilityRole="button"
            accessibilityLabel="Annuler"
          >
            <Texte className="text-body text-muted-foreground">Annuler</Texte>
          </Pressable>
          {action ? (
            <Pressable
              onPress={action.onPress}
              disabled={action.desactive}
              className={`min-h-touch justify-center ${action.desactive ? "opacity-40" : ""}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: action.desactive }}
            >
              <Texte className="font-bold text-body text-primary">{action.libelle}</Texte>
            </Pressable>
          ) : null}
        </HStack>
        <Texte
          accessibilityRole="header"
          className="font-display text-title-sm tracking-tight text-foreground"
        >
          {titre}
        </Texte>
        {sousTitre ? (
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {sousTitre}
          </Texte>
        ) : null}
      </VStack>
    );
  }
  return (
    <HStack className="flex-wrap items-start justify-between gap-x-3 px-5 pb-2 pt-3">
      <VStack className="flex-1 gap-0.5">
        <Texte
          accessibilityRole="header"
          className="font-display text-title-sm tracking-tight text-foreground"
        >
          {titre}
        </Texte>
        {sousTitre ? (
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {sousTitre}
          </Texte>
        ) : null}
      </VStack>
      <Pressable
        onPress={onFermer}
        className="min-h-touch min-w-touch items-center justify-center rounded-full bg-remplissage"
        accessibilityRole="button"
        accessibilityLabel="Fermer"
      >
        <Icone nom="fermer" couleur={couleurs.texte} taille={16} />
      </Pressable>
      {action ? (
        <Pressable
          onPress={action.onPress}
          disabled={action.desactive}
          className={`min-h-touch justify-center ${action.desactive ? "opacity-40" : ""}`}
          accessibilityRole="button"
          accessibilityState={{ disabled: action.desactive }}
        >
          <Texte className="font-bold text-body text-primary">{action.libelle}</Texte>
        </Pressable>
      ) : null}
    </HStack>
  );
}

function DemiFeuille({
  visible,
  titre,
  sousTitre,
  onFermer,
  apresFermeture,
  action,
  pied,
  children,
}: Props) {
  const reduit = useReducedMotion();
  const glissement = useSharedValue(0);
  useEffect(() => {
    if (visible) glissement.set(0);
  }, [visible, glissement]);

  const glisser = Gesture.Pan()
    .activeOffsetY([12, 9999])
    .onUpdate((e) => {
      glissement.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (glissement.get() > SEUIL_FERMETURE || e.velocityY > VITESSE_FERMETURE) {
        if (reduit) {
          scheduleOnRN(onFermer);
          return;
        }
        glissement.set(
          withTiming(600, { duration: 180, easing: COURBE_FEUILLE }, (fini) => {
            if (fini) scheduleOnRN(onFermer);
          }),
        );
      } else {
        glissement.set(
          reduit
            ? 0
            : withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: e.velocityY }),
        );
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: glissement.get() }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onFermer}
      onDismiss={apresFermeture}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          entering={FadeIn.duration(200).reduceMotion(ReduceMotion.System)}
          exiting={FadeOut.duration(160).reduceMotion(ReduceMotion.System)}
          style={{ flex: 1 }}
        >
          <Box style={{ flex: 1 }} className="justify-end bg-scrim">
            <Pressable
              style={{ flex: 1 }}
              onPress={onFermer}
              accessible={false}
              importantForAccessibility="no"
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <GestureDetector gesture={glisser}>
                <Animated.View
                  entering={
                    reduit
                      ? FadeIn.duration(200)
                      : SlideInDown.duration(320).easing(COURBE_FEUILLE)
                  }
                  style={style}
                >
                  <Box
                    accessibilityViewIsModal
                    className="max-h-[82vh] rounded-t-lg bg-background"
                  >
                    <Box className="items-center pt-2.5">
                      <Box className="h-1 w-9 rounded-full bg-border-champ" />
                    </Box>
                    <EnTete
                      titre={titre}
                      sousTitre={sousTitre}
                      onFermer={onFermer}
                      action={action}
                      fermerParCroix={false}
                    />
                    <ScrollView
                      contentContainerClassName="gap-4 px-5 pb-4"
                      showsVerticalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                    >
                      {children}
                    </ScrollView>
                    <SafeAreaView edges={["bottom"]}>
                      {pied ? (
                        <Box className="px-5 pb-2 pt-2">{pied}</Box>
                      ) : (
                        <Box className="h-2" />
                      )}
                    </SafeAreaView>
                  </Box>
                </Animated.View>
              </GestureDetector>
            </KeyboardAvoidingView>
          </Box>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function FeuillePleine({
  visible,
  titre,
  sousTitre,
  onFermer,
  apresFermeture,
  action,
  pied,
  children,
}: Props) {
  const reduit = useReducedMotion();
  return (
    <Modal
      visible={visible}
      animationType={reduit ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onFermer}
      onDismiss={apresFermeture}
    >
      <Box style={{ flex: 1 }} accessibilityViewIsModal className="bg-popover">
        <SafeAreaView style={{ flex: 1 }} edges={BORDS_FEUILLE_NATIVE}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <EnTete
              titre={titre}
              sousTitre={sousTitre}
              onFermer={onFermer}
              action={action}
              fermerParCroix
            />
            <ScrollView
              contentContainerClassName="gap-4 px-5 pb-8 pt-2"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {pied ? <Box className="px-5 pb-2 pt-2">{pied}</Box> : null}
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}

export function FeuilleBasse(props: Props) {
  const { visible, apresFermeture } = props;
  useEffect(() => {
    // Sous Android, la fenêtre est démontée dès ce rendu validé. iOS
    // conserve sa fenêtre pendant la fermeture et notifie ensuite onDismiss.
    if (!visible && Platform.OS === "android") apresFermeture?.();
  }, [visible, apresFermeture]);
  if (!visible && (Platform.OS !== "ios" || apresFermeture === undefined)) {
    return null;
  }
  return props.hauteur === "pleine" ? (
    <FeuillePleine {...props} />
  ) : (
    <DemiFeuille {...props} />
  );
}
