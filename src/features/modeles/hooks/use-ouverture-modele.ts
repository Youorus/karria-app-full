/**
 * L'ouverture d'un modèle : la vignette touchée **devient** l'aperçu du
 * détail, comme dans la V1 où l'on ne quittait pas le modèle des yeux.
 *
 * ═══ Deux mécaniques, une seule impression ═══
 *
 * - iOS 18+ : le zoom natif (`Link.AppleZoom` sur la carte,
 *   `Link.AppleZoomTarget` sur le carrousel). Le système déplie la
 *   vignette et la replie au retour, geste de retour compris. Rien ici.
 * - Android : pas d'équivalent natif. La carte mesure sa vignette au
 *   toucher (`useDepartDeCarte`), le carrousel du détail se pose sur ce
 *   cadre puis grandit jusqu'à sa place (`useArriveeDuZoom`), avec
 *   Reanimated, sur le fil de l'interface.
 *
 * ═══ Mouvement réduit ═══
 *
 * Aucun zoom : sur iOS la carte ne s'enveloppe pas d'`AppleZoom`, sur
 * Android le carrousel est simplement là. Le détail garde son fondu.
 */

import { useCallback, useRef, useState } from "react";
import { Platform, type View } from "react-native";
import {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  prendreOrigine,
  retenirOrigine,
  transformationDepuis,
} from "../services/origine-ouverture";

const ZOOM_MANUEL = Platform.OS === "android";

/** Une décélération franche, proche de celle du zoom natif d'iOS. */
const COURBE = Easing.bezier(0.2, 0.9, 0.1, 1);
const DUREE_MS = 420;
/** Le rayon de la vignette (`rounded-tuile`), qui s'efface en grandissant. */
const RAYON_DEPART = 18;

/** Côté carte : la vignette à mesurer, et le geste qui la mesure. */
export function useDepartDeCarte(id: string) {
  const ref = useRef<View>(null);
  const retenir = useCallback(() => {
    if (!ZOOM_MANUEL) return;
    ref.current?.measureInWindow((x, y, largeur, hauteur) =>
      retenirOrigine(id, { x, y, largeur, hauteur }),
    );
  }, [id]);
  return { ref, retenir };
}

/** Côté détail : le carrousel, posé sur la vignette puis rendu à sa place. */
export function useArriveeDuZoom(id: string) {
  const reduit = useReducedMotion();
  const ref = useRef<View>(null);
  // Lu une seule fois, au montage : le relais se consomme.
  const [origine] = useState(() => (ZOOM_MANUEL && !reduit ? prendreOrigine(id) : null));
  const progres = useSharedValue(origine === null ? 1 : 0);
  const visible = useSharedValue(origine === null);
  const depart = useSharedValue({ dx: 0, dy: 0, echelle: 1 });

  const onLayout = useCallback(() => {
    if (origine === null) return;
    ref.current?.measureInWindow((x, y, largeur, hauteur) => {
      depart.set(transformationDepuis(origine, { x, y, largeur, hauteur }));
      visible.set(true);
      progres.set(withTiming(1, { duration: DUREE_MS, easing: COURBE }));
    });
  }, [origine, depart, visible, progres]);

  const style = useAnimatedStyle(() => {
    const p = progres.get();
    const d = depart.get();
    return {
      // Invisible le temps de la mesure : sinon une image pleine taille
      // clignoterait avant de sauter sur la vignette.
      opacity: visible.get() ? 1 : 0,
      borderRadius: RAYON_DEPART * (1 - p),
      overflow: "hidden",
      transform: [
        { translateX: d.dx * (1 - p) },
        { translateY: d.dy * (1 - p) },
        { scale: d.echelle + (1 - d.echelle) * p },
      ],
    };
  });

  return { ref, onLayout, style };
}
