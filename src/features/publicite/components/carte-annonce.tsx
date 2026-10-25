/**
 * Une annonce native, habillée comme une carte d'offre — et signalée
 * comme une annonce.
 *
 * ═══ Native, mais jamais déguisée ═══
 *
 * Même carte, même tuile, même typographie que `carte-offre` : l'annonce
 * ne casse pas la lecture du fil. Mais la règle d'AdMob et des magasins
 * est stricte, et c'est aussi la nôtre : la mention **« Sponsorisé »** est
 * visible sans rien toucher, en tête de carte, et l'icône AdChoices est
 * posée par le SDK dans le coin supérieur droit. Pas d'étiquette de
 * contrat, pas de salaire : rien qui puisse la faire passer pour une offre.
 *
 * ═══ Les éléments déclarés au SDK ═══
 *
 * Chaque morceau cliquable est enveloppé d'un `NativeAsset` : c'est ainsi
 * que Google sait ce qui a été affiché et touché. Le titre est
 * obligatoire ; l'annonceur, le texte, l'icône et le bouton le sont dès
 * que l'annonce les fournit.
 */

import { Image } from "expo-image";
import {
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  type NativeAd,
} from "react-native-google-mobile-ads";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

interface Props {
  annonce: NativeAd;
}

function initiales(nom: string): string {
  return (
    nom
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((mot) => mot[0]?.toUpperCase() ?? "")
      .join("") || "A"
  );
}

export function CarteAnnonce({ annonce }: Props) {
  const annonceur = annonce.advertiser ?? null;
  const icone = annonce.icon?.url ?? null;

  return (
    <Animated.View entering={FadeIn.duration(300).reduceMotion(ReduceMotion.System)}>
      <NativeAdView nativeAd={annonce}>
        <VStack
          space="md"
          className="rounded-carte border border-border-subtle bg-card p-4"
          accessibilityLabel={`Annonce sponsorisée : ${annonce.headline}`}
        >
          <HStack space="md" className="items-center">
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Box className="h-[54px] w-[54px] items-center justify-center overflow-hidden rounded-tuile border border-border-subtle bg-remplissage">
                {icone !== null ? (
                  <Image
                    source={{ uri: icone }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Texte className="font-display text-title-sm text-muted-foreground">
                    {initiales(annonceur ?? annonce.headline)}
                  </Texte>
                )}
              </Box>
            </NativeAsset>
            <VStack className="flex-1">
              <HStack space="sm" className="items-center pr-6">
                <Box className="rounded-etiquette bg-remplissage px-2 py-0.5">
                  <Texte className="font-bold text-caption text-muted-foreground">
                    Sponsorisé
                  </Texte>
                </Box>
                {annonceur !== null ? (
                  <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                    <Texte
                      className="flex-1 text-caption uppercase tracking-widest text-foreground-faint"
                      numberOfLines={1}
                    >
                      {annonceur}
                    </Texte>
                  </NativeAsset>
                ) : null}
              </HStack>
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Texte
                  className="font-bold text-body text-card-foreground"
                  numberOfLines={2}
                >
                  {annonce.headline}
                </Texte>
              </NativeAsset>
            </VStack>
          </HStack>

          {annonce.body ? (
            <NativeAsset assetType={NativeAssetType.BODY}>
              <Texte className="text-callout text-muted-foreground" numberOfLines={2}>
                {annonce.body}
              </Texte>
            </NativeAsset>
          ) : null}

          {annonce.callToAction ? (
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
              <Texte className="self-start overflow-hidden rounded-etiquette bg-surface-primary px-3 py-1.5 font-bold text-callout text-primary">
                {annonce.callToAction}
              </Texte>
            </NativeAsset>
          ) : null}
        </VStack>
      </NativeAdView>
    </Animated.View>
  );
}
