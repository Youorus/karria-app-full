/**
 * « Parler à l'équipe » : la capsule qui flotte au-dessus du Profil.
 *
 * ═══ Pourquoi flottante ═══
 *
 * Demandé par Marc : on doit la trouver sans la chercher, où que l'on soit
 * dans le Profil, sans qu'elle prenne la place d'une carte. Elle survole le
 * contenu, juste au-dessus de la barre d'onglets, à droite — sous le pouce.
 * Même matériau que la barre (verre sur iOS 26, voile ailleurs) : elle
 * appartient à l'interface, pas au contenu.
 *
 * ═══ Le non-lu ═══
 *
 * Un point bleu, petit, posé sur le bord de la capsule — rien de plus. Pas
 * de chiffre (une conversation n'est pas une boîte de réception), et le
 * lecteur d'écran l'annonce en toutes lettres.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Pressable } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ECART_BAS_BARRE, HAUTEUR_BARRE } from "@/components/barre-onglets";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

const VERRE = isLiquidGlassAvailable();
/** L'écart entre la capsule et la barre d'onglets. */
const ECART_AU_DESSUS_BARRE = 14;

interface Props {
  nonLu: boolean;
  onPress: () => void;
}

export function BoutonParlerEquipe({ nonLu, onPress }: Props) {
  const { bottom } = useSafeAreaInsets();
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();

  const contenu = (
    <HStack className="min-h-touch items-center gap-2 px-5">
      <Icone nom="bulle" couleur={couleurs.texte} taille={17} graisse="medium" />
      <Texte className="font-bold text-callout text-foreground">
        {"Parler à l'équipe"}
      </Texte>
    </HStack>
  );

  return (
    <Animated.View
      entering={reduit ? undefined : FadeInDown.duration(380).delay(420)}
      pointerEvents="box-none"
      // Position absolue calculée sur la zone sûre et la barre : aucune
      // classe ne sait lire un encart d'écran.
      style={{
        position: "absolute",
        right: 20,
        bottom: bottom + ECART_BAS_BARRE + HAUTEUR_BARRE + ECART_AU_DESSUS_BARRE,
      }}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          nonLu ? "Parler à l'équipe, nouvelle réponse de l'équipe" : "Parler à l'équipe"
        }
        accessibilityHint="Ouvre l'échange avec les personnes de l'équipe Karria."
        className="active:opacity-80"
      >
        {VERRE ? (
          // Le rayon en style : `GlassView` dessine sa forme lui-même.
          <GlassView
            glassEffectStyle="regular"
            isInteractive
            style={{ borderRadius: 999 }}
          >
            {contenu}
          </GlassView>
        ) : (
          <Box className="rounded-full border border-border-subtle bg-verre shadow-xl">
            {contenu}
          </Box>
        )}
        {nonLu ? (
          <Box
            className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-background bg-primary"
            accessible={false}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
