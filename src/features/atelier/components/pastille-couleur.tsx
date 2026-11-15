/**
 * La pastille de la couleur — le geste « changer la couleur », à côté du modèle.
 *
 * ═══ Un rond de la couleur, un mot ═══
 *
 * Même commande que la pastille du modèle, dans la rangée hors du
 * papier : un rond de la couleur **réelle** du décor du CV (celle qu'on a
 * posée, sinon celle du modèle — ses bandes, filets et puces, pas son texte)
 * et le mot « Couleur ». Le rond dit l'état, le mot dit le geste ; ni l'un ni
 * l'autre n'a besoin d'une étiquette.
 *
 * Tant que la couleur n'est pas connue (galerie pas encore lue, modèle sans
 * couleur mesurée) : un rond vide, au contour du texte — le geste reste là.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";

import { TEXTES } from "../services/presentation";

interface Props {
  /** La couleur posée, sinon celle du modèle, sinon `null`. */
  couleur: string | null;
  /** Vrai : la personne a posé une couleur (différente de l'origine). */
  posee: boolean;
  onPress: () => void;
}

export function PastilleCouleur({ couleur, posee, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-touch max-w-full flex-row items-center rounded-carte border border-border-subtle bg-card px-3 py-2 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${TEXTES.couleur} du CV${posee ? ", choisie" : ", d'origine"}. ${TEXTES.modeleChanger}`}
      testID="pastille-couleur"
    >
      <HStack className="items-center gap-2">
        <Box
          className="h-3.5 w-3.5 rounded-full border border-border-champ"
          style={couleur === null ? undefined : { backgroundColor: couleur }}
        />
        <Texte className="shrink font-bold text-footnote text-foreground">
          {TEXTES.couleur}
        </Texte>
      </HStack>
    </Pressable>
  );
}
