/**
 * Un champ de texte sur plusieurs lignes, au contour de `ChampTexte`.
 *
 * `ChampTexte` a une hauteur fixe (une ligne, 56 points) : l'« à propos »
 * et les missions ont besoin de grandir. Même libellé, même contour, même
 * message d'erreur — seule la hauteur change, et le texte part du haut.
 */

import { useState } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { contourDeChamp } from "@/components/contour-champ";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

interface Props extends Omit<TextInputProps, "style" | "className" | "multiline"> {
  libelle: string;
  erreur?: string;
  aide?: string;
  /** Hauteur minimale, en lignes de texte. */
  lignes?: number;
}

export function ChampMultiligne({ libelle, erreur, aide, lignes = 4, ...props }: Props) {
  const couleurs = useCouleurs();
  const [actif, setActif] = useState(false);
  const contour = contourDeChamp({ actif, erreur });

  return (
    <VStack space="xs">
      {libelle === "" ? null : (
        <Texte className="font-bold text-footnote text-foreground">{libelle}</Texte>
      )}
      <Box className={`rounded-champ bg-card px-4 py-3 ${contour}`}>
        <TextInput
          className="font-sans text-callout leading-6 text-foreground"
          // La hauteur minimale dépend du nombre de lignes voulu : une
          // valeur calculée, qu'aucune classe fixe ne couvre.
          style={{ minHeight: lignes * 24 }}
          multiline
          textAlignVertical="top"
          selectionColor={couleurs.primaire}
          onFocus={(e) => {
            setActif(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setActif(false);
            props.onBlur?.(e);
          }}
          accessibilityLabel={libelle}
          {...props}
        />
      </Box>
      {erreur ? (
        <Texte className="text-footnote text-destructive" accessibilityRole="alert">
          {erreur}
        </Texte>
      ) : aide ? (
        <Texte className="text-footnote text-muted-foreground">{aide}</Texte>
      ) : null}
    </VStack>
  );
}
