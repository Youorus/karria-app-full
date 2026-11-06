/**
 * La pastille du style de lettre — « Du modèle » ou « Sobre », à côté du modèle.
 *
 * ═══ Deux mots dans une capsule, pas une feuille ═══
 *
 * Le choix est binaire et se voit sur la feuille elle-même : une capsule de
 * la même matière que la pastille du modèle, avec les deux styles côte à
 * côte, séparés d'un filet. Le style courant est en gras, l'autre en gris ;
 * toucher l'autre redessine la lettre en direct. Rien de bleu, rien qui
 * clignote — la seule action bleue de l'écran reste « Continuer ».
 *
 * Elle n'apparaît que lorsque le modèle a une lettre assortie : sans elle,
 * il n'y a rien à choisir, la lettre sobre est servie et la pastille se tait.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import type { StyleLettre } from "@/features/candidatures/services/style-lettre";

import { TEXTES } from "../services/presentation";

interface Props {
  /** Le style servi — « modèle » par défaut quand le modèle a une lettre. */
  style: StyleLettre;
  onChoisir: (style: StyleLettre) => void;
}

const OPTIONS: readonly { style: StyleLettre; libelle: string }[] = [
  { style: "modele", libelle: TEXTES.lettreStyleModele },
  { style: "sobre", libelle: TEXTES.lettreStyleSobre },
];

export function PastilleStyleLettre({ style, onChoisir }: Props) {
  return (
    <HStack
      className="h-9 items-center rounded-full border border-border-subtle bg-card shadow-sm"
      accessibilityRole="radiogroup"
      accessibilityLabel={TEXTES.lettreStyleAide}
      testID="pastille-style-lettre"
    >
      {OPTIONS.map((option, i) => {
        const courant = option.style === style;
        return (
          <HStack key={option.style} className="h-full items-center">
            {i > 0 ? <Box className="h-4 w-px bg-border-subtle" /> : null}
            <Pressable
              onPress={() => onChoisir(option.style)}
              hitSlop={6}
              className={`h-full justify-center ${i === 0 ? "pl-3 pr-2.5" : "pl-2.5 pr-3"} active:opacity-80`}
              accessibilityRole="radio"
              accessibilityLabel={`${TEXTES.lettreStyleAide} : ${option.libelle}`}
              accessibilityState={{ checked: courant, selected: courant }}
              testID={`style-lettre-${option.style}`}
            >
              <Texte
                className={
                  courant
                    ? "font-bold text-footnote text-foreground"
                    : "text-footnote text-muted-foreground"
                }
                numberOfLines={1}
              >
                {option.libelle}
              </Texte>
            </Pressable>
          </HStack>
        );
      })}
    </HStack>
  );
}
