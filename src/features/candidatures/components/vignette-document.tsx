/**
 * Une vignette de document — le CV adapté, ou la lettre — qui montre un
 * vrai bout du contenu.
 *
 * ═══ Un aperçu, pas une icône ═══
 *
 * Une feuille au format portrait, et dedans les premiers mots de **ce**
 * document : le nom et l'intitulé pour le CV, puis deux expériences ;
 * l'objet pour la lettre, puis l'ouverture. On reconnaît son document
 * avant de l'ouvrir — c'est ce qu'un dossier posé sur une table laisse
 * voir. Sous la feuille, ce que c'est et ce qu'on peut en faire.
 *
 * Sans lettre, la feuille reste en pointillé et dit « Pas encore de
 * lettre » : la toucher mène à l'atelier, où Karria l'écrit.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

interface Props {
  titre: string;
  /** La ligne sous le titre : « Adapté le 3 nov. », « Pas encore écrite ». */
  sousTitre: string;
  /** Les lignes de l'aperçu, la première en relief. Vide : feuille en pointillé. */
  lignes: string[];
  /** Ce que l'on fait en touchant, pour le lecteur d'écran. */
  action: string;
  onPress: () => void;
}

export function VignetteDocument({ titre, sousTitre, lignes, action, onPress }: Props) {
  const vide = lignes.length === 0;
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${titre}, ${sousTitre}`}
      accessibilityHint={action}
    >
      <VStack space="sm">
        <Box
          className={`aspect-[0.78] justify-start overflow-hidden rounded-etiquette border bg-background p-3 ${
            vide ? "border-dashed border-border-champ" : "border-border-subtle"
          }`}
        >
          {vide ? (
            <Box className="flex-1 items-center justify-center">
              <Texte className="text-center text-caption text-foreground-faint">
                {sousTitre}
              </Texte>
            </Box>
          ) : (
            <VStack space="xs">
              {lignes.map((ligne, i) => (
                <Texte
                  key={i}
                  className={
                    i === 0
                      ? "font-bold text-caption text-foreground"
                      : "text-caption leading-4 text-muted-foreground"
                  }
                  numberOfLines={i === 0 ? 2 : 3}
                >
                  {ligne}
                </Texte>
              ))}
            </VStack>
          )}
          {/* Le bas de la feuille s'estompe : le document continue. */}
          {vide ? null : (
            <Box
              className="absolute inset-x-0 bottom-0 h-6 bg-background opacity-70"
              pointerEvents="none"
            />
          )}
        </Box>
        <VStack>
          <Texte className="font-bold text-footnote text-foreground" numberOfLines={1}>
            {titre}
          </Texte>
          <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
            {vide ? action : sousTitre}
          </Texte>
        </VStack>
      </VStack>
    </Pressable>
  );
}
