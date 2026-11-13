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
 *
 * Sans dossier (l'atelier libre), Karria n'a rien à proposer : son geste
 * n'est pas là, la barre a quatre places.
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
import { phraseDepassement } from "../services/une-page";

export type GesteAtelier =
  "modifier" | "karria" | "mise-en-avant" | "intitule" | "finaliser";

interface Props {
  /** Les propositions de Karria encore à relire. */
  enAttente: number;
  onGeste: (geste: GesteAtelier) => void;
  desactivee?: boolean;
  /** Faux : pas de geste « Karria » (atelier libre, sans dossier). */
  avecKarria?: boolean;
  /** Le nombre de pages de la feuille ; au-delà d'une, la barre le dit. */
  pages?: number;
  /** « Tenir sur une page » : ouvre la feuille qui le propose. */
  onPages?: () => void;
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

/**
 * La ligne des pages, **dans** la barre — là où l'on lit, pas sur le CV
 * (Marc, 13/11) : « Ton CV fait 2 pages · Tenir sur une page ». Deux pages
 * sont permises ; la ligne informe et propose, elle n'alerte pas.
 */
function LignePages({ pages, onPress }: { pages: number; onPress: () => void }) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className="mx-1 mb-1 min-h-touch flex-row items-center gap-2 rounded-full bg-remplissage px-4"
      accessibilityRole="button"
      accessibilityLabel={`${phraseDepassement(pages)}. ${TEXTES.unePageAgir}`}
    >
      <Icone nom="cv" couleur={couleurs.estompe} taille={14} />
      <Texte className="flex-1 text-footnote text-foreground" numberOfLines={1}>
        {phraseDepassement(pages)}
      </Texte>
      <Texte className="font-bold text-footnote text-primary">{TEXTES.unePageAgir}</Texte>
      <Icone nom="suivant" couleur={couleurs.primaire} taille={11} graisse="bold" />
    </Pressable>
  );
}

export function BarreAtelier({
  enAttente,
  onGeste,
  desactivee = false,
  avecKarria = true,
  pages = 1,
  onPages,
}: Props) {
  const couleurs = useCouleurs();
  return (
    <PiedFlottant>
      {pages > 1 && onPages !== undefined && !desactivee ? (
        <LignePages pages={pages} onPress={onPages} />
      ) : null}
      <HStack className="items-center">
        <Geste
          icone="crayon"
          libelle={TEXTES.modifier}
          onPress={() => onGeste("modifier")}
          desactive={desactivee}
        />
        {avecKarria ? (
          <Geste
            icone="bulle"
            libelle={TEXTES.karria}
            pastille={enAttente}
            onPress={() => onGeste("karria")}
            desactive={desactivee}
          />
        ) : null}
        <Geste
          icone="filtres"
          libelle={TEXTES.enAvant}
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
