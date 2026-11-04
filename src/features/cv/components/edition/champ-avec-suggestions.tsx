/**
 * Un champ de texte qui propose des valeurs connues pendant qu'on tape.
 *
 * ═══ La liste sous le champ, et rien d'autre ═══
 *
 * Un poste, une entreprise, une ville, une école : on les tape en entier
 * dans toutes les apps du monde, sauf dans celles qui les proposent. Ici,
 * dès la première lettre, jusqu'à huit propositions apparaissent sous le
 * champ ; en toucher une remplit le champ et referme la liste. Le reste du
 * formulaire ne bouge pas : la liste s'insère, elle ne flotte pas — un
 * menu flottant dans une feuille qui défile est toujours coupé quelque
 * part.
 *
 * ═══ La saisie libre reste la règle ═══
 *
 * Une proposition est une aide. Rien n'oblige à en choisir une : ce qu'on
 * a tapé est ce qui est enregistré. Après un choix, la liste reste fermée
 * tant que le texte ne change pas — on ne repropose pas ce qu'on vient de
 * choisir.
 */

import { forwardRef, useState, type ComponentProps } from "react";
import { Pressable, type TextInput } from "react-native";

import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { useSuggestions } from "../../hooks/use-suggestions";
import type { TypeSuggestion } from "../../types/cv.types";

type ChampTexteProps = ComponentProps<typeof ChampTexte>;

interface Props extends Omit<ChampTexteProps, "value" | "onChangeText"> {
  /** Ce qu'on complète. */
  kind: TypeSuggestion;
  value: string;
  onChangeText: (texte: string) => void;
}

export const ChampAvecSuggestions = forwardRef<TextInput, Props>(
  function ChampAvecSuggestions(
    { kind, value, onChangeText, onFocus, onBlur, ...props },
    ref,
  ) {
    const couleurs = useCouleurs();
    const [actif, setActif] = useState(false);
    /** Ce qu'on vient de choisir : tant que le champ le porte, pas de liste. */
    const [choisi, setChoisi] = useState<string | null>(null);
    const { suggestions } = useSuggestions(kind, value, actif && value !== choisi);
    const visibles =
      actif && value !== choisi ? suggestions.filter((s) => s !== value) : [];

    return (
      <VStack space="xs">
        <ChampTexte
          ref={ref}
          value={value}
          onChangeText={(texte) => {
            setChoisi(null);
            onChangeText(texte);
          }}
          onFocus={(e) => {
            setActif(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            // Le blur arrive **avant** le toucher d'une proposition : avec
            // `keyboardShouldPersistTaps="handled"` sur la liste parente, le
            // toucher aboutit quand même ; on referme juste après.
            setTimeout(() => setActif(false), 150);
            onBlur?.(e);
          }}
          autoCorrect={false}
          {...props}
        />
        {visibles.length > 0 ? (
          <VStack
            className="overflow-hidden rounded-champ border border-border-subtle bg-popover"
            accessibilityRole="list"
            accessibilityLabel={`Suggestions pour ${props.libelle || kind}`}
          >
            {visibles.map((suggestion, i) => (
              <Pressable
                key={suggestion}
                onPress={() => {
                  setChoisi(suggestion);
                  onChangeText(suggestion);
                }}
                className={`min-h-touch flex-row items-center justify-between px-4 ${
                  i > 0 ? "border-t border-border-subtle" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel={suggestion}
                accessibilityHint="Remplit le champ avec cette valeur"
              >
                <Texte className="flex-1 text-callout text-foreground" numberOfLines={1}>
                  {suggestion}
                </Texte>
                <HStack className="pl-2">
                  <Icone nom="ouvrir" couleur={couleurs.estompe} taille={12} />
                </HStack>
              </Pressable>
            ))}
          </VStack>
        ) : null}
      </VStack>
    );
  },
);
