/**
 * La photo du CV : la voir, la changer, la retirer.
 *
 * Trois gestes, pas plus. La prise ou le choix passe par le recadrage carré
 * de `useChoixPhoto` ; l'envoi et l'enregistrement sont immédiats (le hook
 * les enchaîne), avec l'état visible dans la barre d'enregistrement.
 * L'amélioration par l'IA reste dans le parcours de création : ici on
 * corrige, on ne retravaille pas.
 */

import { Image } from "expo-image";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Photo } from "../../types/cv.types";

interface Props {
  valeur: Photo;
  enCours: boolean;
  probleme: string | null;
  onChanger: (source: "camera" | "galerie") => void;
  onRetirer: () => void;
}

export function FormulairePhoto({
  valeur,
  enCours,
  probleme,
  onChanger,
  onRetirer,
}: Props) {
  const couleurs = useCouleurs();
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
        <BoutonAction
          libelle="Prendre une photo"
          onPress={() => onChanger("camera")}
          enCours={enCours}
          libelleEnCours="Un instant…"
          icone={<Icone nom="camera" couleur={couleurs.surPrimaire} taille={16} />}
        />
        <BoutonAction
          libelle="Choisir dans mes photos"
          ton="secondaire"
          onPress={() => onChanger("galerie")}
          desactive={enCours}
          icone={<Icone nom="galerie" couleur={couleurs.texte} taille={16} />}
        />
        {valeur.image !== null ? (
          <BoutonAction
            libelle="Retirer la photo"
            ton="discret"
            onPress={onRetirer}
            desactive={enCours}
          />
        ) : null}
        {probleme !== null ? (
          <Texte className="text-center text-footnote text-destructive">{probleme}</Texte>
        ) : null}
      </VStack>
    </VStack>
  );
}
