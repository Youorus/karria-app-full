/**
 * Les cinq onglets de Karria — ceux de la V1 : Offres, Dossiers, CV,
 * Modèles, Profil.
 *
 * ═══ Le changement d'onglet ═══
 *
 * Pas de coupure sèche. L'écran qui part recule légèrement et glisse de
 * son côté pendant que le nouveau arrive du sien, en fondu : la même
 * sensation de profondeur que les applications d'IA, où l'on change de
 * plan plutôt que de page. Une courbe courte (240 ms) pour que le geste
 * reste instantané.
 */

import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Easing } from "react-native";

import { BarreOnglets } from "@/components/barre-onglets";
import { FOND } from "@/theme";
import { useTheme } from "@/theme/preference";

type OptionsOnglets = NonNullable<ComponentProps<typeof Tabs>["screenOptions"]>;
type Interpolateur = NonNullable<
  Extract<OptionsOnglets, { sceneStyleInterpolator?: unknown }>["sceneStyleInterpolator"]
>;

/** La profondeur : fondu, léger recul et glissement directionnel. */
const profondeur: Interpolateur = ({ current }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-28, 0, 28],
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.96, 1, 0.96],
        }),
      },
    ],
  },
});

export default function LayoutOnglets() {
  const { mode } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BarreOnglets {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: FOND[mode] },
        sceneStyleInterpolator: profondeur,
        transitionSpec: {
          animation: "timing",
          config: { duration: 240, easing: Easing.out(Easing.cubic) },
        },
      }}
    >
      <Tabs.Screen name="offres" />
      <Tabs.Screen name="dossiers" />
      <Tabs.Screen name="cv" />
      <Tabs.Screen name="modeles" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}
