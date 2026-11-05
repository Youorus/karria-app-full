/**
 * Les deux segments de l'onglet : « Toutes » / « Candidatées ».
 *
 * Une capsule sur fond teinté, le segment actif posé dessus comme une
 * carte, avec son effectif. Deux segments, pas trois : « prêtes » ou « en
 * cours » se lisent sur chaque carte, et un filtre de plus serait un
 * choix de plus avant de voir ses dossiers.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";

import type { Segment } from "../hooks/use-dossiers";
import { TEXTES } from "../services/presentation";

interface Props {
  segment: Segment;
  effectifs: Record<Segment, number>;
  onChanger: (segment: Segment) => void;
}

const CHOIX: { segment: Segment; libelle: string }[] = [
  { segment: "toutes", libelle: TEXTES.segmentToutes },
  { segment: "candidatees", libelle: TEXTES.segmentCandidatees },
];

export function Segments({ segment, effectifs, onChanger }: Props) {
  return (
    <HStack className="rounded-full bg-remplissage p-1" accessibilityRole="tablist">
      {CHOIX.map((c) => {
        const actif = c.segment === segment;
        return (
          <Pressable
            key={c.segment}
            onPress={() => onChanger(c.segment)}
            className={`min-h-[40px] flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-3 ${
              actif ? "border border-border-subtle bg-card" : ""
            }`}
            accessibilityRole="tab"
            accessibilityState={{ selected: actif }}
            accessibilityLabel={`${c.libelle}, ${effectifs[c.segment]}`}
          >
            <Texte
              className={`font-bold text-footnote ${actif ? "text-foreground" : "text-muted-foreground"}`}
            >
              {c.libelle}
            </Texte>
            <Texte
              className={`text-caption ${actif ? "text-muted-foreground" : "text-foreground-faint"}`}
            >
              {effectifs[c.segment]}
            </Texte>
          </Pressable>
        );
      })}
    </HStack>
  );
}
