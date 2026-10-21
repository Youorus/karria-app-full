/**
 * Un modèle dans la galerie — `template-card.tsx` de la V1.
 *
 * ═══ L'anatomie de la V1 ═══
 *
 * - la miniature du CV, au format de la page (hauteur = largeur / 0,72),
 *   avec sur elle : un voile bas, **la barre de couleur du modèle** (3 pt),
 *   la pastille **PRO**, la coche verte des modèles possédés, le badge
 *   « photo » et la puce « LM » quand une lettre est assortie ;
 * - dessous : le nom, la catégorie, un filet, la note et le nombre
 *   d'utilisations.
 *
 * ═══ Le passage au détail ═══
 *
 * Sur iOS 18+, la miniature **se déplie** en plein écran jusqu'au
 * carrousel du détail (zoom natif, `Link.AppleZoom`) et s'y replie au
 * retour : on ne quitte pas le modèle des yeux. Ailleurs, le détail monte
 * en fondu. L'entrée dans la grille est décalée de 55 ms par carte (V1).
 */

import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable } from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { AURA, PREMIUM } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { capitaliser, compteCompact, noteLisible } from "../services/presentation";
import type { Modele } from "../types/modeles.types";

const RESSORT = { damping: 22, stiffness: 250 };

interface Props {
  modele: Modele;
  rang: number;
  largeur: number;
  possede: boolean;
}

export function CarteModele({ modele, rang, largeur, possede }: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const echelle = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  const hauteur = Math.round(largeur / 0.72);

  return (
    // Deux couches, comme la carte d'offre : l'entrée et la pression ne
    // partagent pas la même vue.
    <Animated.View
      entering={
        reduit ? undefined : FadeInDown.duration(280).delay(Math.min(rang * 55, 440))
      }
      style={{ width: largeur }}
    >
      <Animated.View style={style}>
        <Link
          href={{ pathname: "/modele/[id]", params: { id: String(modele.id) } }}
          asChild
        >
          <Pressable
            onPressIn={() => echelle.set(withSpring(0.96, RESSORT))}
            onPressOut={() => echelle.set(withSpring(1, RESSORT))}
            accessibilityRole="button"
            accessibilityLabel={`${modele.libelle}, ${capitaliser(modele.categorie)}${
              possede ? ", déjà à toi" : ""
            }${modele.premium ? ", modèle Pro" : ""}`}
          >
            <VStack className="overflow-hidden rounded-tuile border border-border-subtle bg-card">
              <Box style={{ height: hauteur }} className="overflow-hidden bg-remplissage">
                <Link.AppleZoom>
                  {modele.miniature !== null ? (
                    <Image
                      source={{ uri: modele.miniature }}
                      style={{ width: largeur, height: hauteur }}
                      contentFit="cover"
                      transition={250}
                      accessible={false}
                    />
                  ) : (
                    <Box
                      style={{ width: largeur, height: hauteur }}
                      className="items-center justify-center"
                    >
                      <SymboleKarria taille={28} />
                    </Box>
                  )}
                </Link.AppleZoom>

                {/* Le voile bas et la barre de couleur du modèle. */}
                <Box className="absolute bottom-0 left-0 right-0 h-[35%] bg-scrim opacity-40" />
                {modele.couleur !== null ? (
                  <Box
                    className="absolute bottom-0 left-0 right-0 h-[3px] opacity-85"
                    // La couleur vient du modèle lui-même : une donnée, pas la charte.
                    style={{ backgroundColor: modele.couleur }}
                  />
                ) : null}

                {possede ? (
                  <Box className="absolute left-2 top-2 h-[22px] w-[22px] items-center justify-center rounded-full bg-success">
                    <Icone nom="coche" couleur={AURA.reflet} taille={12} graisse="bold" />
                  </Box>
                ) : null}
                {modele.premium ? (
                  <HStack className="absolute right-2 top-2 items-center gap-1 rounded-full bg-inverse px-[7px] py-[3px]">
                    <SymboleKarria taille={10} couleur={couleurs.fond} />
                    <Texte className="font-display text-[10px] text-inverse-foreground">
                      PRO
                    </Texte>
                  </HStack>
                ) : null}
                {modele.avecPhoto ? (
                  <Box className="absolute bottom-2 left-2 h-5 w-5 items-center justify-center rounded-full bg-scrim-fort">
                    <Icone nom="photo" couleur={AURA.reflet} taille={11} />
                  </Box>
                ) : null}
                {modele.avecLettre ? (
                  <HStack className="absolute bottom-2 right-2 items-center gap-1 rounded-full bg-scrim-fort px-1.5 py-0.5">
                    <Icone nom="lettre" couleur={AURA.reflet} taille={10} />
                    <Texte className="font-bold text-[10px] text-on-scrim">LM</Texte>
                  </HStack>
                ) : null}
              </Box>

              <VStack className="gap-1 p-3">
                <Texte
                  className="font-bold text-footnote text-foreground"
                  numberOfLines={1}
                >
                  {modele.libelle}
                </Texte>
                <Texte className="text-caption text-muted-foreground" numberOfLines={1}>
                  {capitaliser(modele.categorie)}
                </Texte>
                <Box className="my-1 h-px bg-border-subtle" />
                <HStack className="items-center justify-between">
                  <HStack className="items-center gap-1">
                    <Icone nom="etoile" couleur={PREMIUM[couleurs.mode]} taille={11} />
                    <Texte className="text-caption text-muted-foreground">
                      {noteLisible(modele.note, modele.nombreDAvis)}
                    </Texte>
                  </HStack>
                  <HStack className="items-center gap-1">
                    <Icone nom="tendance" couleur={couleurs.estompe} taille={11} />
                    <Texte className="text-caption text-muted-foreground">
                      {compteCompact(modele.utilisations)}
                    </Texte>
                  </HStack>
                </HStack>
              </VStack>
            </VStack>
          </Pressable>
        </Link>
      </Animated.View>
    </Animated.View>
  );
}
