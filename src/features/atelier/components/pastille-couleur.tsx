/**
 * La pastille de la couleur — le geste « changer la couleur », à côté du modèle.
 *
 * ═══ Un rond de la couleur, un mot ═══
 *
 * Même capsule que la pastille du modèle, posée juste à sa droite sur la
 * feuille : un rond de la couleur principale **réelle** du CV (celle qu'on a
 * posée, sinon celle du modèle) et le mot « Couleur ». Le rond dit l'état,
 * le mot dit le geste ; ni l'un ni l'autre n'a besoin d'une étiquette.
 *
 * Tant que la couleur n'est pas connue (galerie pas encore lue, modèle sans
 * couleur mesurée) : un rond vide, au contour du texte — le geste reste là.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";

interface Props {
  /** La couleur posée, sinon celle du modèle, sinon `null`. */
  couleur: string | null;
  /** Vrai : la personne a posé une couleur (différente de l'origine). */
  posee: boolean;
  onPress: () => void;
}

export function PastilleCouleur({ couleur, posee, onPress }: Props) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      className="h-9 flex-row items-center rounded-full border border-border-subtle bg-card pl-2.5 pr-3 shadow-sm active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${TEXTES.couleur} du CV${posee ? ", choisie" : ", d'origine"}. ${TEXTES.modeleChanger}`}
      testID="pastille-couleur"
    >
      <HStack className="items-center gap-2">
        <Box
          className="h-3.5 w-3.5 rounded-full"
          style={
            couleur === null
              ? { borderWidth: 1.5, borderColor: couleurs.texte }
              : { backgroundColor: couleur }
          }
        />
        <Texte className="font-bold text-footnote text-foreground" numberOfLines={1}>
          {TEXTES.couleur}
        </Texte>
      </HStack>
    </Pressable>
  );
}
