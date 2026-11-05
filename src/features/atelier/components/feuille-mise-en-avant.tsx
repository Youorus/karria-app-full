/**
 * « Mise en avant » : l'ordre des éléments, et ce qu'on montre.
 *
 * Par rubrique, chaque élément avec monter / descendre et « Masquer » ; en
 * bas de la rubrique, ce qui est masqué dans ce CV, avec « Montrer ». Une
 * demi-feuille : chaque geste se voit sur la page derrière. L'ordre des
 * rubriques n'est pas proposé — c'est le modèle qui le fixe, et la feuille
 * le dit (`services/mise-en-avant.ts`).
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { Cv } from "@/features/cv/types/cv.types";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Atelier } from "../hooks/use-atelier";
import {
  cleDe,
  libelleDe,
  LIBELLES_RUBRIQUES,
  RUBRIQUES,
} from "../services/mise-en-avant";
import { TEXTES } from "../services/presentation";
import { FeuilleBasse } from "./feuille-basse";

function Rond({
  icone,
  libelle,
  onPress,
  desactive,
  retourne = false,
}: {
  icone: "haut" | "fermer";
  libelle: string;
  onPress: () => void;
  desactive: boolean;
  retourne?: boolean;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      className={`h-9 w-9 items-center justify-center rounded-full bg-remplissage ${desactive ? "opacity-30" : ""}`}
      accessibilityRole="button"
      accessibilityLabel={libelle}
    >
      <Box className={retourne ? "rotate-180" : ""}>
        <Icone nom={icone} couleur={couleurs.texte} taille={12} graisse="semibold" />
      </Box>
    </Pressable>
  );
}

interface Props {
  visible: boolean;
  cv: Cv | null;
  miseEnAvant: Atelier["miseEnAvant"];
  onFermer: () => void;
}

export function FeuilleMiseEnAvant({ visible, cv, miseEnAvant, onFermer }: Props) {
  const couleurs = useCouleurs();
  return (
    <FeuilleBasse
      visible={visible}
      titre={TEXTES.miseEnAvantTitre}
      sousTitre={TEXTES.miseEnAvantPhrase}
      onFermer={onFermer}
    >
      {cv === null
        ? null
        : RUBRIQUES.map((rubrique) => {
            const elements = cv[rubrique];
            const masques = miseEnAvant.masques(rubrique);
            if (elements.length === 0 && masques.length === 0) return null;
            return (
              <VStack key={rubrique} className="gap-2">
                <Texte className="font-bold text-footnote text-foreground">
                  {LIBELLES_RUBRIQUES[rubrique]}
                </Texte>
                {elements.map((e, i) => (
                  <HStack
                    key={`${cleDe(e)}-${i}`}
                    className="items-center gap-2 rounded-carte border border-border-subtle bg-card py-2 pl-3 pr-2"
                  >
                    <Texte className="flex-1 text-body text-foreground" numberOfLines={1}>
                      {libelleDe(e)}
                    </Texte>
                    <Rond
                      icone="haut"
                      libelle="Monter"
                      desactive={i === 0}
                      onPress={() => miseEnAvant.deplacer(rubrique, i, i - 1)}
                    />
                    <Rond
                      icone="haut"
                      libelle="Descendre"
                      retourne
                      desactive={i === elements.length - 1}
                      onPress={() => miseEnAvant.deplacer(rubrique, i, i + 1)}
                    />
                    <Pressable
                      onPress={() => miseEnAvant.masquer(rubrique, i)}
                      className="min-h-touch justify-center px-2"
                      accessibilityRole="button"
                      accessibilityLabel={`${TEXTES.masquer} ${libelleDe(e)}`}
                    >
                      <Texte className="font-bold text-footnote text-muted-foreground">
                        {TEXTES.masquer}
                      </Texte>
                    </Pressable>
                  </HStack>
                ))}
                {masques.length > 0 ? (
                  <VStack className="gap-2 pt-1">
                    <Texte className="text-caption text-foreground-faint">
                      {TEXTES.masques}
                    </Texte>
                    {masques.map((e) => (
                      <HStack
                        key={cleDe(e)}
                        className="items-center gap-2 rounded-carte border border-dashed border-border-champ py-2 pl-3 pr-2"
                      >
                        <Texte
                          className="flex-1 text-body text-muted-foreground"
                          numberOfLines={1}
                        >
                          {libelleDe(e)}
                        </Texte>
                        <Pressable
                          onPress={() => miseEnAvant.montrer(rubrique, cleDe(e))}
                          className="min-h-touch flex-row items-center gap-1 px-2"
                          accessibilityRole="button"
                          accessibilityLabel={`${TEXTES.montrer} ${libelleDe(e)}`}
                        >
                          <Icone nom="vu" couleur={couleurs.primaire} taille={14} />
                          <Texte className="font-bold text-footnote text-primary">
                            {TEXTES.montrer}
                          </Texte>
                        </Pressable>
                      </HStack>
                    ))}
                  </VStack>
                ) : null}
              </VStack>
            );
          })}
      <Texte className="pt-2 text-caption text-foreground-faint">
        {TEXTES.miseEnAvantRubriques}
      </Texte>
    </FeuilleBasse>
  );
}
