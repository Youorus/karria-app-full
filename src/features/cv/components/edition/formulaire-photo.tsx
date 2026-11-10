/**
 * La photo du CV : la voir, la changer, la retirer — et la rendre plus pro.
 *
 * ═══ Trois temps, un seul geste principal à chaque fois ═══
 *
 * - **Au repos**, la photo en rond et les gestes. Avec une photo, le geste
 *   mis en avant est « Rendre ma photo professionnelle » : c'est pour cela
 *   qu'on vient ici le plus souvent ; prendre ou choisir une autre photo
 *   reste à portée, en contour. Sans photo, prendre une photo prime.
 * - **Après la prise ou le choix**, la nouvelle photo et la promesse de
 *   Karria — la même qu'à la création (`services/photo.ts`) : lumière, fond
 *   neutre, cadrage, et la personne reste elle-même. On accepte, ou on garde
 *   l'originale telle quelle.
 * - **La comparaison**, l'originale et la retravaillée côte à côte, puis
 *   deux mots : « Garder cette version » / « Garder l'originale ». Si
 *   l'amélioration a échoué, l'originale seule et le mot qui explique.
 *
 * L'état d'attente vit sur le bouton qui l'a déclenché ; l'enregistrement
 * se lit dans la barre de l'écran. Aucune logique ici : le hook décide.
 */

import { Image } from "expo-image";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { EtapePhoto } from "../../hooks/use-modifier-cv";
import { TEXTES_PHOTO } from "../../services/photo";
import type { Photo } from "../../types/cv.types";
import { PortraitPhoto } from "../portrait-photo";

interface Props {
  valeur: Photo;
  etape: EtapePhoto;
  enCours: boolean;
  probleme: string | null;
  onChanger: (source: "camera" | "galerie") => void;
  onAmeliorer: (oui: boolean) => void;
  onAmeliorerActuelle: () => void;
  onGarder: (choix: "originale" | "amelioree") => void;
  onRetirer: () => void;
}

function Probleme({ texte }: { texte: string | null }) {
  if (texte === null) return null;
  return (
    <Texte
      className="text-center text-footnote text-destructive"
      accessibilityRole="alert"
    >
      {texte}
    </Texte>
  );
}

export function FormulairePhoto({
  valeur,
  etape,
  enCours,
  probleme,
  onChanger,
  onAmeliorer,
  onAmeliorerActuelle,
  onGarder,
  onRetirer,
}: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const entree = reduit ? undefined : FadeIn.duration(220);

  if (etape.nom === "amelioration") {
    return (
      <Animated.View key="amelioration" entering={entree}>
        <VStack className="gap-5">
          <Box className="w-44 self-center">
            <PortraitPhoto image={etape.originale} libelle={TEXTES_PHOTO.originale} />
          </Box>
          <Texte className="px-2 text-center text-body leading-6 text-foreground">
            {TEXTES_PHOTO.promesse}
          </Texte>
          <VStack className="gap-3">
            <BoutonAction
              libelle={TEXTES_PHOTO.action}
              onPress={() => onAmeliorer(true)}
              enCours={enCours}
              libelleEnCours={TEXTES_PHOTO.enCours}
            />
            <BoutonAction
              libelle={TEXTES_PHOTO.garderOriginale}
              ton="secondaire"
              onPress={() => onAmeliorer(false)}
              desactive={enCours}
            />
          </VStack>
          <Probleme texte={probleme} />
        </VStack>
      </Animated.View>
    );
  }

  if (etape.nom === "comparaison") {
    const reussie = etape.amelioree !== null;
    return (
      <Animated.View key="comparaison" entering={entree}>
        <VStack className="gap-5">
          {reussie ? (
            <HStack className="gap-3">
              <PortraitPhoto image={etape.originale} libelle={TEXTES_PHOTO.originale} />
              <PortraitPhoto
                image={etape.amelioree ?? etape.originale}
                libelle={TEXTES_PHOTO.amelioree}
              />
            </HStack>
          ) : (
            <Box className="w-44 self-center">
              <PortraitPhoto image={etape.originale} libelle={TEXTES_PHOTO.originale} />
            </Box>
          )}
          <Texte className="px-2 text-center text-footnote leading-5 text-muted-foreground">
            {reussie ? TEXTES_PHOTO.comparaison : TEXTES_PHOTO.originaleSuffit}
          </Texte>
          <VStack className="gap-3">
            {reussie ? (
              <BoutonAction
                libelle={TEXTES_PHOTO.garderAmelioree}
                onPress={() => onGarder("amelioree")}
                enCours={enCours}
                libelleEnCours="Enregistrement…"
              />
            ) : null}
            <BoutonAction
              libelle={TEXTES_PHOTO.garderOriginale}
              ton={reussie ? "secondaire" : "principal"}
              onPress={() => onGarder("originale")}
              enCours={reussie ? false : enCours}
              desactive={reussie && enCours}
              libelleEnCours="Enregistrement…"
            />
          </VStack>
          <Probleme texte={probleme} />
        </VStack>
      </Animated.View>
    );
  }

  const avecPhoto = valeur.image !== null;
  return (
    <VStack className="items-center gap-6">
      <Box className="h-40 w-40 items-center justify-center overflow-hidden rounded-full bg-surface-primary">
        {valeur.image !== null ? (
          <Image
            source={{ uri: valeur.image }}
            // `expo-image` ne lit pas les classes : la taille en style.
            style={{ width: 160, height: 160 }}
            contentFit="cover"
            accessibilityLabel="Ta photo de CV"
          />
        ) : (
          <Icone nom="photo" couleur={couleurs.primaire} taille={40} />
        )}
      </Box>
      <VStack className="w-full gap-3">
        {avecPhoto ? (
          <BoutonAction
            libelle={TEXTES_PHOTO.action}
            onPress={onAmeliorerActuelle}
            enCours={enCours}
            libelleEnCours={TEXTES_PHOTO.enCours}
          />
        ) : null}
        <BoutonAction
          libelle="Prendre une photo"
          ton={avecPhoto ? "secondaire" : "principal"}
          onPress={() => onChanger("camera")}
          enCours={avecPhoto ? false : enCours}
          desactive={avecPhoto && enCours}
          libelleEnCours="Un instant…"
          icone={
            <Icone
              nom="camera"
              couleur={avecPhoto ? couleurs.texte : couleurs.surPrimaire}
              taille={16}
            />
          }
        />
        <BoutonAction
          libelle="Choisir dans mes photos"
          ton="secondaire"
          onPress={() => onChanger("galerie")}
          desactive={enCours}
          icone={<Icone nom="galerie" couleur={couleurs.texte} taille={16} />}
        />
        {avecPhoto ? (
          <BoutonAction
            libelle="Retirer la photo"
            ton="discret"
            onPress={onRetirer}
            desactive={enCours}
          />
        ) : null}
        <Probleme texte={probleme} />
      </VStack>
    </VStack>
  );
}
