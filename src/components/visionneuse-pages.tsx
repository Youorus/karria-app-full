/**
 * La visionneuse plein écran : regarder une page de près.
 *
 * ═══ Le modèle : l'app Photos ═══
 *
 * Les gestes que tout le monde connaît déjà, sans rien à apprendre :
 *
 * - **pincer** pour zoomer (×1 à ×4), **toucher deux fois** pour passer à
 *   ×2,5 à l'endroit touché, ou revenir à ×1 ;
 * - zoomé, **glisser** pour parcourir la page ;
 * - non zoomé, **glisser de côté** pour changer de page (le CV, puis ses
 *   lettres) et **glisser vers le bas** pour fermer — l'image suit le
 *   doigt et le fond s'éclaircit à mesure ;
 * - ou le bouton Fermer, toujours à portée.
 *
 * ═══ Les marges, enfin justes ═══
 *
 * Une `Modal` est une fenêtre native à part : les marges de sécurité de
 * l'écran parent n'y arrivent pas, et un `SafeAreaView` y lit zéro — le
 * bouton Fermer finissait sous l'îlot dynamique. La visionneuse porte donc
 * son propre `SafeAreaProvider`, qui mesure la fenêtre de la modale.
 * Même raison pour `GestureHandlerRootView` : sans lui, les gestes ne
 * fonctionnent pas dans une modale sur Android.
 */

import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { AURA } from "@/theme";

export interface PageVisionneuse {
  cle: string;
  libelle: string;
  image: string;
}

const ZOOM_MAX = 4;
const ZOOM_DOUBLE = 2.5;
const SEUIL_FERMETURE = 120;
const RESSORT = { damping: 20, stiffness: 200 };

function Page({
  page,
  largeur,
  hauteur,
  glissement,
  onFermer,
  onZoom,
}: {
  page: PageVisionneuse;
  largeur: number;
  hauteur: number;
  /** Le glissement vertical partagé : le fond s'éclaircit avec lui. */
  glissement: SharedValue<number>;
  onFermer: () => void;
  onZoom: (zoome: boolean) => void;
}) {
  const echelle = useSharedValue(1);
  const echelleDepart = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const xDepart = useSharedValue(0);
  const yDepart = useSharedValue(0);

  /** Ramène le décalage dans les bords de l'image agrandie. */
  const borner = (valeur: number, taille: number, e: number) => {
    "worklet";
    const max = Math.max(0, (taille * e - taille) / 2);
    return Math.min(max, Math.max(-max, valeur));
  };

  const pincement = Gesture.Pinch()
    .onStart(() => {
      echelleDepart.value = echelle.value;
    })
    .onUpdate((e) => {
      echelle.value = Math.min(ZOOM_MAX, Math.max(1, echelleDepart.value * e.scale));
    })
    .onEnd(() => {
      if (echelle.value <= 1.02) {
        echelle.value = withSpring(1, RESSORT);
        x.value = withSpring(0, RESSORT);
        y.value = withSpring(0, RESSORT);
        runOnJS(onZoom)(false);
      } else {
        x.value = withSpring(borner(x.value, largeur, echelle.value), RESSORT);
        y.value = withSpring(borner(y.value, hauteur, echelle.value), RESSORT);
        runOnJS(onZoom)(true);
      }
    });

  const doubleToucher = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (echelle.value > 1) {
        echelle.value = withSpring(1, RESSORT);
        x.value = withSpring(0, RESSORT);
        y.value = withSpring(0, RESSORT);
        runOnJS(onZoom)(false);
      } else {
        // On zoome vers l'endroit touché, pas vers le centre.
        echelle.value = withSpring(ZOOM_DOUBLE, RESSORT);
        x.value = withSpring(
          borner((largeur / 2 - e.x) * (ZOOM_DOUBLE - 1), largeur, ZOOM_DOUBLE),
          RESSORT,
        );
        y.value = withSpring(
          borner((hauteur / 2 - e.y) * (ZOOM_DOUBLE - 1), hauteur, ZOOM_DOUBLE),
          RESSORT,
        );
        runOnJS(onZoom)(true);
      }
    });

  const glisser = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      xDepart.value = x.value;
      yDepart.value = y.value;
    })
    .onUpdate((e) => {
      if (echelle.value > 1) {
        x.value = borner(xDepart.value + e.translationX, largeur, echelle.value);
        y.value = borner(yDepart.value + e.translationY, hauteur, echelle.value);
      } else if (e.translationY > 0) {
        // Non zoomé : seul le glissement vers le bas compte (fermer).
        glissement.set(e.translationY);
      }
    })
    .onEnd((e) => {
      if (echelle.value > 1) return;
      if (glissement.value > SEUIL_FERMETURE || e.velocityY > 900) {
        glissement.set(withTiming(hauteur, { duration: 180 }, () => runOnJS(onFermer)()));
      } else {
        glissement.set(withSpring(0, RESSORT));
      }
    })
    // Le glissement de côté reste à la liste (changer de page) tant qu'on
    // n'est pas zoomé : le geste ne s'active qu'à la verticale.
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24]);

  const gestes = Gesture.Simultaneous(pincement, glisser, doubleToucher);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + glissement.value },
      {
        scale:
          echelle.value * interpolate(glissement.value, [0, hauteur], [1, 0.8], "clamp"),
      },
    ],
  }));

  return (
    <GestureDetector gesture={gestes}>
      <Animated.View style={[{ width: largeur, height: hauteur }, style]}>
        <Image
          source={{ uri: page.image }}
          style={{ width: largeur, height: hauteur }}
          contentFit="contain"
          accessibilityLabel={page.libelle}
        />
      </Animated.View>
    </GestureDetector>
  );
}

