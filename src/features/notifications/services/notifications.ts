/**
 * Ce que l'application demande au système à propos des notifications.
 *
 * ═══ Le seul fichier qui parle à `expo-notifications` ═══
 *
 * Permission, jeton, canal Android, réception : tout passe ici. Les hooks
 * ne voient que des verbes en français et des valeurs du contrat
 * (`granted` / `denied` / `undetermined`). Le jour où Expo change une
 * signature — et il le fait —, c'est un fichier à relire, pas six.
 *
 * ═══ Le jeton peut manquer, et ce n'est pas une panne ═══
 *
 * Trois cas, tous normaux en développement :
 *
 * - **le simulateur iOS** ne reçoit pas de jeton APNs : Expo lève. On le
 *   sait d'avance (`Device.isDevice`) et on n'essaie même pas ;
 * - **pas d'identifiant de projet EAS** : le jeton Expo est signé pour un
 *   projet, et sans lui l'appel échoue. Tant que `eas init` n'a pas été
 *   lancé, on enregistre l'appareil sans jeton — la fiche reste utile ;
 * - **une erreur réseau** vers les serveurs d'Expo.
 *
 * Dans les trois cas : `null`, une ligne de journal, et l'application
 * continue. L'utilisateur n'a rien à faire d'un jeton.
 *
 * ═══ Au premier plan, la bannière s'affiche quand même ═══
 *
 * Par défaut, iOS n'affiche rien si l'application est ouverte. Or une
 * offre qui tombe pendant qu'on relit son CV mérite d'être vue : on
 * demande la bannière, sans son ni badge — Karria prévient, elle ne
 * sonne pas.
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  lireReponseNotifications,
  retenirReponseNotifications,
} from "@/lib/installation";

import type { PermissionPush } from "../types/appareils.types";

/** Le canal Android de tout ce que Karria envoie. Un seul : les offres
 *  du jour et le CV prêt méritent la même attention, ni plus ni moins. Le
 *  nom est celui de `app.json` (`defaultChannel`). */
export const CANAL_ANDROID = "defaut";

/** À appeler au chargement de la racine, avant toute notification. */
export function configurerLaReception(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function versPermission(
  statut: Notifications.NotificationPermissionsStatus,
): PermissionPush {
  if (
    statut.granted ||
    statut.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return "granted";
  }
  return statut.status === Notifications.PermissionStatus.UNDETERMINED
    ? "undetermined"
    : "denied";
}

export async function lirePermission(): Promise<PermissionPush> {
  try {
    return versPermission(await Notifications.getPermissionsAsync());
  } catch (cause) {
    console.warn("[karria] permission de notification illisible", cause);
    return "undetermined";
  }
}

/** Pose la question au système. Sur Android 13+, c'est la boîte
 *  `POST_NOTIFICATIONS` ; avant, le système accorde d'office. */
export async function demanderPermission(): Promise<PermissionPush> {
  await preparerLeCanalAndroid();
  return versPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    }),
  );
}

/** Sans canal, Android 8+ n'affiche rien. Idempotent : le recréer avec
 *  les mêmes réglages ne change rien. */
async function preparerLeCanalAndroid(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: "Offres et CV",
    description: "Les offres qui te correspondent et ton CV quand il est prêt.",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** L'identifiant du projet EAS, s'il existe : `eas init` l'écrit dans
 *  `extra.eas.projectId`, et EAS Build le fournit aussi à l'exécution. */
function projetEas(): string | null {
  const extra = Constants.expoConfig?.extra as
    { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export async function obtenirLeJetonPush(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("[karria] simulateur : pas de jeton de notification");
    return null;
  }
  const projectId = projetEas();
  if (projectId === null) {
    console.warn("[karria] aucun projet EAS : pas de jeton de notification");
    return null;
  }
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch (cause) {
    console.warn("[karria] jeton de notification indisponible", cause);
    return null;
  }
}

/** Prévenu quand le système renouvelle le jeton. Rend la désinscription. */
export function surChangementDeJeton(rappel: () => void): () => void {
  const abonnement = Notifications.addPushTokenListener(() => rappel());
  return () => abonnement.remove();
}

/** Les données d'une notification touchée — `data.url`, entre autres. */
export type DonneesNotification = Record<string, unknown>;

function donneesDe(reponse: Notifications.NotificationResponse): DonneesNotification {
  return reponse.notification.request.content.data ?? {};
}

/** Prévenu quand l'utilisateur touche une notification, application
 *  ouverte ou en arrière-plan. Rend la désinscription. */
export function surNotificationTouchee(
  rappel: (donnees: DonneesNotification) => void,
): () => void {
  const abonnement = Notifications.addNotificationResponseReceivedListener((reponse) =>
    rappel(donneesDe(reponse)),
  );
  return () => abonnement.remove();
}

/**
 * La notification qui a **lancé** l'application, s'il y en a une.
 *
 * Elle est effacée aussitôt lue : sans cela, chaque remontage du garde la
 * relirait, et l'écran de l'offre se rouvrirait tout seul.
 */
export async function notificationQuiALance(): Promise<DonneesNotification | null> {
  try {
    const reponse = await Notifications.getLastNotificationResponseAsync();
    if (reponse === null) return null;
    await Notifications.clearLastNotificationResponseAsync();
    return donneesDe(reponse);
  } catch (cause) {
    console.warn("[karria] notification de lancement illisible", cause);
    return null;
  }
}

/**
 * Faut-il montrer l'écran qui propose d'activer les notifications ?
 *
 * Oui si personne n'a répondu sur cette installation **et** que le système
 * n'a pas encore tranché. Si le système a déjà une réponse — version
 * antérieure de l'application, réglages changés à la main —, on la
 * retient comme la nôtre et on ne pose pas une question déjà réglée.
 */
export async function fautIlProposerLesNotifications(): Promise<boolean> {
  if ((await lireReponseNotifications()) !== null) return false;
  const permission = await lirePermission();
  if (permission === "undetermined") return true;
  await retenirReponseNotifications(permission === "granted" ? "acceptee" : "refusee");
  return false;
}
