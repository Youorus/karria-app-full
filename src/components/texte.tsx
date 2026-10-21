/**
 * Le texte de Zoumani.
 *
 * ═══ Pourquoi ne pas utiliser le `Text` de gluestack ═══
 *
 * Il porte une taille par défaut — `size="md"`, donc `text-base` — qui
 * **écrase** la classe qu'on lui passe. Le symptôme, vu sur simulateur :
 * le mot-logo en `text-hero` (36 pt) s'affichait plus petit que son
 * accroche en `text-title-sm` (20 pt). Aucune erreur, aucun avertissement ;
 * seulement une hiérarchie inversée qu'on ne comprend qu'en mesurant.
 *
 * Ici, aucune taille par défaut : la classe passée est la seule qui
 * s'applique. C'est la condition pour que `src/theme/tokens.css` reste
 * réellement la source unique des valeurs visuelles (règle 3.3).
 *
 * ═══ Pourquoi un composant plutôt que `Text` de React Native ═══
 *
 * Pour n'avoir qu'un seul import à changer le jour où il faut ajouter
 * quelque chose à tous les textes — une taille maximale de mise à
 * l'échelle, une police de repli, un comportement de sélection.
 */

import { Text as TextRN, type TextProps } from "react-native";

export interface TexteProps extends TextProps {
  className?: string;
}

export function Texte({ className, ...props }: TexteProps) {
  return (
    <TextRN
      className={className}
      // Les deux plateformes laissent l'utilisateur agrandir le texte, et
      // beaucoup le font. On suit ce réglage — c'est ce que demandent
      // Apple et Google — mais on le borne : au-delà du double, une
      // interface de liste devient une colonne de mots et les boutons se
      // chevauchent.
      maxFontSizeMultiplier={2}
      {...props}
    />
  );
}

/**
 * Un titre d'écran.
 *
 * Identique à `Texte`, à ceci près qu'il s'annonce comme un en-tête : un
 * lecteur d'écran permet alors de sauter de titre en titre au lieu de
 * parcourir tout l'écran mot à mot.
 */
export function Titre({ className, ...props }: TexteProps) {
  return <Texte className={className} accessibilityRole="header" {...props} />;
}
