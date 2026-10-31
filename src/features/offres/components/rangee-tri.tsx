/**
 * Le tri rapide du fil : « Pertinence · Plus récentes · Plus proches ».
 *
 * ═══ Pourquoi des mots et pas des pastilles ═══
 *
 * Le fil a déjà son sélecteur de vue en capsule ; une seconde rangée de
 * capsules ferait deux commandes de même poids l'une sous l'autre. Ici,
 * trois mots séparés de points médians : le choix actif est en gras et en
 * couleur de texte, les autres estompés. Pas d'icône, pas de badge — la
 * rangée se lit comme une phrase et ne vole pas la vedette aux offres.
 *
 * ═══ Accessibilité ═══
 *
 * Un groupe de boutons radio : le lecteur d'écran annonce « Plus proches,
 * bouton radio, sélectionné, 2 sur 3 ». La zone de toucher déborde du mot
 * (`hitSlop`) pour atteindre 44 pt sans épaissir la rangée.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";

import type { Tri } from "../types/offres.types";

/** Ce qui manque à un mot de 20 pt de haut pour une cible de 44 pt. */
const DEBORD = { top: 12, bottom: 12, left: 6, right: 6 };

interface Props {
  choix: { tri: Tri; libelle: string }[];
  actif: Tri;
  /** Pendant un chargement : un second toucher attendrait. */
  desactive: boolean;
  onChanger: (tri: Tri) => void;
}

export function RangeeTri({ choix, actif, desactive, onChanger }: Props) {
  return (
    <HStack
      className="flex-wrap items-center gap-x-2 px-2"
      accessibilityRole="radiogroup"
      accessibilityLabel="Trier les offres"
    >
      {choix.map((c, i) => {
        const selectionne = c.tri === actif;
        return (
          <HStack key={c.tri} className="items-center gap-x-2">
            {i > 0 ? (
              <Texte
                className="text-footnote text-foreground-faint"
                importantForAccessibility="no"
                accessibilityElementsHidden
              >
                ·
              </Texte>
            ) : null}
            <Pressable
              onPress={() => {
                if (!selectionne) onChanger(c.tri);
              }}
              disabled={desactive}
              hitSlop={DEBORD}
              className="py-1"
              accessibilityRole="radio"
              accessibilityState={{ checked: selectionne, disabled: desactive }}
              accessibilityLabel={c.libelle}
            >
              <Texte
                className={`text-footnote ${
                  selectionne ? "font-bold text-foreground" : "text-muted-foreground"
                }`}
              >
                {c.libelle}
              </Texte>
            </Pressable>
          </HStack>
        );
      })}
    </HStack>
  );
}
