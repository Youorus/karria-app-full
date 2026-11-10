/**
 * La photo du CV : toujours un choix, jamais une évidence.
 *
 * Quatre temps, chacun une seule décision :
 *
 * 1. **Une photo ?** Oui / Non — le non est aussi visible que le oui.
 * 2. **D'où ?** Prendre une photo, ou en choisir une.
 * 3. **L'améliorer ?** Karria propose de la rendre plus pro (lumière,
 *    fond, cadrage) ; on peut refuser et garder la sienne.
 * 4. **Laquelle ?** L'originale et l'améliorée côte à côte : on garde
 *    celle qu'on préfère, d'un toucher.
 *
 * Rien ne part au serveur sans geste de l'utilisateur, et l'amélioration
 * jamais sans son accord explicite. La promesse et le portrait sont ceux
 * de l'édition aussi (`services/photo.ts`, `portrait-photo.tsx`).
 */

import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Phase } from "../hooks/use-creation-cv";
import { TEXTES_PHOTO } from "../services/photo";
import { PortraitPhoto } from "./portrait-photo";

interface Props {
  phase: Phase;
  occupe: boolean;
  onVouloir: (oui: boolean) => void;
  onChoisir: (source: "camera" | "galerie") => void;
  onAmeliorer: (oui: boolean) => void;
  onGarder: (image: string) => void;
}

export function EtapePhoto({
  phase,
  occupe,
  onVouloir,
  onChoisir,
  onAmeliorer,
  onGarder,
}: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const entree = reduit ? undefined : FadeInUp.springify().damping(18);

  if (phase.nom === "photo-choix") {
    return (
      <Animated.View entering={entree}>
        <VStack className="gap-3">
          <BoutonAction
            libelle="Oui, avec une photo"
            onPress={() => onVouloir(true)}
            desactive={occupe}
            icone={<Icone nom="photo" couleur={couleurs.surPrimaire} taille={16} />}
          />
          <BoutonAction
            libelle="Non, sans photo"
            ton="secondaire"
            onPress={() => onVouloir(false)}
            enCours={occupe}
          />
        </VStack>
      </Animated.View>
    );
  }

  if (phase.nom === "photo-source") {
    return (
      <Animated.View entering={entree}>
        <VStack className="gap-3">
          <BoutonAction
            libelle="Prendre une photo"
            onPress={() => onChoisir("camera")}
            enCours={occupe}
            icone={<Icone nom="camera" couleur={couleurs.surPrimaire} taille={16} />}
          />
          <BoutonAction
            libelle="Choisir dans mes photos"
            ton="secondaire"
            onPress={() => onChoisir("galerie")}
            desactive={occupe}
            icone={<Icone nom="galerie" couleur={couleurs.texte} taille={16} />}
          />
          <BoutonAction
            libelle="Finalement, sans photo"
            ton="discret"
            onPress={() => onVouloir(false)}
            desactive={occupe}
          />
        </VStack>
      </Animated.View>
    );
  }

  if (phase.nom === "photo-amelioration") {
    return (
      <Animated.View entering={entree}>
        <VStack className="gap-4">
          <Box className="w-40 self-center">
            <PortraitPhoto image={phase.originale} libelle="Ta photo" />
          </Box>
          <HStack className="items-start gap-2 rounded-tuile bg-surface-primary p-3">
            <Icone nom="etincelles" couleur={couleurs.primaire} taille={16} />
            <Texte className="flex-1 text-footnote text-foreground">
              {TEXTES_PHOTO.promesse}
            </Texte>
          </HStack>
          <BoutonAction
            libelle="Oui, améliore-la"
            onPress={() => onAmeliorer(true)}
            enCours={occupe}
            libelleEnCours={TEXTES_PHOTO.enCours}
            icone={<Icone nom="etincelles" couleur={couleurs.surPrimaire} taille={16} />}
          />
          <BoutonAction
            libelle="Non, je garde la mienne"
            ton="secondaire"
            onPress={() => onAmeliorer(false)}
            desactive={occupe}
          />
        </VStack>
      </Animated.View>
    );
  }

  if (phase.nom === "photo-comparaison") {
    return (
      <Animated.View entering={entree}>
        <VStack className="gap-4">
          <HStack className="gap-3">
            <PortraitPhoto
              image={phase.originale}
              libelle="Ta photo"
              onPress={() => onGarder(phase.originale)}
            />
            {phase.amelioree !== null ? (
              <PortraitPhoto
                image={phase.amelioree}
                libelle="Améliorée"
                onPress={() => onGarder(phase.amelioree ?? phase.originale)}
              />
            ) : null}
          </HStack>
          <Texte className="text-center text-footnote text-muted-foreground">
            {phase.amelioree !== null
              ? "Touche celle que tu veux garder."
              : "Ta photo est très bien comme ça."}
          </Texte>
          {phase.amelioree === null ? (
            <BoutonAction
              libelle="Garder ma photo"
              onPress={() => onGarder(phase.originale)}
              enCours={occupe}
            />
          ) : null}
        </VStack>
      </Animated.View>
    );
  }

  return null;
}
