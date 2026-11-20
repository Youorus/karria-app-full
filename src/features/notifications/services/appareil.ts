/**
 * La fiche de l'appareil, telle que le serveur veut la connaître.
 *
 * ═══ D'où vient chaque valeur ═══
 *
 * - le matériel et le système : `expo-device` ;
 * - la version de l'application : `expo-constants`, comme `lib/version.ts`
 *   — jamais recopiée (interdit n°6.4) ;
 * - la langue, la région et le fuseau horaire : `lib/localisation.ts`,
 *   partagé avec la connexion, qui joint région et fuseau à la requête
 *   qui crée le compte.
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

import { lireLocalisation, regionDepuisLangue } from "@/lib/localisation";
import type { Appareil, PermissionPush, Plateforme } from "../types/appareils.types";

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
