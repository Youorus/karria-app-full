/**
 * Le carrousel du détail — le héros de la V1.
 *
 * Le CV, puis chaque lettre de motivation assortie, page par page, à la
 * hauteur de la V1 (largeur × 1,32). Une puce dit ce qu'on regarde
 * (« CV », « Lettre »), des points disent où l'on est. Toucher une page
 * l'ouvre dans la visionneuse (zoom, pages, glisser pour fermer).
 *
 * C'est aussi la **cible du zoom natif** d'iOS 18 : la miniature touchée
 * dans la galerie s'y déplie (`Link.AppleZoomTarget`).
 */

import { Image } from "expo-image";
import { Link } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, useWindowDimensions } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { VisionneusePages } from "@/components/visionneuse-pages";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { AURA } from "@/theme";

import type { Apercu } from "../types/modeles.types";

export function CarrouselApercus({ apercus }: { apercus: Apercu[] }) {
  const { width } = useWindowDimensions();
  const hauteur = Math.round(width * 1.32);
  // États purement visuels : la page affichée, et le plein écran.
  const [page, setPage] = useState(0);
  const [pleinEcran, setPleinEcran] = useState<number | null>(null);
  const pages = apercus
    .filter((a) => a.image !== null)
    .map((a) => ({
      cle: a.cle,
      libelle: a.type === "cv" ? "CV" : "Lettre",
      image: a.image ?? "",
    }));

  return (
    <Box>
      <Link.AppleZoomTarget>
        <FlatList
          data={apercus}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(a) => a.cle}
          onMomentumScrollEnd={(e) =>
            setPage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => setPleinEcran(index)}
              style={{ width, height: hauteur }}
              className="bg-remplissage"
              accessibilityRole="imagebutton"
              accessibilityLabel={`Aperçu ${item.type === "cv" ? "du CV" : "de la lettre"}, plein écran`}
            >
              {item.image !== null ? (
                <Image
                  source={{ uri: item.image }}
                  placeholder={
                    item.miniature === null ? undefined : { uri: item.miniature }
                  }
                  style={{ width, height: hauteur }}
                  contentFit="contain"
                  transition={250}
                  accessible={false}
                />
              ) : null}
            </Pressable>
          )}
        />
      </Link.AppleZoomTarget>

      <HStack className="absolute left-4 top-4 items-center gap-1.5 rounded-full bg-scrim-fort px-3 py-1.5">
        <Icone
          nom={apercus[page]?.type === "lettre" ? "lettre" : "cv"}
          couleur={AURA.reflet}
          taille={12}
        />
        <Texte className="font-bold text-caption text-on-scrim">
          {apercus[page]?.libelle ?? "CV"}
        </Texte>
      </HStack>
      <Box className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-scrim-fort">
        <Icone nom="agrandir" couleur={AURA.reflet} taille={14} />
      </Box>

      {apercus.length > 1 ? (
        // Sur une pastille sombre : un CV est presque toujours blanc, des
        // points clairs posés dessus disparaîtraient.
        <HStack className="absolute bottom-4 self-center gap-1.5 rounded-full bg-scrim-fort px-2.5 py-2">
          {apercus.map((a, i) => (
            <Box
              key={a.cle}
              className={`h-1.5 rounded-full ${i === page ? "w-5 bg-primary" : "w-1.5 bg-on-scrim-doux"}`}
            />
          ))}
        </HStack>
      ) : null}

      <VisionneusePages
        pages={pages}
        depart={pleinEcran}
        onFermer={() => setPleinEcran(null)}
      />
    </Box>
  );
}
