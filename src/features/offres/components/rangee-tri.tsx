/** Les ordres du fil sont des boutons radio, avec une cible tactile complète. */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Tri } from "../types/offres.types";

const AIDES: Record<Tri, string> = {
  pertinence: "Classe selon tes critères de recherche.",
  recentes: "Affiche en premier les offres publiées récemment.",
  proches: "Classe par distance depuis le lieu de ta recherche.",
};

interface Props {
  choix: { tri: Tri; libelle: string }[];
  actif: Tri;
  desactive: boolean;
  onChanger: (tri: Tri) => void;
}

export function RangeeTri({ choix, actif, desactive, onChanger }: Props) {
  const couleurs = useCouleurs();
  return (
    <HStack className="flex-wrap items-center gap-x-1" accessibilityRole="radiogroup">
      <Texte className="mr-1 text-footnote text-muted-foreground">Trier par</Texte>
      {choix.map(({ tri, libelle }) => {
        const selectionne = tri === actif;
        return (
          <Pressable
            key={tri}
            onPress={() => {
              if (!selectionne) onChanger(tri);
            }}
            disabled={desactive}
            className={`min-h-touch flex-row items-center justify-center gap-1 rounded-full px-2 active:opacity-80 ${
              selectionne ? "bg-remplissage" : ""
            }`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectionne, disabled: desactive }}
            accessibilityLabel={libelle}
            accessibilityHint={AIDES[tri]}
          >
            {selectionne ? (
              <Icone nom="coche" couleur={couleurs.primaire} taille={12} />
            ) : null}
            <Texte
              className={`text-footnote ${
                selectionne ? "font-bold text-foreground" : "text-muted-foreground"
              }`}
            >
              {libelle}
            </Texte>
          </Pressable>
        );
      })}
    </HStack>
  );
}
