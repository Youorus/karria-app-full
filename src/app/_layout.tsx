/**
 * La racine de l'application : les fournisseurs, puis la navigation.
 *
 * ═══ L'ordre des fournisseurs ═══
 *
 * Du plus général au plus particulier. Les gestes en premier — tout ce
 * qui se touche en dépend. Le thème avant tout ce qui lit une couleur :
 * monté plus bas, le premier rendu prendrait le thème du système avant de
 * basculer. La session ensuite, parce que l'aiguillage la lit.
 *
 * ═══ Rien ne s'affiche avant d'être prêt ═══
 *
 * Tant que les polices ne sont pas chargées et que la session n'est pas
 * relue, on montre l'écran de chargement — l'orbe, à la place exacte du
 * symbole de l'écran natif. Sans cela, l'accueil s'afficherait un
 * instant à quelqu'un de connecté, puis disparaîtrait.
 *
 * Une police qui échoue n'empêche pas d'entrer : on retombe sur celle du
 * système. Bloquer l'application pour une question de typographie serait
 * absurde.
 */

import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaListener } from "react-native-safe-area-context";
import { Uniwind } from "uniwind";

import { RenvoiClavier } from "@/components/renvoi-clavier";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { FournisseurDeSession, useSession } from "@/features/auth/hooks/use-session";
import { EcranChargement } from "@/features/demarrage/screens/ecran-chargement";
import { configurerLaReception } from "@/features/notifications/services/notifications";
import { FOND } from "@/theme";
import { FournisseurDeTheme, useTheme } from "@/theme/preference";
import "@/global.css";

// L'écran natif reste affiché jusqu'à ce que le premier rendu soit prêt.
// Appelé au chargement du module : appelé dans un composant, il arriverait
// trop tard, l'écran natif ayant déjà disparu.
SplashScreen.preventAutoHideAsync();

// Même raison : une notification peut arriver avant le premier rendu, et
// c'est au chargement du module qu'on dit au système de l'afficher.
configurerLaReception();

export default function RootLayout() {
  return (
    <SafeAreaListener
      onChange={({ insets }) => {
        // UniWind lit les marges de sécurité pour ses classes `pt-safe`.
        Uniwind.updateInsets(insets);
      }}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <RenvoiClavier>
          <FournisseurDeTheme>
            <GluestackUIProvider mode="system">
              <FournisseurDeSession>
                <FondDeRacine>
                  <Portail />
                </FondDeRacine>
              </FournisseurDeSession>
            </GluestackUIProvider>
          </FournisseurDeTheme>
        </RenvoiClavier>
      </GestureHandlerRootView>
    </SafeAreaListener>
  );
}

/**
 * Le fond derrière toute la navigation. Sans lui, une transition laisse
 * voir un éclair blanc entre deux écrans en mode sombre.
 */
function FondDeRacine({ children }: { children: ReactNode }) {
  const { mode } = useTheme();
  return <View style={{ flex: 1, backgroundColor: FOND[mode] }}>{children}</View>;
}

function Portail() {
  const { etat } = useSession();
  const { mode } = useTheme();
  const [policesPretes, echecPolices] = useFonts({
    Manrope: Manrope_400Regular,
    ManropeMedium: Manrope_500Medium,
    ManropeBold: Manrope_700Bold,
    ManropeExtraBold: Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (echecPolices) {
      console.warn(
        "[karria] polices non chargées, repli sur la police système",
        echecPolices,
      );
    }
  }, [echecPolices]);

  const peutDessiner = policesPretes || echecPolices !== null;

  useEffect(() => {
    if (peutDessiner) {
      void SplashScreen.hideAsync();
    }
  }, [peutDessiner]);

  if (!peutDessiner || etat === "verification") {
    return <EcranChargement />;
  }

  return (
    <>
      {/* `auto` : la barre d'état s'inverse avec le thème. */}
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: FOND[mode] },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="bienvenue" />
        <Stack.Screen name="(connexion)" />
        {/* L'assistant remplace l'accueil sans animation de pile : on
            entre dans l'application, on ne « va » pas quelque part. */}
        <Stack.Screen name="(app)" options={{ animation: "fade" }} />
      </Stack>
    </>
  );
}
