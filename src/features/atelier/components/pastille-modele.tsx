/**
 * Le modèle courant et un verbe explicite : la commande vit à côté de
 * la couleur sans cacher une partie du document.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";

interface Props {
  /** Le nom du modèle courant, ou `null` tant qu'on ne le connaît pas. */
  libelle: string | null;
  onPress: () => void;
}

export function PastilleModele({ libelle, onPress }: Props) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className="min-h-touch max-w-full flex-row items-center rounded-carte border border-border-subtle bg-card px-3 py-2 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={
        libelle === null
          ? TEXTES.modeleChoisir
          : `Modèle ${libelle}. ${TEXTES.modeleChanger}`
      }
      testID="pastille-modele"
    >
      <HStack className="items-center gap-1.5">
        <Icone nom="modeles" couleur={couleurs.texte} taille={13} graisse="medium" />
        <Texte className="shrink font-bold text-footnote text-foreground">
          {libelle === null ? TEXTES.modeleChoisir : `Changer de modèle · ${libelle}`}
        </Texte>
      </HStack>
    </Pressable>
  );
}
