/**
 * La barre d'onglets flottante — `FloatingTabBar` de la V1, en verre natif.
 *
 * ═══ Ce qui est gardé de la V1 ═══
 *
 * - une **pilule centrée** qui épouse son contenu (pas une barre pleine
 *   largeur), à 10 pt au-dessus de la zone sûre, hauteur 62, rayon 31 ;
 * - cinq onglets : Offres (le K), Dossiers, CV, Modèles, Profil ;
 * - **le libellé n'apparaît que sur l'onglet actif**, dans une pastille
 *   claire — la largeur de chaque onglet s'anime en ressort quand on
 *   change d'onglet (damping 22, stiffness 230, ceux de la V1).
 *
 * ═══ Ce que la refonte change ═══
 *
 * La V1 floutait avec `expo-blur`. Ici, sur iOS 26, c'est le **Liquid
 * Glass** du système — le matériau des barres d'Apple elles-mêmes, qui
 * réfracte le fil qui défile dessous. Ailleurs (Android, iOS plus ancien),
 * un voile translucide (`bg-verre`) en reprend l'esprit, sans dépendance
 * de plus.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { Tabs } from "expo-router";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, useWindowDimensions } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  Easing,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icone, type NomIcone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ONGLET_INACTIF } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

/** Les propriétés que `Tabs` passe à sa barre — déduites de `Tabs`
 *  lui-même, pour ne dépendre d'aucun chemin interne d'expo-router. */
type ProprietesBarre = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

export const HAUTEUR_BARRE = 62;
export const ECART_BAS_BARRE = 10;

const VERRE = isLiquidGlassAvailable();

const ONGLETS: Record<
  string,
  { libelle: string; icone: NomIcone | "marque"; active?: NomIcone }
> = {
  offres: { libelle: "Offres", icone: "marque" },
  dossiers: { libelle: "Dossiers", icone: "dossiers", active: "dossiersPlein" },
  cv: { libelle: "CV", icone: "cv", active: "cvPlein" },
  modeles: { libelle: "Modèles", icone: "modeles", active: "modelesPlein" },
  profil: { libelle: "Profil", icone: "profil", active: "profilPlein" },
};

/** Le ressort de la V1 pour la largeur des onglets. */
const TRANSITION = LinearTransition.springify().damping(22).stiffness(230);

function Pilule({ children }: { children: ReactNode }) {
  if (VERRE) {
    return (
      // Le rayon en style : `GlassView` dessine sa forme lui-même.
      <GlassView glassEffectStyle="regular" style={{ borderRadius: 31 }}>
        {children}
      </GlassView>
    );
  }
  return (
    <Box className="rounded-full border border-border-subtle bg-verre shadow-lg">
      {children}
    </Box>
  );
}

export function BarreOnglets({ state, navigation, descriptors }: ProprietesBarre) {
  const couleurs = useCouleurs();
  const { bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inactif = ONGLET_INACTIF[couleurs.mode];

  // Un écran peut masquer la barre (`tabBarStyle: { display: "none" }`) :
  // l'agent de Karria le fait pendant qu'il est ouvert. Elle sort et
  // revient en fondu, avec une courbe sans rebond : un ressort ici se
  // lisait comme un tressautement à chaque fermeture de Karria.
  const actif = state.routes[state.index];
  const options = actif ? descriptors[actif.key]?.options : undefined;
  const masquee =
    typeof options?.tabBarStyle === "object" &&
    options.tabBarStyle !== null &&
    "display" in options.tabBarStyle &&
    options.tabBarStyle.display === "none";
  if (masquee) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(220).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      className="absolute left-0 right-0 items-center"
      style={{ bottom: Math.max(bottom, 8) + ECART_BAS_BARRE }}
    >
      <Box style={{ maxWidth: Math.min(width - 40, 500) }}>
        <Pilule>
          <HStack className="h-[62px] items-center p-[5px]">
            {state.routes.map((route, index) => {
              const config = ONGLETS[route.name];
              if (config === undefined) return null;
              const actif = state.index === index;
              const couleur = actif ? couleurs.primaire : inactif;

              const aller = () => {
                const evenement = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!actif && !evenement.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <Animated.View key={route.key} layout={TRANSITION}>
                  <Pressable
                    onPress={aller}
                    className={`h-[52px] min-w-[46px] flex-row items-center justify-center gap-1.5 rounded-[26px] px-4 active:opacity-70 ${
                      actif ? "bg-onglet-actif" : ""
                    }`}
                    accessibilityRole="tab"
                    accessibilityLabel={config.libelle}
                    accessibilityState={{ selected: actif }}
                  >
                    {config.icone === "marque" ? (
                      <SymboleKarria taille={22} couleur={couleur} />
                    ) : (
                      <Icone
                        nom={actif && config.active ? config.active : config.icone}
                        couleur={couleur}
                        taille={22}
                      />
                    )}
                    {actif ? (
                      <Animated.View entering={FadeIn.duration(180)}>
                        <Texte className="font-bold text-footnote tracking-tight text-primary">
                          {config.libelle}
                        </Texte>
                      </Animated.View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </HStack>
        </Pilule>
      </Box>
    </Animated.View>
  );
}
