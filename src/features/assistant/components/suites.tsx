/**
 * Ce que Karria propose après sa réponse : les élargissements, les
 * réponses rapides, et le chemin vers les offres.
 *
 * ═══ Trois sortes de suites, trois formes ═══
 *
 * - **« Voir les N offres »** : après une recherche, l'action principale.
 *   Le fil s'est déjà rechargé derrière le rideau ; ce bouton le découvre.
 * - **Les élargissements** : des capsules bleutées avec le gain en
 *   évidence (« +340 ») — ce sont des chiffres comptés sur la base, pas
 *   une promesse du modèle, et c'est pour ça qu'on les met en avant.
 * - **Les réponses rapides** : les mêmes capsules que l'accueil. Une
 *   suggestion qui double un élargissement n'est pas répétée.
 *
 * Toutes partent comme un message tapé : c'est le serveur qui reconnaît
 * un élargissement accepté et l'applique sans repasser par le modèle.
 */

import { Pressable } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Texte } from "@/components/texte";
import { VStack } from "@/components/ui/vstack";

import type { Suite } from "../hooks/use-conversation";
import { Suggestions } from "./suggestions";

interface Props {
  suite: Suite;
  onEnvoyer: (texte: string) => void;
  onVoirLesOffres: () => void;
}

export function Suites({ suite, onEnvoyer, onVoirLesOffres }: Props) {
  const reduit = useReducedMotion();
  const messagesDElargissement = new Set(suite.elargissements.map((e) => e.message));
  const suggestions = suite.suggestions.filter((s) => !messagesDElargissement.has(s));
  const resultats = suite.resultats ?? 0;

  return (
    <Animated.View entering={reduit ? undefined : FadeInDown.duration(350)}>
      <VStack className="gap-3 pl-8 pr-2">
        {suite.statut === "recherche" && resultats > 0 ? (
          <BoutonAction
            libelle={`Voir ${resultats > 1 ? `les ${resultats} offres` : "l'offre"}`}
            onPress={onVoirLesOffres}
            pleineLargeur={false}
          />
        ) : null}

        {suite.elargissements.length > 0 ? (
          <VStack className="gap-2">
            {suite.elargissements.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => onEnvoyer(e.message)}
                className="min-h-touch flex-row items-center gap-3 rounded-md border border-primary bg-surface-primary px-4 py-2"
                accessibilityRole="button"
                accessibilityLabel={`${e.libelle}, ${e.gain} offres en plus`}
                accessibilityHint="Élargit la recherche"
              >
                <Texte className="font-display text-body text-primary">+{e.gain}</Texte>
                <Texte className="flex-1 text-footnote text-foreground">
                  {e.libelle}
                </Texte>
              </Pressable>
            ))}
          </VStack>
        ) : null}

        {suggestions.length > 0 ? (
          <Suggestions
            suggestions={suggestions}
            onChoisir={onEnvoyer}
            alignement="gauche"
          />
        ) : null}
      </VStack>
    </Animated.View>
  );
}
