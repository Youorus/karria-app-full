/**
 * La version de l'application, lue à la source.
 *
 * ═══ Pourquoi `expo-constants` et non une constante écrite ici ═══
 *
 * Une version recopiée à la main diverge du `app.json` au premier
 * oubli — et le numéro affiché dans les réglages, celui qu'on demande à
 * quelqu'un qui signale un problème, désigne alors la mauvaise version.
 * C'est exactement le genre de duplication que l'interdit n°6.8 vise.
 */

import Constants from "expo-constants";

export const VERSION: string = Constants.expoConfig?.version ?? "inconnue";
