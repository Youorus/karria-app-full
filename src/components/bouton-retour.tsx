/**
 * Le bouton de retour de Zoumani.
 *
 * ═══ Pourquoi le dessiner alors que le système en fournit un ═══
 *
 * Le chevron nu d'iOS se pose à même le fond : sur le sable clair de
 * Zoumani il devient une petite flèche orange perdue en haut d'écran,
 * qu'on ne voit pas si on ne la cherche pas. Ici il a la surface commune
 * des boutons d'en-tête — il se lit comme un objet touchable, pas comme
 * une décoration.
 *
 * Le **geste** natif, lui, n'est pas touché : le glissement depuis le bord
 * gauche d'iOS et la touche retour d'Android continuent de fonctionner. On
 * ajoute une cible visible, on ne remplace pas un comportement.
 *
 * ═══ Sa forme vient de `BoutonEntete` ═══
 *
 * Il la portait lui-même, et quatre autres boutons l'avaient recopiée —
 * avec, déjà, trois couleurs de trait différentes. Ce fichier ne décrit
 * plus que ce qui lui est propre : le chevron, et où il mène.
 */

import { useRouter } from "expo-router";
import Svg, { Path } from "react-native-svg";

import { BoutonEntete } from "@/components/bouton-entete";
import { useNavigationUnique } from "@/lib/navigation";

function Chevron({ couleur }: { couleur: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5 8 12l7 7"
        stroke={couleur}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BoutonRetour() {
  const router = useRouter();
  const { remplacer } = useNavigationUnique();

  return (
    <BoutonEntete
      icone={Chevron}
      libelleAccessible="Revenir à l'écran précédent"
      onPress={() => {
        // ═══ L'historique, et rien d'autre ═══
        //
        // Ce bouton acceptait autrefois une destination écrite en dur,
        // parce que les sous-écrans étaient des onglets masqués : y aller
        // ne dépilait pas, cela basculait, et `back()` rendait la main à
        // l'onglet actif d'avant. Chaque écran devait donc décider de son
        // retour à l'écriture — le même quelle que soit la provenance.
        //
        // Ils vivent maintenant dans une pile. L'historique redevient le
        // bon juge : il remonte le chemin réellement emprunté, et il
        // préserve la position de défilement.
        //
        // Le repli reste nécessaire : lien partagé, notification,
        // redémarrage à chaud — un bouton de retour qui ne fait rien est
        // le pire des états, on appuie trois fois avant de comprendre
        // qu'il faut fermer.
        if (router.canGoBack()) {
          router.back();
        } else {
          remplacer("/offres");
        }
      }}
    />
  );
}
