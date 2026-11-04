/**
 * Le mini-fil : trois cartes d'offres en miniature, dont l'annonce du
 * milieu s'efface.
 *
 * ═══ Pourquoi un dessin, et celui-là ═══
 *
 * « Sans pub » se comprend d'un coup d'œil quand on **voit** le fil : deux
 * offres, une annonce entre elles qui pâlit et se barre. C'est la seule
 * illustration du soutien ; elle est faite de la matière du produit (les
 * cartes du fil), pas d'une icône générique, et c'est elle qui porte
 * l'audace — tout le reste est calme.
 *
 * Décorative : masquée au lecteur d'écran, qui lit le titre à côté.
 */

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Texte } from "@/components/texte";

import { TEXTES } from "../services/presentation";

function Carte({ annonce = false, grande }: { annonce?: boolean; grande: boolean }) {
  return (
    <HStack
      className={`items-center gap-2.5 rounded-tuile border border-border-subtle bg-card ${
        grande ? "px-4 py-3" : "px-3 py-2"
      } ${annonce ? "opacity-40" : ""}`}
    >
      <Box
        className={`rounded-pastille ${annonce ? "bg-track" : "bg-surface-primary"} ${
          grande ? "h-8 w-8" : "h-5 w-5"
        }`}
      />
      <VStack className="flex-1 gap-1.5">
        <Box
          className={`rounded-full bg-track ${grande ? "h-2.5 w-36" : "h-1.5 w-20"}`}
        />
        <Box
          className={`rounded-full bg-remplissage-doux ${grande ? "h-2.5 w-20" : "h-1.5 w-12"}`}
        />
      </VStack>
      {annonce ? (
        <Texte className="text-caption font-bold text-foreground-faint line-through">
          {TEXTES.annonce}
        </Texte>
      ) : null}
    </HStack>
  );
}

export function MiniFil({ grande = false }: { grande?: boolean }) {
  return (
    <VStack
      className={grande ? "gap-2" : "gap-1.5"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Carte grande={grande} />
      <Carte grande={grande} annonce />
      <Carte grande={grande} />
    </VStack>
  );
}
