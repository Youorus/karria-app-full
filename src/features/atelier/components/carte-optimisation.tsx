/**
 * « Optimiser pour les ATS » : la carte qu'on ne peut pas rater.
 *
 * ═══ Pourquoi une carte, et pourquoi là ═══
 *
 * Marc (2026-11-13) : au premier passage, quand Karria a mis le CV à 87 %,
 * le bouton d'optimisation doit être « très visible et impossible à rater »,
 * et l'on doit comprendre qu'il rend le CV **encore plus** compatible que
 * ce que Karria a déjà fait. D'où une carte à part, juste sous le verdict :
 * un titre qui promet, le gain en points, et le seul bouton bleu de la
 * zone. Après l'optimisation, la carte devient une ligne « Version optimisée
 * pour les ATS » : la promesse est tenue, on ne la refait pas.
 *
 * ═══ Un endroit pour convertir, plus tard ═══
 *
 * Cette carte est l'endroit où une offre payante pourra se poser (Marc :
 * « des endroits où je puisse convertir plus tard ») : elle est isolée, elle
 * porte sa propre promesse, et son bouton est le seul geste. Rien ici ne
 * suppose encore un paiement.
 */

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { phraseOptimisation, TEXTES } from "../services/presentation";

interface Props {
  /** Les points que la version optimisée ferait gagner. */
  gain: number;
  enCours: boolean;
  onOptimiser: () => void;
}

export function CarteOptimisation({ gain, enCours, onOptimiser }: Props) {
  const couleurs = useCouleurs();
  return (
    <VStack className="gap-4 rounded-carte border-[1.5px] border-primary bg-surface-primary p-5">
      <HStack className="items-start gap-3">
        <Box className="h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Icone nom="etincelles" couleur={couleurs.surPrimaire} taille={18} />
        </Box>
        <VStack className="flex-1 gap-1">
          <Texte
            accessibilityRole="header"
            className="font-display text-title-sm leading-6 tracking-tight text-foreground"
          >
            {TEXTES.optimiserTitre}
          </Texte>
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {phraseOptimisation(gain)}
          </Texte>
        </VStack>
      </HStack>
      <BoutonAction
        libelle={TEXTES.optimiserBouton}
        ton="principal"
        enCours={enCours}
        libelleEnCours="Karria optimise…"
        iconeFin={
          <Icone
            nom="suivant"
            couleur={couleurs.surPrimaire}
            taille={13}
            graisse="bold"
          />
        }
        onPress={onOptimiser}
      />
    </VStack>
  );
}

/** Après l'optimisation : la promesse tenue, en une ligne. */
export function LigneOptimisee() {
  const couleurs = useCouleurs();
  return (
    <HStack
      className="items-center gap-2.5 rounded-carte border border-border-subtle bg-card px-4 py-3"
      accessibilityRole="text"
    >
      <Box className="h-7 w-7 items-center justify-center rounded-full bg-surface-success">
        <Icone nom="coche" couleur={couleurs.succes} taille={12} graisse="bold" />
      </Box>
      <Texte className="flex-1 font-bold text-footnote text-foreground">
        {TEXTES.optimiseBadge}
      </Texte>
    </HStack>
  );
}
