/**
 * La barre basse de l'atelier : cinq gestes, un seul appelle au clic.
 *
 * ═══ Pourquoi cinq, et pourquoi là ═══
 *
 * Modifier, Karria, Mise en avant, Intitulé : quatre façons de travailler la
 * feuille, toutes réversibles. Finaliser : la suite du parcours — c'est la
 * seule en bleu plein. Le reste est au ton de l'écran, en icône et un mot,
 * dans une capsule de verre qui flotte sous la page (le pied des détails).
 *
 * ═══ La pastille de Karria ═══
 *
 * Un petit nombre sur « Karria » quand des propositions attendent : la
 * personne sait qu'il y a quelque chose à relire, sans qu'on l'interrompe.
 * Pas de point rouge, pas d'étincelle : un chiffre.
 */

import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icone, type NomIcone } from "@/components/icone";
import { PiedFlottant } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { SUR_PRIMAIRE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";

export type GesteAtelier =
  "modifier" | "karria" | "mise-en-avant" | "intitule" | "finaliser";

interface Props {
  /** Les propositions de Karria encore à relire. */
  enAttente: number;
  onGeste: (geste: GesteAtelier) => void;
  desactivee?: boolean;
}

const RESSORT = { duration: 150, dampingRatio: 1 } as const;

function Geste({
  icone,
  libelle,
  pastille,
  onPress,
  desactive,
}: {
  icone: NomIcone;
  libelle: string;
  pastille?: number;
  onPress: () => void;
  desactive: boolean;
}) {
  const couleurs = useCouleurs();
  const echelle = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.get() }] }));
  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => echelle.set(withSpring(0.94, RESSORT))}
        onPressOut={() => echelle.set(withSpring(1, RESSORT))}
        disabled={desactive}
        className={`min-h-touch items-center justify-center gap-1 py-1.5 ${desactive ? "opacity-40" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={pastille ? `${libelle}, ${pastille} à relire` : libelle}
      >
        <Box>
          <Icone nom={icone} couleur={couleurs.texte} taille={20} graisse="medium" />
          {pastille ? (
            <Box className="absolute -right-2.5 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1">
              <Texte className="font-bold text-[10px] leading-[12px] text-primary-foreground">
                {pastille > 9 ? "9+" : pastille}
              </Texte>
            </Box>
          ) : null}
        </Box>
        <Texte className="font-medium text-caption text-foreground" numberOfLines={1}>
          {libelle}
        </Texte>
      </Pressable>
    </Animated.View>
  );
}

export function BarreAtelier({ enAttente, onGeste, desactivee = false }: Props) {
  const couleurs = useCouleurs();
  return (
    <PiedFlottant>
      <HStack className="items-center">
        <Geste
          icone="crayon"
          libelle={TEXTES.modifier}
          onPress={() => onGeste("modifier")}
          desactive={desactivee}
        />
        <Geste
          icone="bulle"
          libelle={TEXTES.karria}
          pastille={enAttente}
          onPress={() => onGeste("karria")}
          desactive={desactivee}
        />
        <Geste
          icone="filtres"
          libelle={TEXTES.miseEnAvant}
          onPress={() => onGeste("mise-en-avant")}
          desactive={desactivee}
        />
        <Geste
          icone="identite"
          libelle={TEXTES.intitule}
          onPress={() => onGeste("intitule")}
          desactive={desactivee}
        />
        <Pressable
          onPress={() => onGeste("finaliser")}
          disabled={desactivee}
          className={`ml-1 h-11 flex-row items-center gap-1.5 rounded-full bg-primary px-4 ${desactivee ? "opacity-40" : ""}`}
          accessibilityRole="button"
          accessibilityLabel={TEXTES.finaliser}
        >
          <Texte className="font-bold text-footnote text-primary-foreground">
            {TEXTES.finaliser}
          </Texte>
          <Icone
            nom="suivant"
            couleur={SUR_PRIMAIRE[couleurs.mode]}
            taille={12}
            graisse="bold"
          />
        </Pressable>
      </HStack>
    </PiedFlottant>
  );
}
