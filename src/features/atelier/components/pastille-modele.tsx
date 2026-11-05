/**
 * La pastille du modèle — le geste « changer de modèle », toujours au même endroit.
 *
 * ═══ Pourquoi une pastille sur la feuille, pas un mot dans l'en-tête ═══
 *
 * L'en-tête de l'atelier porte déjà l'entreprise et le poste (le contexte
 * du dossier) ; y glisser le modèle en ferait un troisième texte gris que
 * personne ne devinerait touchable. La pastille, elle, est posée **sur la
 * feuille**, en haut à gauche, là où la mise en page se voit — et à la
 * même place dans l'atelier d'un dossier, l'atelier libre et la lettre :
 * un seul endroit à apprendre. Elle dit le nom du modèle et « Changer »,
 * pour que le geste soit lu comme un geste, pas comme une étiquette.
 *
 * Même matière que les autres pastilles de la feuille (« 2 pages ») et que
 * la barre des gestes : une capsule au ton de l'écran, une icône, un mot ;
 * rien de bleu — la seule action bleue de l'écran reste « Finaliser ».
 *
 * Sans modèle encore connu (la galerie n'a pas répondu) : « Choisir un
 * modèle », même geste.
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
      hitSlop={6}
      className="h-9 flex-row items-center rounded-full border border-border-subtle bg-card pl-2.5 pr-3 shadow-sm active:opacity-80"
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
        {libelle === null ? (
          <Texte className="font-bold text-footnote text-foreground" numberOfLines={1}>
            {TEXTES.modeleChoisir}
          </Texte>
        ) : (
          <>
            <Texte className="font-bold text-footnote text-foreground" numberOfLines={1}>
              {libelle}
            </Texte>
            <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
              · {TEXTES.modeleChanger}
            </Texte>
          </>
        )}
      </HStack>
    </Pressable>
  );
}
