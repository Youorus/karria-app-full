/**
 * « Tenir sur une page » : la demi-feuille qui règle le dépassement.
 *
 * ═══ Ce qu'on voit ═══
 *
 * En tête, l'état **en direct** : « 2 pages » en ambre tant que ça déborde,
 * « Tient sur une page » en vert dès que la page derrière le dit — c'est
 * la WebView qui compte, pas une estimation. Puis les propositions de
 * Karria (`services/une-page.ts`), du moins coûteux au plus coûteux, chacune
 * avec « Masquer » ; en bas, ce qui est masqué, avec « Montrer ». Même
 * ergonomie que la mise en avant : un geste, un effet visible derrière.
 */

import { Pressable } from "react-native";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { Cv } from "@/features/cv/types/cv.types";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Atelier } from "../hooks/use-atelier";
import { cleDe, libelleDe, RUBRIQUES } from "../services/mise-en-avant";
import { TEXTES } from "../services/presentation";
import { phraseConseil, propositionsUnePage } from "../services/une-page";
import { FeuilleBasse } from "./feuille-basse";

interface Props {
  visible: boolean;
  cv: Cv | null;
  pages: number;
  miseEnAvant: Atelier["miseEnAvant"];
  onFermer: () => void;
}

function Etat({ pages }: { pages: number }) {
  const couleurs = useCouleurs();
  const tient = pages <= 1;
  return (
    <HStack
      className={`items-center gap-2.5 rounded-carte border px-4 py-3 ${
        tient ? "border-success bg-surface-success" : "border-warning bg-surface-warning"
      }`}
      accessibilityLiveRegion="polite"
    >
      <Icone
        nom={tient ? "cocheCercle" : "alerte"}
        couleur={tient ? couleurs.succes : couleurs.avertissement}
        taille={18}
      />
      <Texte className="flex-1 font-bold text-body text-foreground">
        {tient ? TEXTES.unePageTient : `${pages} pages`}
      </Texte>
    </HStack>
  );
}

export function FeuilleUnePage({ visible, cv, pages, miseEnAvant, onFermer }: Props) {
  const couleurs = useCouleurs();
  const propositions = cv === null ? [] : propositionsUnePage(cv);
  const masques = RUBRIQUES.flatMap((rubrique) =>
    miseEnAvant.masques(rubrique).map((e) => ({ rubrique, element: e })),
  );
  return (
    <FeuilleBasse
      visible={visible}
      titre={TEXTES.unePageTitre}
      sousTitre={TEXTES.unePagePhrase}
      onFermer={onFermer}
    >
      <Etat pages={pages} />
      {pages > 1 ? (
        <BoutonAction
          libelle={TEXTES.unePageGarder}
          ton="secondaire"
          onPress={onFermer}
        />
      ) : null}
      <Texte className="text-footnote leading-5 text-muted-foreground">
        {phraseConseil(propositions.length)}
      </Texte>
      {propositions.map((p) => (
        <HStack
          key={p.cle}
          className="items-center gap-2 rounded-carte border border-border-subtle bg-card py-2 pl-3 pr-2"
        >
          <VStack className="flex-1">
            <Texte className="text-body text-foreground" numberOfLines={1}>
              {p.libelle}
            </Texte>
            <Texte className="text-caption text-muted-foreground">{p.raison}</Texte>
          </VStack>
          <Pressable
            onPress={() => miseEnAvant.masquer(p.rubrique, p.index)}
            className="min-h-touch flex-row items-center gap-1 rounded-full bg-remplissage px-3"
            accessibilityRole="button"
            accessibilityLabel={`${TEXTES.masquer} ${p.libelle}`}
          >
            <Icone nom="fermer" couleur={couleurs.texte} taille={10} graisse="bold" />
            <Texte className="font-bold text-footnote text-foreground">
              {TEXTES.masquer}
            </Texte>
          </Pressable>
        </HStack>
      ))}
      {masques.length > 0 ? (
        <VStack className="gap-2 pt-1">
          <Texte className="text-caption text-foreground-faint">{TEXTES.masques}</Texte>
          {masques.map(({ rubrique, element }) => (
            <HStack
              key={cleDe(element)}
              className="items-center gap-2 rounded-carte border border-dashed border-border-champ py-2 pl-3 pr-2"
            >
              <Texte className="flex-1 text-body text-muted-foreground" numberOfLines={1}>
                {libelleDe(element)}
              </Texte>
              <Pressable
                onPress={() => miseEnAvant.montrer(rubrique, cleDe(element))}
                className="min-h-touch flex-row items-center gap-1 px-2"
                accessibilityRole="button"
                accessibilityLabel={`${TEXTES.montrer} ${libelleDe(element)}`}
              >
                <Texte className="font-bold text-footnote text-primary">
                  {TEXTES.montrer}
                </Texte>
              </Pressable>
            </HStack>
          ))}
        </VStack>
      ) : null}
      <Box className="h-2" />
    </FeuilleBasse>
  );
}
