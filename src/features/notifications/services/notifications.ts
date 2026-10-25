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
 * ═══ Au premier plan, c'est la bannière de Karria qui s'affiche ═══
 *
 * Application ouverte, le système ne montre pas sa bannière (elle
 * couvrirait l'écran avec une mise en forme étrangère et sans retour
 * possible) : `use-centre-notifications` dessine la sienne, et la
 * notification reste rangée dans le centre de notifications. Ni son ni
 * pastille — Karria prévient, elle ne sonne pas.
 *
 * ═══ Un canal par famille ═══
 *
 * `offres`, `documents`, `compte` (`CANAUX`) : la personne peut couper
 * les alertes d'offres sans perdre « ton CV est prêt ». Sur iOS, la même
 * famille est une catégorie, avec `customDismissAction` pour que
 * l'effacement d'une notification soit signalé (mesure).
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
import type { CanalNotification } from "../types/notifications.types";

/** Le canal des notifications sans `channelId` — anciennes versions de
 *  l'API, test d'Expo. Le nom est celui de `app.json` (`defaultChannel`). */
export const CANAL_ANDROID = "defaut";

/** Les familles, telles que la personne les voit dans les réglages
 *  Android. L'importance haute des offres fait descendre la bannière : une
 *  offre fraîche part vite. */
const CANAUX: Record<
  CanalNotification,
  { nom: string; description: string; importance: Notifications.AndroidImportance }
> = {
  offres: {
    nom: "Nouvelles offres",
    description: "Les offres qui correspondent à ta recherche, dès qu'elles paraissent.",
    importance: Notifications.AndroidImportance.HIGH,
  },
  documents: {
    nom: "CV et modèles",
    description: "Ton CV ou ton export quand il est prêt, les nouveaux modèles.",
    importance: Notifications.AndroidImportance.DEFAULT,
  },
  compte: {
    nom: "Compte",
    description: "Ce qui concerne ton compte Karria.",
    importance: Notifications.AndroidImportance.DEFAULT,
  },
};

/** L'action qu'iOS rapporte quand une notification est effacée sans être
 *  ouverte (catégorie à `customDismissAction`). Constante d'Apple,
 *  `UNNotificationDismissActionIdentifier`, qu'Expo transmet telle quelle. */
const ACTION_EFFACEE = "com.apple.UNNotificationDismissActionIdentifier";

/** À appeler au chargement de la racine, avant toute notification. */
export function configurerLaReception(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Canaux Android et catégories iOS. Idempotent, donc appelé à chaque
 * démarrage : un canal ajouté par une mise à jour existe avant la première
 * notification qui le vise.
 */
export async function preparerLesFamilles(): Promise<void> {
  try {
    await preparerLeCanalAndroid();
    for (const famille of Object.keys(CANAUX) as CanalNotification[]) {
      await Notifications.setNotificationCategoryAsync(famille, [], {
        customDismissAction: true,
      });
    }
  } catch (cause) {
    console.warn("[karria] familles de notifications non préparées", cause);
  }
}

/** La pastille de l'icône s'efface quand on ouvre l'application : ce
 *  qu'elle annonçait est désormais sous les yeux. */
export async function effacerLaPastille(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (cause) {
    console.warn("[karria] pastille non effacée", cause);
  }
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
  await preparerLesFamilles();
  return versPermission(
    await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    }),
  );
}

/** Sans canal, Android 8+ n'affiche rien. Idempotent : le recréer avec
 *  les mêmes réglages ne change rien (seuls nom et description se mettent
 *  à jour ; l'importance appartient à la personne une fois créée). */
async function preparerLeCanalAndroid(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
    name: "Autres notifications",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  for (const [id, canal] of Object.entries(CANAUX)) {
    await Notifications.setNotificationChannelAsync(id, {
      name: canal.nom,
      description: canal.description,
      importance: canal.importance,
    });
  }
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

/** Une réponse du système, dans les termes de l'aiguilleur. */
export interface ReponseSysteme {
  identifiant: string;
  donnees: unknown;
  issue: "ouverte" | "ecartee";
}

function versReponse(reponse: Notifications.NotificationResponse): ReponseSysteme {
  const requete = reponse.notification.request;
  return {
    identifiant: requete.identifier,
    donnees: requete.content.data ?? {},
    issue: reponse.actionIdentifier === ACTION_EFFACEE ? "ecartee" : "ouverte",
  };
}

/** Une notification reçue **application ouverte**. */
export interface NotificationRecue {
  identifiant: string;
  titre: string | null;
  corps: string | null;
  donnees: unknown;
}

/** Prévenu à chaque notification reçue au premier plan. Rend la
 *  désinscription. */
export function surNotificationRecue(rappel: (n: NotificationRecue) => void): () => void {
  const abonnement = Notifications.addNotificationReceivedListener((notification) => {
    const { identifier, content } = notification.request;
    rappel({
      identifiant: identifier,
      titre: content.title,
      corps: content.body,
      donnees: content.data ?? {},
    });
  });
  return () => abonnement.remove();
}

/** Prévenu quand l'utilisateur touche (ou, sur iOS, efface) une
 *  notification, application ouverte ou en arrière-plan. */
export function surReponse(rappel: (reponse: ReponseSysteme) => void): () => void {
  const abonnement = Notifications.addNotificationResponseReceivedListener((reponse) =>
    rappel(versReponse(reponse)),
  );
  return () => abonnement.remove();
}

/**
 * La notification qui a **lancé** l'application, s'il y en a une.
 *
 * Effacée aussitôt lue, pour qu'un remontage ne la relise pas ; et
 * l'aiguilleur garde sa clé, au cas où l'écouteur la livrerait aussi.
 */
export async function notificationQuiALance(): Promise<ReponseSysteme | null> {
  try {
    const reponse = await Notifications.getLastNotificationResponseAsync();
    if (reponse === null) return null;
    await Notifications.clearLastNotificationResponseAsync();
    return versReponse(reponse);
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
