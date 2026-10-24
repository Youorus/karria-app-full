/**
 * Les puces de filtre de la galerie — `templates-gallery-filter-chips` de
 * la V1 : « Tous », « Premium », puis les catégories. La puce active est
 * pleine (bleu, texte blanc), les autres teintées.
 *
 * ═══ La rangée ne grandit jamais ═══
 *
 * Un `ScrollView` porte `flexGrow: 1` par défaut. Posé au-dessus d'une
 * grille courte (une catégorie, une seule carte), il prenait sa part de la
 * hauteur libre et chaque puce s'étirait en pilule de 280 points. D'où
 * `grow-0 shrink-0` sur le défileur, `items-center` sur son contenu et une
 * hauteur **fixe** de puce : la rangée mesure 52 points, quoi qu'il y ait
 * dessous.
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
      className="grow-0 shrink-0"
      contentContainerClassName="items-center gap-2 px-4 py-2"
    >
      {puces.map((p) => (
        <Pressable
          key={p.cle}
          onPress={() => onChoisir(p.filtre)}
          className={`h-9 justify-center rounded-full border px-3.5 ${
            p.active ? "border-primary bg-primary" : "border-border-subtle bg-remplissage"
          }`}
          accessibilityRole="button"
          accessibilityState={{ selected: p.active }}
        >
          <Texte
            numberOfLines={1}
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
