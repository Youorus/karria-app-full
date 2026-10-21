/**
 * L'en-tête de Zoumani, en un seul endroit.
 *
 * ═══ Pourquoi une fabrique et non six blocs recopiés ═══
 *
 * Le même réglage — fond, police du titre, absence d'ombre, bouton de
 * retour — était écrit six fois : dans le navigateur d'onglets, dans celui
 * de la messagerie, dans celui du profil, dans la vérification, dans la
 * racine et dans la connexion. Six copies, donc six occasions de dériver :
 * il suffisait d'en corriger cinq pour qu'un écran garde l'ancien
 * alignement, et rien ne le signalait.
 *
 * ═══ Le vrai sujet : l'alignement horizontal ═══
 *
 * Les boutons d'en-tête se posaient à environ neuf points du bord, alors
 * que **tout** le contenu des écrans commence à vingt — `px-5`. L'œil voit
 * deux colonnes légèrement décalées sans savoir dire pourquoi, et c'est ce
 * que la capture montrait : le chevron plus à gauche que la carte juste
 * en dessous.
 *
 * `MARGE_ECRAN` est donc la même valeur pour les deux, et elle est
 * déclarée ici. La changer déplace l'en-tête et les écrans ensemble.
 *
 * ═══ Ce que cette fabrique ne fait pas ═══
 *
 * Elle ne pose ni titre, ni `headerRight`, ni `headerShown` : ce sont des
 * décisions d'écran, pas de charte. Un écran les ajoute par-dessus.
 */

import type { ReactNode } from "react";

import { BoutonRetour } from "@/components/bouton-retour";
import { FOND, type ModeTheme, TEXTE } from "@/theme";

/**
 * La marge latérale de l'application, en points.
 *
 * C'est la valeur de `px-5` de Tailwind — 1,25 rem à 16 px par rem. Elle
 * est répétée ici en nombre parce qu'un en-tête natif ne comprend pas les
 * classes utilitaires : il veut un style. Les deux doivent rester égales,
 * et c'est le seul endroit du projet où l'une est écrite en chiffres.
 */
export const MARGE_ECRAN = 20;

/** Les réglages d'en-tête communs à toute l'application. */
export function optionsEntete(mode: ModeTheme) {
  return {
    headerStyle: { backgroundColor: FOND[mode] },
    headerTitleStyle: {
      fontFamily: "ManropeBold",
      fontSize: 17,
      color: TEXTE[mode],
    },
    // Pas de ligne de séparation : le fond de l'en-tête et celui de l'écran
    // sont identiques, et un filet gris au milieu d'un même aplat se lit
    // comme un défaut de rendu.
    headerShadowVisible: false,
    headerLeftContainerStyle: { paddingLeft: MARGE_ECRAN },
    headerRightContainerStyle: { paddingRight: MARGE_ECRAN },
    // La couleur ne se passe plus : `BoutonEntete` en est l'autorité,
    // pour les cinq boutons d'en-tête de l'application.
    headerLeft: (): ReactNode => <BoutonRetour />,
  } as const;
}
