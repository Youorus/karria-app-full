/**
 * La pastille « Premium » d'un modèle payant — sur la carte de la galerie
 * et dans le détail.
 *
 * ═══ Pourquoi pas l'ancien « PRO » noir ═══
 *
 * Un modèle Premium n'est pas un outil « pro » : c'est un modèle plus
 * travaillé, qu'on achète. La pastille le dit avec l'or de la V1, en
 * retenue : surface crème, filet doré, couronne et mot en or foncé. Le
 * texte prend `premium-texte` et non `premium` : l'or clair de la V1 ne
 * fait que 2,2:1 sur un CV blanc, illisible à cette taille.
 *
 * La surface est opaque : posée sur la vignette d'un CV, elle doit rester
 * lisible quel que soit le dessin du modèle dessous.
 */

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { PREMIUM_TEXTE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

export function PastillePremium({ grande = false }: { grande?: boolean }) {
  const { mode } = useCouleurs();
  return (
    <HStack
      className={`items-center gap-1 self-start rounded-full border border-border-premium bg-surface-premium ${
        grande ? "px-2.5 py-1" : "px-2 py-[3px]"
      }`}
      accessibilityLabel="Modèle Premium"
    >
      <Icone
        nom="couronne"
        couleur={PREMIUM_TEXTE[mode]}
        taille={grande ? 12 : 10}
        graisse="semibold"
      />
      <Texte
        className={`font-bold tracking-wide text-premium-texte ${
          grande ? "text-caption" : "text-[10px]"
        }`}
      >
        Premium
      </Texte>
    </HStack>
  );
}
