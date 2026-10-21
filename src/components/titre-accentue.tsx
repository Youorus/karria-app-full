/**
 * Un titre dont une partie porte l'orange de la marque.
 *
 * ═══ Pourquoi un composant et non deux `<Texte>` collés ═══
 *
 * Parce que la coupure de ligne doit tomber au bon endroit. « Le monde
 * voyage. / **Vos colis** aussi. » perd tout si « Vos » finit seul en fin
 * de ligne. Deux textes frères se recalent chacun de leur côté ; ici la
 * phrase reste une phrase, et l'accent n'est qu'une couleur à
 * l'intérieur.
 *
 * ═══ Ce que l'accent fait ═══
 *
 * Il désigne le sujet réel — les colis, le nombre de chiffres — au milieu
 * d'une phrase qu'on lit d'un trait. C'est ce qui remplace un titre
 * bavard : trois mots en orange disent où regarder.
 */

import { Texte } from "@/components/texte";

export function TitreAccentue({
  avant,
  accent,
  apres,
  taille = "titre",
  className = "",
}: {
  avant: string;
  accent: string;
  apres?: string;
  /**
   * `hero` pour un écran qui ne dit qu'une chose.
   *
   * Les deux fragments doivent grandir ensemble : l'accent porte sa propre
   * taille, et n'agir que sur la classe extérieure produirait deux
   * moitiés de titre de tailles différentes.
   */
  taille?: "titre" | "hero";
  className?: string;
}) {
  const echelle = taille === "hero" ? "text-hero" : "text-title-lg";
  return (
    <Texte
      className={`font-display ${echelle} leading-tight text-foreground ${className}`}
      accessibilityRole="header"
      // Le lecteur d'écran doit lire la phrase entière d'une traite : la
      // couleur ne s'entend pas, et découper l'annonce en trois morceaux
      // ferait entendre trois titres.
      accessibilityLabel={`${avant}${accent}${apres ?? ""}`}
    >
      {avant}
      <Texte className={`font-display ${echelle} leading-tight text-primary`}>
        {accent}
      </Texte>
      {apres}
    </Texte>
  );
}
