/**
 * Les bords à protéger dans une feuille native (`Modal` en `pageSheet`).
 *
 * ═══ Pourquoi la plateforme décide ═══
 *
 * Sur iOS, `pageSheet` est une carte qui s'arrête sous la barre d'état : le
 * haut est déjà dégagé, seul le bas (la barre d'accueil) demande une
 * marge. Sur Android, `pageSheet` n'existe pas : la feuille prend tout
 * l'écran, bord à bord (SDK 57 / Android 16), et son en-tête — « Annuler »,
 * « Enregistrer » — passait **sous l'heure et les icônes de la barre
 * d'état** (vu sur l'émulateur le 2026-11-05). Là, le haut compte aussi.
 *
 * Une constante partagée plutôt qu'un `Platform.OS` dans chaque feuille :
 * cinq feuilles l'oubliaient de la même façon, la sixième l'oublierait.
 */

import { Platform } from "react-native";
import type { Edge } from "react-native-safe-area-context";

export const BORDS_FEUILLE_NATIVE: readonly Edge[] =
  Platform.OS === "android" ? ["top", "bottom"] : ["bottom"];
