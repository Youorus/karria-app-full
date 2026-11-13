/**
 * L'aperçu plein écran d'un export — comme on regarde un modèle dans la
 * galerie : la page, grande, qu'on feuillette ; puis « Ouvrir le PDF ».
 *
 * ═══ Pourquoi un aperçu, et pas le lecteur ═══
 *
 * Marc (2026-11-13) : « je veux des prévisualisations de mon CV ; quand je
 * clique dessus, je puisse visualiser comme dans l'espace des modèles ».
 * Le lecteur montre le PDF dans une vue web, lente à ouvrir et sans geste
 * de feuilletage ; ici ce sont les pages en image, rendues par le serveur à
 * l'export, chargées comme celles de la galerie. Le PDF reste à un geste.
 *
 * ═══ Retour ═══
 *
 * Un détail qui monte au-dessus de Finaliser ou de Mes CV et se referme
 * dessus : on ne perd rien de ce qu'on avait (l'analyse, la liste).
 */

import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { useOuvrirLecteur } from "../hooks/use-ouvrir-lecteur";
import { libellePage, lireApercu } from "../services/apercus";
import { TEXTES } from "../services/presentation";

export function EcranApercuExport() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const apercu = lireApercu(id);
  const router = useRouter();
  const couleurs = useCouleurs();
  const ouvrirLecteur = useOuvrirLecteur();
  const { width, height } = useWindowDimensions();
  const [page, setPage] = useState(0);

  const fermer = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/cv");
  };

  if (apercu === null) {
    return (
      <Box style={{ flex: 1 }} className="bg-background">
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <Box className="flex-1 justify-center px-5">
            <MessageErreur
              message="Cet aperçu n'est plus disponible."
              action={fermer}
              libelleAction="Retour"
            />
          </Box>
        </SafeAreaView>
      </Box>
    );
  }

  // La page entière tient en hauteur ; A4 → la largeur suit.
  const hauteurPage = Math.min(height * 0.72, (width - 32) * 1.414);
  const total = apercu.pages.length;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <HStack className="items-center justify-between px-4 pt-2">
          <VStack className="flex-1 gap-0.5 pr-3">
            <Texte
              className="font-display text-title-sm text-foreground"
              numberOfLines={1}
            >
              {apercu.titre}
            </Texte>
            {apercu.modele !== null ? (
              <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
                Modèle {apercu.modele}
              </Texte>
            ) : null}
          </VStack>
          <Pressable
            onPress={fermer}
            className="h-10 w-10 items-center justify-center rounded-full bg-remplissage"
            accessibilityRole="button"
            accessibilityLabel="Fermer"
          >
            <Icone nom="fermer" couleur={couleurs.texte} taille={14} graisse="bold" />
          </Pressable>
        </HStack>

        <FlatList
          data={apercu.pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(uri, i) => `${i}-${uri}`}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingVertical: 16 }}
          renderItem={({ item, index }) => (
            <Box style={{ width }} className="items-center justify-center">
              <Image
                source={{ uri: item, cacheKey: `export-${apercu.id}-${index}` }}
                cachePolicy="memory-disk"
                style={{
                  width: hauteurPage / 1.414,
                  height: hauteurPage,
                  borderRadius: 6,
                  backgroundColor: "#ffffff",
                  borderWidth: 1,
                  borderColor: couleurs.contour,
                }}
                contentFit="contain"
                transition={200}
                accessibilityLabel={`${apercu.titre}, ${libellePage(index, total)}`}
              />
            </Box>
          )}
        />

        {total > 1 ? (
          <Texte className="text-center text-caption text-muted-foreground">
            {libellePage(page, total)}
          </Texte>
        ) : null}

        <Box className="flex-1" />
        {apercu.pdf !== null ? (
          <Box className="px-5 pb-2">
            <BoutonAction
              libelle={TEXTES.apercuOuvrirPdf}
              ton="secondaire"
              icone={<Icone nom="ouvrir" couleur={couleurs.texte} taille={14} />}
              onPress={() =>
                ouvrirLecteur({
                  id: apercu.id,
                  url: apercu.pdf ?? "",
                  genre: apercu.genre,
                  complement: apercu.complement,
                  modele: apercu.modele,
                  retour: apercu.retour,
                })
              }
            />
          </Box>
        ) : null}
      </SafeAreaView>
    </Box>
  );
}
