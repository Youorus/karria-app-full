/**
 * La configuration de visibilité du fil, créée **une seule fois**.
 *
 * ═══ Le défaut que ce hook corrige ═══
 *
 * `FlatList` refuse qu'on change `viewabilityConfigCallbackPairs` après le
 * montage : son `componentDidUpdate` lève « Changing
 * viewabilityConfigCallbackPairs on the fly is not supported » dès que
 * l'identité du tableau change. Or le rappel qui note les offres vues
 * (`signalerVisibles`) change d'identité quand la session change — à la
 * connexion depuis le profil, à l'expiration d'une session — et le fil
 * est monté tout ce temps derrière les autres onglets.
 *
 * Cette erreur n'est rattrapée par personne : React démonte l'arbre entier
 * et l'écran devient **noir**, sans retour possible. Vu sur simulateur le
 * 2026-11-04 en se connectant depuis l'onglet Profil.
 *
 * Ici, la paire est fabriquée une fois pour la vie du composant et appelle,
 * par une référence, la version courante du rappel. `FlatList` voit toujours
 * le même tableau ; le fil appelle toujours le bon rappel.
 */

import { useEffect, useRef, useState } from "react";
import type { ViewabilityConfigCallbackPairs, ViewToken } from "react-native";

/** Une offre est « vue » quand 60 % de sa carte est restée 400 ms à l'écran. */
const CONFIG = { itemVisiblePercentThreshold: 60, minimumViewTime: 400 } as const;

export function useVisibiliteStable<T>(
  signaler: (visibles: ViewToken<T>[]) => void,
): ViewabilityConfigCallbackPairs {
  const courant = useRef(signaler);
  useEffect(() => {
    courant.current = signaler;
  }, [signaler]);

  // Un état initialisé une fois, jamais modifié : la même identité à chaque
  // rendu, sans lire une référence pendant le rendu.
  const [paires] = useState<ViewabilityConfigCallbackPairs>(() => [
    {
      viewabilityConfig: CONFIG,
      onViewableItemsChanged: ({ viewableItems }: { viewableItems: ViewToken<T>[] }) =>
        courant.current(viewableItems),
    },
  ]);
  return paires;
}
