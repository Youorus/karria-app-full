/**
 * Le symbole de Karria : le « K » circuit de la V1, en vecteur.
 *
 * ═══ Pourquoi un tracé plutôt qu'une image ═══
 *
 * Net à toutes les tailles et sur tous les écrans (1x à 3x, iOS comme
 * Android), et recolorable sans second fichier : il prend la couleur du
 * texte du thème, donc s'inverse seul en mode sombre — exactement comme
 * le logo de la V1, navy sur clair, blanc sur nuit.
 *
 * ═══ Deux teintes ═══
 *
 * - `marque` (défaut) : la couleur du texte. C'est le K de l'icône
 *   d'application, celui que l'utilisateur reconnaît.
 * - `aura` : le dégradé bleu-violet, réservé aux moments où Karria
 *   « parle » (signature d'une réponse, d'une analyse).
 * - `reflet` : blanc, pour être posé sur l'orbe.
 */

import Svg, { Defs, G, LinearGradient, Path, Stop } from "react-native-svg";

import { AURA } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { BOITE_K, DECALAGE_K, TRACE_K } from "./trace-k";

export type TeinteSymbole = "marque" | "aura" | "reflet";

interface Props {
  /** Hauteur, en points. La largeur suit les proportions du K. */
  taille?: number;
  teinte?: TeinteSymbole;
  /** Impose une couleur — l'onglet actif de la barre, par exemple. */
  couleur?: string;
}

export function SymboleKarria({ taille = 56, teinte = "marque", couleur }: Props) {
  const { texte } = useCouleurs();
  const largeur = (taille * BOITE_K.largeur) / BOITE_K.hauteur;
  const remplissage =
    couleur ??
    (teinte === "aura"
      ? "url(#symbole-aura)"
      : teinte === "reflet"
        ? AURA.reflet
        : texte);

  return (
    <Svg
      width={largeur}
      height={taille}
      viewBox={`0 0 ${BOITE_K.largeur} ${BOITE_K.hauteur}`}
      accessibilityLabel="Karria"
      accessibilityRole="image"
    >
      {teinte === "aura" ? (
        <Defs>
          <LinearGradient id="symbole-aura" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURA.bleu} />
            <Stop offset="1" stopColor={AURA.violet} />
          </LinearGradient>
        </Defs>
      ) : null}
      <G transform={`translate(${DECALAGE_K.x} ${DECALAGE_K.y})`}>
        <Path d={TRACE_K} fill={remplissage} />
      </G>
    </Svg>
  );
}
