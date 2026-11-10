/**
 * Un portrait du CV, carré, avec son libellé dessous.
 *
 * Le même dans la création (« Ta photo » / « Améliorée », à toucher pour
 * choisir) et dans l'édition (côte à côte, le choix par les boutons) : la
 * comparaison avant/après a la même forme partout. Touchable seulement
 * quand `onPress` est donné ; sinon c'est une image, pour le lecteur
 * d'écran aussi.
 */

import { Image } from "expo-image";
import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";

interface Props {
  image: string;
  libelle: string;
  onPress?: () => void;
}

export function PortraitPhoto({ image, libelle, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress === undefined}
      className="flex-1 items-center gap-2"
      accessibilityRole={onPress === undefined ? "image" : "button"}
      accessibilityLabel={onPress === undefined ? libelle : `Garder : ${libelle}`}
    >
      <Box className="aspect-square w-full overflow-hidden rounded-carte border border-border-subtle bg-remplissage">
        <Image
          source={{ uri: image }}
          // `expo-image` ne lit pas les classes : la taille en style.
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={250}
          accessible={false}
        />
      </Box>
      <Texte className="font-bold text-footnote text-foreground">{libelle}</Texte>
    </Pressable>
  );
}
