/**
 * Un bouton d'icône d'en-tête. Il n'y en a qu'un dans l'application.
 *
 * ═══ Pourquoi il existe ═══
 *
 * Sa géométrie était recopiée cinq fois — retour, réglages, partage,
 * indicateur de voyage, fermeture d'une feuille :
 *
 *     h-11 w-11 items-center justify-center rounded-champ
 *     border-[1.5px] border-border-champ bg-card
 *
 * Cinq copies tiennent tant qu'on ne touche à rien. Ce qui avait déjà
 * divergé, c'est la **couleur du trait** : orange sur le retour, gris sur
 * la roue des réglages, et `#ff6b00` écrit en dur sur le partage — donc
 * insensible au thème sombre. Trois icônes voisines, trois couleurs, sans
 * qu'aucune règle ne dise laquelle est la bonne.
 *
 * ═══ La règle, désormais ═══
 *
 * Le trait prend l'orange de la marque. Un bouton d'en-tête est une
 * action, et l'orange est la couleur des actions dans Zoumani — la même
 * que celle du bouton principal en bas d'écran. Le gris est réservé à ce
 * qui informe sans se toucher.
 *
 * L'icône reçoit la couleur en argument plutôt que de la choisir : c'est
 * ce qui permet à ce composant de rester l'autorité, et à un thème sombre
 * de basculer les trois sans qu'on retrouve un `#ff6b00` oublié.
 *
 * ═══ Pourquoi il n'a plus de cadre ═══
 *
 * Il portait un contour de 1,5 point et un fond de carte. Les deux sont
 * partis : en en-tête, un bouton d'icône se lit à son icône, et le cadre
 * n'ajoutait qu'une boîte de plus dans une zone qui en compte déjà —
 * l'en-tête, le titre, l'écran.
 *
 * Le fond partait avec le contour, et pas par symétrie. En thème clair,
 * `card` (#fffdf9) et `background` (#fff8f0) sont à un souffle l'un de
 * l'autre : le fond ne se voyait déjà pas. En thème sombre (#26160c contre
 * #1a0e06) il se voyait. Le garder aurait donc laissé une tuile la nuit et
 * rien le jour — le même bouton avec deux allures selon l'heure.
 *
 * Ce qui reste : 44 × 44 points. La cible tactile ne bouge pas d'un pixel,
 * c'est le minimum d'Apple et il ne se négocie pas parce qu'un dessin a
 * maigri.
 *
 * ═══ La pastille ═══
 *
 * Un seul bouton en porte une : l'indicateur de voyage, qui signale qu'on
 * en a un en cours. Elle est ici plutôt que chez lui parce qu'elle se
 * positionne sur le cadre — la sortir du composant l'obligerait à
 * reconstruire ce cadre pour y accrocher un point.
 *
 * Elle remplace ce qui distinguait ce bouton avant : une icône verte quand
 * il y avait un voyage, grise sinon. Deux signaux pour la même
 * information, dont l'un — le gris — laissait croire à un bouton inactif
 * alors qu'il proposait d'en déclarer un.
 *
 * ═══ Ce qu'il ne fait pas ═══
 *
 * Il ne dessine pas l'icône, il l'accueille. Un `Record` de pictogrammes
 * ici obligerait chaque écran qui en ajoute un à modifier un fichier
 * partagé — et l'on finirait avec un catalogue de vingt icônes dont trois
 * servent.
 */

import { Pressable } from "react-native";
import type { ReactElement } from "react";

import { Box } from "@/components/ui/box";
import { useCouleurs } from "@/theme/use-couleurs";

export function BoutonEntete({
  icone: Icone,
  onPress,
  libelleAccessible,
  indice,
  etat,
  pastille = false,
}: {
  /** Le pictogramme, qui reçoit la couleur de l'application. */
  icone: (props: { couleur: string }) => ReactElement;
  onPress: () => void;
  /** Ce qu'annonce un lecteur d'écran — une icône seule ne dit rien. */
  libelleAccessible: string;
  /** Précision annoncée après le libellé, quand l'action mérite un mot. */
  indice?: string;
  /** Pour un bouton qui ouvre ou replie quelque chose. */
  etat?: { expanded?: boolean };
  /** Un point vert au coin : « il y a quelque chose là-derrière ». */
  pastille?: boolean;
}) {
  const couleurs = useCouleurs();

  return (
    <Pressable
      onPress={onPress}
      className="h-11 w-11 items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel={libelleAccessible}
      accessibilityHint={indice}
      accessibilityState={etat}
      // La zone touchable déborde le dessin : 44 points visibles, et l'on
      // rattrape les appuis qui tombent juste à côté — en haut d'écran, le
      // pouce vise mal.
      hitSlop={8}
    >
      <Icone couleur={couleurs.primaire} />
      {pastille ? (
        <Box className="absolute right-1 top-1 h-2 w-2 rounded-full bg-success" />
      ) : null}
    </Pressable>
  );
}
