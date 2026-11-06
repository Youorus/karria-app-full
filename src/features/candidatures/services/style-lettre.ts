/**
 * Le style de lettre d'un dossier : la lettre du modèle, ou la lettre sobre.
 *
 * Le serveur parle de `template` (la lettre assortie au modèle de CV) et de
 * `plain` (la lettre sobre sur page blanche) ; l'application dit « modèle »
 * et « sobre ». Un dossier retient le choix (`null` : par défaut — la lettre
 * du modèle s'il en a une, sinon la sobre) ; le rendu et l'export disent le
 * style **réellement servi**, parce qu'un modèle sans lettre assortie sert la
 * sobre quoi qu'on demande.
 */

export type StyleLettre = "modele" | "sobre";
export type StyleLettreBrut = "template" | "plain";

const VERS_APP: Record<StyleLettreBrut, StyleLettre> = {
  template: "modele",
  plain: "sobre",
};
const VERS_API: Record<StyleLettre, StyleLettreBrut> = {
  modele: "template",
  sobre: "plain",
};

/** Ce que le serveur dit → ce que l'application manipule ; inconnu → `null`. */
export function versStyleLettre(brut: string | null | undefined): StyleLettre | null {
  if (brut === "template" || brut === "plain") return VERS_APP[brut];
  return null;
}

/** Ce que l'application a retenu → ce que le serveur attend ; `null` tel quel. */
export function versStyleLettreBrut(style: StyleLettre | null): StyleLettreBrut | null {
  return style === null ? null : VERS_API[style];
}

/** Le style que le serveur servira pour ce choix : la lettre du modèle n'existe
 *  que si le modèle en a une ; sans choix, elle est le défaut. */
export function styleLettreServi(
  choix: StyleLettre | null,
  lettreAssortie: boolean,
): StyleLettre {
  if (!lettreAssortie) return "sobre";
  return choix ?? "modele";
}
