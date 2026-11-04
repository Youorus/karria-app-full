/**
 * Une annonce native au format d'une carte de la galerie des modèles.
 *
 * ═══ Même tuile, même proportions — et « Sponsorisé » dès le premier regard ═══
 *
 * Une cellule de la grille : la vignette haute (largeur / 0,72, comme
 * `carte-modele`), puis le nom et une ligne dessous. L'annonce s'y glisse
 * sans casser la grille. Mais elle ne se déguise pas : la pastille
 * **« Sponsorisé »** est posée sur la vignette, en haut à gauche, là où la
 * carte d'un modèle porte sa coche ; l'icône AdChoices est posée par le
 * SDK en haut à droite. Ni étoile, ni compteur d'utilisations : rien qui
 * puisse la faire passer pour un modèle.
 *
 * ═══ La vignette ═══
 *
 * Le média de l'annonce (`NativeMediaView`, image ou vidéo muette), coupé
 * au format de la tuile. Google demande que le média soit montré quand
 * l'annonce en a un ; ici c'est de toute façon ce qui fait la carte.
 */

import {
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
  type NativeAd,
} from "react-native-google-mobile-ads";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

interface Props {
  annonce: NativeAd;
  /** La largeur d'une carte de la grille, calculée par la galerie. */
  largeur: number;
}

export function CarteAnnonceModele({ annonce, largeur }: Props) {
  const hauteur = Math.round(largeur / 0.72);
  const sousTitre = annonce.advertiser ?? annonce.body ?? null;

  return (
    <Animated.View
      entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}
      // La largeur vient de la mesure de l'écran : une donnée, pas la charte.
      style={{ width: largeur }}
    >
      <NativeAdView nativeAd={annonce}>
        <VStack
          className="overflow-hidden rounded-tuile border border-border-subtle bg-card"
          accessibilityLabel={`Annonce sponsorisée : ${annonce.headline}`}
        >
          <Box style={{ height: hauteur }} className="overflow-hidden bg-remplissage">
            <NativeMediaView
              style={{ width: largeur, height: hauteur }}
              resizeMode="cover"
            />
            <Box className="absolute left-2 top-2 rounded-etiquette bg-scrim-fort px-2 py-0.5">
              <Texte className="font-bold text-caption text-on-scrim">Sponsorisé</Texte>
            </Box>
          </Box>

          <VStack className="gap-1 p-3">
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Texte
                className="font-bold text-footnote text-foreground"
                numberOfLines={1}
              >
                {annonce.headline}
              </Texte>
            </NativeAsset>
            {sousTitre !== null ? (
              <NativeAsset
                assetType={
                  annonce.advertiser ? NativeAssetType.ADVERTISER : NativeAssetType.BODY
                }
              >
                <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
                  {sousTitre}
                </Texte>
              </NativeAsset>
            ) : null}
            {annonce.callToAction ? (
              <>
                <Box className="my-1 h-px bg-border-subtle" />
                <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                  <Texte
                    className="font-bold text-caption text-primary"
                    numberOfLines={1}
                  >
                    {annonce.callToAction}
                  </Texte>
                </NativeAsset>
              </>
            ) : null}
          </VStack>
        </VStack>
      </NativeAdView>
    </Animated.View>
  );
}
