/**
 * Le bouton d'action de Karria.
 *
 * ═══ En capsule ═══
 *
 * Les champs gardent l'angle de `--radius-champ` ; les boutons sont des
 * capsules. C'est la convention des interfaces conversationnelles
 * actuelles, et elle distingue d'un coup d'œil ce qui se remplit de ce
 * qui se touche.
 *
 * ═══ Un seul fichier pour tous les boutons de l'application ═══
 *
 * C'était l'enjeu : les écrans utilisaient le bouton de gluestack, dont
 * la hauteur et la graisse ne viennent pas du thème. Changer l'identité
 * demandait alors de passer sur chaque écran — donc d'en oublier un.
 * Ici, une ligne modifiée se voit partout.
 *
 * ═══ Trois tons, et un seul appelle au clic ═══
 *
 * `principal` porte l'orange Teranga. Il n'y en a **qu'un par écran** :
 * deux boutons qui appellent au clic, c'est aucun.
 *
 * `secondaire` est un contour : il propose sans insister — « Corriger »,
 * « Garder mon envoi ».
 *
 * `discret` n'a ni fond ni contour : pour ce qui doit exister sans peser,
 * comme « Je n'ai rien reçu ».
 *
 * `destructif` est rouge plein. Il n'existe que pour un geste qui ne se
 * défait pas — supprimer son compte — et toujours **après** un écran qui a
 * dit ce qui va disparaître : la couleur avertit, le texte explique.
 *
 * ═══ Pourquoi la même hauteur que les champs ═══
 *
 * 56 points, comme `ChampTexte`. Un formulaire dont le bouton est plus
 * bas que ses champs a l'air bricolé, et le défaut se voit sans qu'on
 * sache le nommer. Les deux lisent `--spacing-champ`.
 *
 * ═══ L'état pressé est natif ═══
 *
 * `Pressable` rend l'opacité pendant l'appui sur les deux plateformes.
 * On ne le redessine pas : c'est ce qui donne la sensation que le bouton
 * répond, et chaque système a la sienne.
 */

import { Pressable, type PressableProps } from "react-native";

import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Texte } from "@/components/texte";

type Ton = "principal" | "secondaire" | "discret" | "destructif";

const FOND: Record<Ton, string> = {
  principal: "bg-primary",
  secondaire: "border-[1.5px] border-border-champ bg-card",
  discret: "",
  destructif: "bg-destructive",
};

const TEXTE: Record<Ton, string> = {
  principal: "text-primary-foreground",
  secondaire: "text-foreground",
  discret: "text-primary",
  destructif: "text-destructive-foreground",
};

export interface BoutonActionProps extends Omit<PressableProps, "children" | "style"> {
  libelle: string;
  ton?: Ton;
  /** Remplace le libellé et bloque l'appui pendant l'attente. */
  enCours?: boolean;
  /** Ce qu'on affiche pendant l'attente. « Envoi… » vaut mieux qu'un
   *  bouton figé : il dit que quelque chose se passe. */
  libelleEnCours?: string;
  desactive?: boolean;
  /** Une icône à gauche du libellé — un logo de fournisseur, par exemple. */
  icone?: React.ReactNode;
  /** Une icône **après** le libellé. Réservée à ce qui indique une suite :
   *  la flèche d'un parcours en étapes. À gauche, une flèche vers la
   *  droite se lit comme un objet ; à droite, comme une direction. */
  iconeFin?: React.ReactNode;
  /** Occupe toute la largeur. Vrai par défaut : sur un téléphone, un
   *  bouton d'action pleine largeur est la cible la plus sûre. */
  pleineLargeur?: boolean;
}

export function BoutonAction({
  libelle,
  ton = "principal",
  enCours = false,
  libelleEnCours,
  desactive = false,
  icone,
  iconeFin,
  pleineLargeur = true,
  ...props
}: BoutonActionProps) {
  const bloque = desactive || enCours;
  // Le lecteur d’écran annonce la même attente que le texte visible (A83).
  const libelleAffiche = enCours ? (libelleEnCours ?? libelle) : libelle;

  return (
    <Pressable
      disabled={bloque}
      className={`h-champ justify-center rounded-full px-6 ${FOND[ton]} ${
        pleineLargeur ? "w-full" : ""
      } ${bloque ? "opacity-50" : ""}`}
      accessibilityRole="button"
      accessibilityLabel={libelleAffiche}
      accessibilityState={{ disabled: bloque, busy: enCours }}
      {...props}
    >
      <HStack space="sm" className="items-center justify-center">
        {enCours ? <Spinner size="small" /> : icone}
        <Texte className={`font-bold text-callout ${TEXTE[ton]}`} numberOfLines={1}>
          {libelleAffiche}
        </Texte>
        {enCours ? null : iconeFin}
      </HStack>
    </Pressable>
  );
}
