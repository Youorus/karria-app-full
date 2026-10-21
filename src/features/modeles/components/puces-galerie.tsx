/**
 * Les puces de filtre de la galerie — `templates-gallery-filter-chips` de
 * la V1 : « Tous », « Pro », puis les catégories. La puce active est
 * pleine (bleu, texte blanc), les autres teintées.
 */

import { Pressable, ScrollView } from "react-native";

import { Texte } from "@/components/texte";

import type { Puce } from "../services/presentation";
import type { FiltreGalerie } from "../types/modeles.types";

interface Props {
  puces: (Puce & { active: boolean })[];
  onChoisir: (filtre: FiltreGalerie) => void;
}

export function PucesGalerie({ puces, onChoisir }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-2"
    >
      {puces.map((p) => (
        <Pressable
          key={p.cle}
          onPress={() => onChoisir(p.filtre)}
          className={`min-h-9 justify-center rounded-full border px-3 py-1.5 ${
            p.active ? "border-primary bg-primary" : "border-border-subtle bg-remplissage"
          }`}
          accessibilityRole="button"
          accessibilityState={{ selected: p.active }}
        >
          <Texte
            className={`font-bold text-footnote ${
              p.active ? "text-primary-foreground" : "text-foreground"
            }`}
          >
            {p.libelle}
          </Texte>
        </Pressable>
      ))}
    </ScrollView>
  );
}