function Contenu({
  pages,
  depart,
  onFermer,
}: {
  pages: PageVisionneuse[];
  depart: number;
  onFermer: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const marges = useSafeAreaInsets();
  // États purement visuels : la page affichée, et le zoom en cours (qui
  // bloque le passage d'une page à l'autre).
  const [index, setIndex] = useState(depart);
  const [zoome, setZoome] = useState(false);
  const glissement = useSharedValue(0);

  const styleFond = useAnimatedStyle(() => ({
    opacity: interpolate(glissement.value, [0, 300], [1, 0.2], "clamp"),
  }));
  const styleChrome = useAnimatedStyle(() => ({
    opacity: interpolate(glissement.value, [0, 80], [1, 0], "clamp"),
  }));

  return (
    <Box style={{ flex: 1 }}>
      <Animated.View
        style={[
          { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
          styleFond,
        ]}
      >
        <Box className="flex-1 bg-inverse" />
      </Animated.View>

      {/* Un défilement paginé simple plutôt qu'une `FlatList` : deux ou
          trois pages n'ont rien à virtualiser, et la liste virtualisée
          mesurait une fenêtre vide à la première image de la modale
          (« Invalid cells around viewport [NaN, NaN] »). */}
      <ScrollView
        horizontal
        pagingEnabled
        scrollEnabled={!zoome}
        contentOffset={{ x: depart * width, y: 0 }}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {pages.map((page) => (
          <Page
            key={page.cle}
            page={page}
            largeur={width}
            hauteur={height}
            glissement={glissement}
            onFermer={onFermer}
            onZoom={setZoome}
          />
        ))}
      </ScrollView>

      {/* La barre du haut, sous l'îlot dynamique grâce aux vraies marges. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          { position: "absolute", left: 0, right: 0, top: marges.top + 8 },
          styleChrome,
        ]}
      >
        <HStack className="items-center justify-between px-4">
          <Box className="rounded-full bg-scrim-fort px-3 py-1.5">
            <Texte className="font-bold text-footnote text-on-scrim">
              {pages[index]?.libelle ?? ""}
              {pages.length > 1 ? `  ·  ${index + 1}/${pages.length}` : ""}
            </Texte>
          </Box>
          <Pressable
            onPress={onFermer}
            hitSlop={8}
            className="h-touch w-touch items-center justify-center rounded-full bg-scrim-fort"
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Icone nom="fermer" couleur={AURA.reflet} taille={16} graisse="semibold" />
          </Pressable>
        </HStack>
      </Animated.View>

      {pages.length > 1 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: "absolute", left: 0, right: 0, bottom: marges.bottom + 16 },
            styleChrome,
          ]}
        >
          <HStack className="gap-1.5 self-center rounded-full bg-scrim-fort px-2.5 py-2">
            {pages.map((p, i) => (
              <Box
                key={p.cle}
                className={`h-1.5 rounded-full ${i === index ? "w-5 bg-primary" : "w-1.5 bg-on-scrim-doux"}`}
              />
            ))}
          </HStack>
        </Animated.View>
      ) : null}
    </Box>
  );
}

interface Props {
  pages: PageVisionneuse[];
  /** La page ouverte, ou `null` quand la visionneuse est fermée. */
  depart: number | null;
  onFermer: () => void;
}

export function VisionneusePages({ pages, depart, onFermer }: Props) {
  return (
    <Modal
      visible={depart !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onFermer}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          {depart !== null ? (
            <Contenu pages={pages} depart={depart} onFermer={onFermer} />
          ) : null}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
