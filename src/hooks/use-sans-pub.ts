/**
 * Lire le drapeau « sans pub » depuis un composant, et se redessiner quand
 * il change.
 *
 * `useSyncExternalStore` et non un `useState` + effet : le store vit hors
 * de React, et c'est la façon prévue de s'y abonner sans rendu en retard.
 */

import { useSyncExternalStore } from "react";

import { abonnerSansPub, estSansPub } from "@/lib/sans-pub";

export function useSansPub(): boolean {
  return useSyncExternalStore(abonnerSansPub, estSansPub);
}
