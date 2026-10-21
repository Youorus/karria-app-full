/**
 * Le champ de saisie de Zoumani.
 *
 * ═══ C'est ici que se joue l'identité, et nulle part ailleurs ═══
 *
 * Un champ est l'endroit où l'utilisateur passe le plus de temps à
 * regarder. Sa hauteur, son contour, sa façon de signaler une faute :
 * trois choses qui doivent être identiques sur les vingt écrans à venir.
 * Modifier ce fichier modifie l'application entière — c'est précisément
 * ce qu'on attend de lui.
 *
 * ═══ Pourquoi 56 points et non 48 ═══
 *
 * 48 est le **minimum** tactile, pas une cible. À 48, un champ est
 * atteignable ; à 56, il est évident. La différence ne se décrit pas,
 * elle se voit : c'est la hauteur des applications dont on dit qu'elles
 * respirent. La valeur vit dans le thème (`--spacing-champ`), donc elle
 * se change partout d'une ligne.
 *
 * ═══ Les trois états ═══
 *
 * Ils ne sont plus décrits ici : ils vivent dans `contourDeChamp`, avec
 * tous les autres champs de l'application. Ce qui reste propre à
 * celui-ci, c'est que le message d'erreur s'affiche **dessous** — une
 * erreur en haut de l'écran oblige à deviner quel champ elle concerne.
 *
 * ═══ Pourquoi pas l'`Input` de gluestack ═══
 *
 * Il impose sa hauteur et son contour, et les classes qu'on lui passe
 * perdent contre les siens — le même piège que son `Text`, qui rendait le
 * mot-logo plus petit que son accroche. Ici, rien ne concurrence le
 * thème.
 */

import { type ReactNode, forwardRef, useState, type ReactElement } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { HStack } from "@/components/ui/hstack";
import { contourDeChamp } from "@/components/contour-champ";
import { VStack } from "@/components/ui/vstack";
import { Texte } from "@/components/texte";
import { useCouleurs } from "@/theme/use-couleurs";

interface ChampTexteProps extends Omit<TextInputProps, "style" | "className"> {
  libelle: string;
  /** Message d'erreur. Sa présence suffit à basculer le champ en rouge. */
  erreur?: string;
  /** Précision affichée sous le champ quand tout va bien. */
  aide?: string;
  /**
   * Pictogramme posé à gauche de la saisie.
   *
   * Il ne remplace pas le libellé, il le double : une silhouette dit
   * « une personne » sans dire *laquelle*, et « Prénom » ou « Nom » ne se
   * devine pas d'une icône. Ce qu'il apporte est le repère — on retrouve
   * une ligne dans un formulaire de cinq champs sans relire les libellés.
   *
   * C'est un **composant** et non un élément déjà construit : le champ lui
   * passe la couleur de son état. L'icône s'allume avec le contour quand on
   * écrit, et redevient grise en le quittant. Un élément figé aurait obligé
   * chaque appelant à connaître le focus du champ — c'est-à-dire à le
   * dupliquer.
   */
  icone?: (props: { couleur: string }) => ReactElement;
  /** Un élément en fin de cadre — une croix d'effacement, par exemple. */
  accessoire?: ReactNode;
}

export const ChampTexte = forwardRef<TextInput, ChampTexteProps>(function ChampTexte(
  { libelle, erreur, aide, icone: Icone, accessoire, ...props },
  ref,
) {
  const couleurs = useCouleurs();
  const [actif, setActif] = useState(false);

  const contour = contourDeChamp({ actif, erreur });

  return (
    <VStack space="xs">
      {/* Un libellé vide n'occupe pas de place : certains champs sont
          déjà annoncés par le titre de l'écran, et une ligne blanche
          au-dessus se voit. */}
      {libelle === "" ? null : (
        <Texte className="font-bold text-footnote text-foreground">{libelle}</Texte>
      )}

      {/* Le contour est porté par l'enveloppe, pas par la saisie : c'est
          ce qui permet à l'icône d'être **dans** le cadre. Le `TextInput`
          n'a donc plus ni bordure ni marge horizontale, et prend la place
          qui reste. */}
      <HStack
        space="sm"
        className={`h-champ items-center rounded-champ bg-card px-4 ${contour}`}
      >
        {Icone === undefined ? null : (
          <Icone couleur={actif ? couleurs.primaire : couleurs.estompe} />
        )}
        <TextInput
          ref={ref}
          className="h-full flex-1 font-sans text-callout text-foreground"
          // La couleur du curseur et de la sélection est une propriété
          // native : aucune classe ne l'atteint. Elle vient du thème pour
          // ne pas devenir un orange orphelin au prochain changement de
          // charte.
          selectionColor={couleurs.primaire}
          onFocus={(evenement) => {
            setActif(true);
            props.onFocus?.(evenement);
          }}
          onBlur={(evenement) => {
            setActif(false);
            props.onBlur?.(evenement);
          }}
          accessibilityLabel={libelle}
          accessibilityState={{ disabled: props.editable === false }}
          {...props}
        />
        {accessoire}
      </HStack>

      {erreur ? (
        <Texte className="text-footnote text-destructive" accessibilityRole="alert">
          {erreur}
        </Texte>
      ) : aide ? (
        <Texte className="text-footnote text-muted-foreground">{aide}</Texte>
      ) : null}
    </VStack>
  );
});
