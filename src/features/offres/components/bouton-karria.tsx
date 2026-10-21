/**
 * Le bouton « Demander à Karria » — l'orbe vivante.
 *
 * Il prend la place du ✦ de la V1, au même endroit (à droite, 16 pt
 * au-dessus de la barre d'onglets) et avec le même double rôle : en haut
 * du fil il réveille Karria — le rideau balaie le fil et l'orbe devient
 * l'agent —, une fois le fil défilé il ramène en haut (le K cède la place
 * à une flèche).
 *
 * Seule la sphère se touche : le halo et les particules qui débordent
 * laissent passer les doigts vers les cartes dessous.
 */

import { Pressable } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Box } from "@/components/ui/box";
import { AURA } from "@/theme";

const TAILLE = 60;

interface Props {
  defile: boolean;
  onOuvrirKarria: () => void;
  onRemonter: () => void;
}

export function BoutonKarria({ defile, onOuvrirKarria, onRemonter }: Props) {
  const echelle = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

  return (
    // La boîte de l'orbe fait deux fois la sphère (place du halo et des
    // particules) : on la décale d'une demi-sphère pour que la sphère
    // elle-même tombe à l'emplacement prévu par l'écran.
    <Box
      style={{ marginRight: -TAILLE / 2, marginBottom: -TAILLE / 2 }}
      pointerEvents="box-none"
    >
      <Animated.View style={style} pointerEvents="box-none">
        <OrbeVivante taille={TAILLE}>
          {defile ? (
            <Animated.View
              key="haut"
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
            >
              <Icone nom="haut" couleur={AURA.reflet} taille={22} graisse="bold" />
            </Animated.View>
          ) : (
            <Animated.View
              key="k"
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(120)}
            >
              <SymboleKarria taille={24} teinte="reflet" />
            </Animated.View>
          )}
        </OrbeVivante>
        <Pressable
          onPress={defile ? onRemonter : onOuvrirKarria}
          onPressIn={() => echelle.set(withSpring(0.92, { damping: 15, stiffness: 300 }))}
          onPressOut={() => echelle.set(withSpring(1, { damping: 12, stiffness: 220 }))}
          style={{
            position: "absolute",
            left: TAILLE / 2,
            top: TAILLE / 2,
            width: TAILLE,
            height: TAILLE,
            borderRadius: TAILLE / 2,
          }}
          accessibilityRole="button"
          accessibilityLabel={defile ? "Revenir en haut" : "Parler à Karria"}
        />
      </Animated.View>
    </Box>
  );
}
