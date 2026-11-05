/**
 * Les cinq onglets de Karria — ceux de la V1 : Offres, Dossiers, CV,
 * Modèles, Profil.
 *
 * ═══ Le changement d'onglet : sec, volontairement ═══
 *
 * Il y a eu ici un fondu avec léger recul et glissement (`sceneStyleInterpolator`
 * + `transitionSpec`). Retiré le 2026-11-05 : sur l'iPhone de Marc, un
 * onglet revenait **vide** — son fond, rien dessus — après quelques
 * changements d'onglet, sur n'importe quel onglet. Avec une animation, la
 * navigation pilote l'opacité de chaque scène et l'état d'activité de
 * l'écran natif (`react-native-screens`) par des valeurs animées ; un
 * changement qui interrompt le précédent peut laisser une scène à opacité
 * zéro ou un écran détaché alors qu'il est au premier plan. Sans
 * animation, l'écran qui part est détaché tout de suite et celui qui arrive
 * est posé à opacité pleine : c'est le chemin que prennent presque toutes
 * les applications (WhatsApp, Instagram, LinkedIn), et il n'a pas d'état
 * intermédiaire où se perdre.
 *
 * La barre d'onglets, elle, garde ses propres mouvements (`BarreOnglets`).
 * Si l'on veut un jour retrouver de la profondeur, c'est **dans** les
 * écrans qu'il faudra la mettre, pas entre eux.
 */

import { Tabs } from "expo-router";

import { BarreOnglets } from "@/components/barre-onglets";
import { FOND } from "@/theme";
import { useTheme } from "@/theme/preference";

export default function LayoutOnglets() {
  const { mode } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <BarreOnglets {...props} />}
      screenOptions={{
        headerShown: false,
        animation: "none",
        sceneStyle: { backgroundColor: FOND[mode] },
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
