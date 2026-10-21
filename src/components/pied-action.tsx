/**
 * L'action principale d'un écran, posée en bas.
 *
 * ═══ Pourquoi ce composant existe ═══
 *
 * Le même bloc était recopié dans dix-sept écrans :
 *
 *     <Box className="border-t border-border-subtle px-5 pb-2 pt-4">
 *
 * Dix-sept occasions de dériver, et aucune façon de changer d'avis en un
 * seul endroit. Le trait de séparation en est la preuve : il a fallu le
 * retirer partout, et il aurait suffi d'en oublier un pour qu'un écran
 * garde une bordure que plus aucun autre n'a.
 *
 * ═══ Pourquoi plus de bordure ═══
 *
 * Le fond du pied et celui de l'écran sont identiques. Un filet gris au
 * milieu d'un même aplat ne sépare rien : il se lit comme un défaut de
 * rendu, et il enferme l'action dans une barre alors qu'elle doit paraître
 * posée sur la page.
 *
 * ═══ Pourquoi il reste dans le flux, par défaut ═══
 *
 * Il n'est pas superposé au contenu. Un bouton qui flotte **par-dessus** un
 * défilement masque la dernière ligne — celle qu'on vient justement de
 * lire pour décider d'appuyer. Ici la zone défilante s'arrête au-dessus, et
 * l'espace vide fait tout le travail : c'est ce que montre la maquette.
 *
 * ═══ `flottant`, et à quelle condition ═══
 *
 * L'objection ci-dessus vise le *masquage*, pas le flottement. Elle se
 * lève avec de la marge : une zone défilante qui réserve la hauteur du
 * bouton sous son contenu ne cache plus rien, et l'on gagne un bouton
 * toujours atteignable sans remonter.
 *
 * D'où la règle, qui n'est pas négociable : **`flottant` exige que la zone
 * défilante réserve la place.** Compter sur `pb-6` laisserait la dernière
 * ligne définitivement sous le bouton, et c'est le défaut que ce composant
 * évitait au départ.
 *
 * Le conteneur devient transparent : un bandeau opaque posé sur le contenu
 * n'est pas un bouton flottant, c'est la même barre qu'avant, déplacée. Le
 * texte qui passe derrière un bouton plein et arrondi pendant le
 * défilement se lit très bien — c'est ce que fait tout bouton d'action
 * flottant.
 *
 * Il n'est pas le défaut : vingt-huit écrans utilisent ce composant, et
 * basculer les vingt-huit sur la demande d'un seul serait un changement de
 * charte, pas une correction.
 */

import type { ReactNode } from "react";

import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

export function PiedAction({
  entete,
  children,
  flottant = false,
}: {
  /**
   * Ce qui doit rester sous les yeux au moment de valider — un total, un
   * délai. Dans le défilement, un total se perd dès qu'on remonte
   * vérifier une quantité, c'est-à-dire précisément quand on le lit.
   */
  entete?: ReactNode;
  children: ReactNode;
  /**
   * Pose l'action par-dessus le contenu plutôt que sous lui.
   *
   * **L'écran qui l'active doit réserver la hauteur du bouton au bas de sa
   * zone défilante** — sans quoi la dernière ligne reste sous le bouton,
   * ce que ce composant existait précisément pour éviter.
   */
  flottant?: boolean;
}) {
  return (
    <VStack
      space="sm"
      className={
        flottant
          ? // Transparent, et non `bg-background` : un bandeau opaque posé
            // sur le contenu n'est pas un bouton flottant, c'est la même
            // barre qu'avant à un autre endroit.
            "absolute inset-x-0 bottom-0 px-5 pb-2 pt-3"
          : "bg-background px-5 pb-2 pt-3"
      }
      // Le conteneur transparent ne doit pas intercepter les touchers
      // destinés au contenu qui défile derrière lui ; ses enfants, si.
      pointerEvents={flottant ? "box-none" : "auto"}
    >
      {entete === undefined ? null : <Box className="pb-1">{entete}</Box>}
      {children}
    </VStack>
  );
}
