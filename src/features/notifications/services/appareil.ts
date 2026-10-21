/**
 * La fiche de l'appareil, telle que le serveur veut la connaître.
 *
 * ═══ D'où vient chaque valeur ═══
 *
 * - le matériel et le système : `expo-device` ;
 * - la version de l'application : `expo-constants`, comme `lib/version.ts`
 *   — jamais recopiée (interdit n°6.4) ;
 * - la langue et le fuseau horaire : `Intl`, que Hermes fournit sur les
 *   deux plateformes. `expo-localization` dirait la même chose avec une
 *   dépendance de plus ; le jour où il faut la liste des langues
 *   préférées, on l'ajoutera — et on la demandera d'abord.
 *
 * ═══ Ce qui ne vient pas d'ici ═══
 *
 * La permission et le jeton : ils se **demandent** au système, de façon
 * asynchrone, et c'est `services/notifications.ts` qui s'en charge. Cette
 * fonction les reçoit et les range ; elle reste pure, donc éprouvable.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import type { Appareil, PermissionPush, Plateforme } from "../types/appareils.types";

/** « fr-FR » → « FR », « fr » → `null`. */
export function regionDepuisLangue(langue: string | null): string | null {
  if (langue === null) return null;
  const m = /^[a-z]{2,3}(?:-[A-Za-z]{4})?[-_]([A-Za-z]{2})\b/.exec(langue);
  return m === null ? null : m[1].toUpperCase();
}

interface Localisation {
  langue: string | null;
  fuseauHoraire: string | null;
}

/** Ce que le moteur sait de la langue et du fuseau de l'appareil. */
function lireLocalisation(): Localisation {
  try {
    const options = Intl.DateTimeFormat().resolvedOptions();
    return {
      langue: options.locale || null,
      fuseauHoraire: options.timeZone || null,
    };
  } catch (cause) {
    // `Intl` incomplet sur un moteur exotique : on envoie « inconnu »
    // plutôt que de renoncer à enregistrer l'appareil.
    console.warn("[karria] localisation illisible", cause);
    return { langue: null, fuseauHoraire: null };
  }
}

/** `Platform.OS` connaît le web et le bureau, que le projet ne cible pas :
 *  tout ce qui n'est pas Android est traité comme iOS. */
function plateforme(): Plateforme {
  return Platform.OS === "android" ? "android" : "ios";
}

export function decrireAppareil(
  permission: PermissionPush,
  jetonPush: string | null,
): Appareil {
  const { langue, fuseauHoraire } = lireLocalisation();
  return {
    plateforme: plateforme(),
    jetonPush,
    permissionPush: permission,
    osNom: Device.osName ?? Platform.OS,
    osVersion: Device.osVersion ?? String(Platform.Version),
    marque: Device.brand,
    fabricant: Device.manufacturer,
    modele: Device.modelName,
    // `modelId` est typé `any` par expo-device (il n'existe que sur iOS) :
    // on le ramène à une chaîne ou rien avant qu'il ne circule.
    modeleId: typeof Device.modelId === "string" ? Device.modelId : null,
    anneeClasse: Device.deviceYearClass,
    appareilPhysique: Device.isDevice,
    versionApp: Constants.expoConfig?.version ?? "inconnue",
    // Déprécié au profit d'`expo-application`, qui n'est pas installé :
    // deux champs ne justifient pas une dépendance. À remplacer le jour où
    // le paquet entre pour une autre raison.
    buildApp: Constants.nativeBuildVersion ?? null,
    langue,
    fuseauHoraire,
    region: regionDepuisLangue(langue),
  };
}
