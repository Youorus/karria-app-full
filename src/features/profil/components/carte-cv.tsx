/**
 * Le raccourci « Mon CV » du profil.
 *
 * Une ligne, une icône, l'état en un mot et un chevron : la V1 avait
 * « Modifier mon profil » ici. Le CV est désormais la seule chose à
 * modifier, donc on y mène directement — à la création s'il n'existe pas,
 * à l'onglet sinon. La teinte de la tuile suit l'état : bleu quand il
 * est prêt, orange quand quelque chose attend.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { EtatDuCv } from "../services/identite";

const TITRES: Record<EtatDuCv, string> = {
  pret: "Mon CV",
  "en-cours": "Reprendre mon CV",
  absent: "Créer mon CV avec Karria",
};

interface Props {
  cv: { etat: EtatDuCv; resume: string } | null;
  onPress: () => void;
}

export function CarteCv({ cv, onPress }: Props) {
  const couleurs = useCouleurs();
  const attend = cv !== null && cv.etat !== "pret";

  return (
    <Pressable
      onPress={onPress}
      disabled={cv === null}
      className="min-h-touch flex-row items-center gap-3 rounded-carte border border-border-subtle bg-card p-4 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={
        cv === null ? "Mon CV, chargement" : `${TITRES[cv.etat]}. ${cv.resume}`
      }
    >
      <Box
        className={`h-11 w-11 items-center justify-center rounded-tuile ${
          attend ? "bg-surface-warning" : "bg-surface-primary"
        }`}
      >
        <Icone
          nom={attend ? "micro" : "cvPlein"}
          couleur={attend ? couleurs.avertissement : couleurs.primaire}
          taille={18}
        />
      </Box>
      <VStack className="flex-1 gap-0.5">
        {cv === null ? (
          <>
            <Box className="h-4 w-28 rounded-full bg-remplissage" />
            <Box className="h-3 w-44 rounded-full bg-remplissage-doux" />
          </>
        ) : (
          <>
            <Texte className="font-bold text-body text-foreground">
              {TITRES[cv.etat]}
            </Texte>
            <Texte className="text-footnote text-muted-foreground" numberOfLines={2}>
              {cv.resume}
            </Texte>
          </>
        )}
      </VStack>
      <Icone nom="suivant" couleur={couleurs.estompe} taille={14} graisse="semibold" />
    </Pressable>
  );
}
