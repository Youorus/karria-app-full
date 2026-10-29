/**
 * Le palier visuel de cet appareil, lu une fois pour toute la session, et
 * le témoin « cet effet doit-il bouger maintenant ? ».
 *
 * ═══ Une lecture, pas un état ═══
 *
 * `expo-device` et `PixelRatio` sont des constantes de l'appareil : on les
 * lit au premier appel et on garde la décision au niveau du module. Aucun
 * rendu ne change de palier en cours de route, et un effet monté dix fois
 * (l'orbe du fil, celle de l'agent, celle du CV) ne recalcule rien.
 *
 * ═══ Bouger seulement quand ça se voit ═══
 *
 * Une animation permanente a trois raisons de s'arrêter : le réglage
 * « réduire les animations » du système ; l'application passée en
 * arrière-plan (sur Android, Reanimated continue sinon de calculer sur le
 * fil d'interface) ; et, pour les cinq onglets qui portent chacun leur
 * aura, l'onglet qui n'est pas celui qu'on regarde — tous restent montés,
 * et quatre fonds animés hors écran coûtent autant que celui qu'on voit.
 */

import * as Device from "expo-device";
import { useIsFocused } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, PixelRatio, Platform } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { palierVisuel, type PalierVisuel } from "./qualite-visuelle";

let palierConnu: PalierVisuel | null = null;

/** Le palier de l'appareil, décidé une fois. */
export function lirePalierVisuel(): PalierVisuel {
  palierConnu ??= palierVisuel({
    plateforme: Platform.OS,
    anneeAppareil: Device.deviceYearClass,
    memoireOctets: Device.totalMemory,
    densite: PixelRatio.get(),
  });
  return palierConnu;
}

export function useQualiteVisuelle(): PalierVisuel {
  return lirePalierVisuel();
}

/**
 * Vrai quand un effet continu a le droit de tourner : écran au premier
 * plan, application active, et aucun réglage de mouvement réduit.
 * À appeler depuis un écran (il lit la navigation).
 */
export function useAnimationActive(): boolean {
  const reduit = useReducedMotion();
  const auPremierPlan = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const abonnement = AppState.addEventListener("change", (etat) =>
      setAppActive(etat === "active"),
    );
    return () => abonnement.remove();
  }, []);
  return !reduit && auPremierPlan && appActive;
}
