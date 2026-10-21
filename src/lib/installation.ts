/**
 * Ce que cette installation sait d'elle-même, et le seul endroit qui y touche.
 *
 * ═══ Deux faits, un fichier ═══
 *
 * - **L'identifiant d'installation** : un UUID tiré une fois, à la première
 *   ouverture, et gardé jusqu'à la désinstallation. C'est lui qui nomme
 *   l'appareil auprès du serveur (`PUT /devices/{installation_id}`). Il
 *   survit à la déconnexion : on désinscrit l'appareil, on ne l'oublie pas
 *   — le prochain compte qui se connecte sur ce téléphone réutilise le
 *   même nom, et le serveur n'accumule pas de fantômes.
 *
 * - **La réponse à la question des notifications** : l'écran qui propose
 *   d'activer les notifications ne se montre qu'une fois par installation.
 *   « Plus tard » est une réponse aussi : revenir dessus à chaque ouverture
 *   serait du harcèlement, et c'est précisément ce qui fait couper les
 *   notifications pour de bon. Seul un **compte nouvellement créé** remet
 *   la question — c'est une autre personne, ou la même qui recommence.
 *
 * ═══ Pourquoi le magasin sécurisé ═══
 *
 * Le même que les jetons de session (`lib/session.ts`) : il est déjà là,
 * il survit aux mises à jour, et il évite d'ajouter une dépendance de
 * stockage pour deux clés. Ce ne sont pas des secrets ; c'est seulement le
 * stockage persistant dont l'application dispose.
 *
 * ═══ Pourquoi un repli en mémoire ═══
 *
 * Le magasin peut être indisponible — appareil verrouillé au tout premier
 * démarrage après redémarrage. Un identifiant éphémère vaut mieux qu'un
 * plantage : l'enregistrement de l'appareil échouera ou créera un doublon,
 * ce que le serveur sait nettoyer, et l'utilisateur ne verra rien.
 */

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const CLE_INSTALLATION = "karria.installation";
const CLE_NOTIFICATIONS = "karria.notifications.reponse";

/** Mis en cache : l'identifiant est relu à chaque synchronisation de
 *  l'appareil, et le trousseau n'a pas à être interrogé pour une valeur
 *  qui ne change jamais. */
let installationEnMemoire: string | null = null;

export async function lireInstallationId(): Promise<string> {
  if (installationEnMemoire !== null) return installationEnMemoire;
  try {
    const existant = await SecureStore.getItemAsync(CLE_INSTALLATION);
    if (existant !== null && existant !== "") {
      installationEnMemoire = existant;
      return existant;
    }
    const neuf = Crypto.randomUUID();
    await SecureStore.setItemAsync(CLE_INSTALLATION, neuf);
    installationEnMemoire = neuf;
    return neuf;
  } catch (cause) {
    console.warn(
      "[karria] magasin indisponible, identifiant d'installation éphémère",
      cause,
    );
    installationEnMemoire ??= Crypto.randomUUID();
    return installationEnMemoire;
  }
}

/** Ce que la personne a répondu à l'écran des notifications. */
export type ReponseNotifications = "acceptee" | "refusee" | "plus_tard";

const REPONSES: readonly ReponseNotifications[] = ["acceptee", "refusee", "plus_tard"];

export async function lireReponseNotifications(): Promise<ReponseNotifications | null> {
  try {
    const valeur = await SecureStore.getItemAsync(CLE_NOTIFICATIONS);
    return REPONSES.find((r) => r === valeur) ?? null;
  } catch (cause) {
    // Comme si on n'avait jamais demandé : au pire, la question est posée
    // une fois de plus, ce qui vaut mieux qu'un écran qui plante.
    console.warn("[karria] réponse aux notifications illisible", cause);
    return null;
  }
}

export async function retenirReponseNotifications(
  reponse: ReponseNotifications,
): Promise<void> {
  await SecureStore.setItemAsync(CLE_NOTIFICATIONS, reponse);
}

/** Un compte vient d'être créé : la question se repose. */
export async function oublierReponseNotifications(): Promise<void> {
  await SecureStore.deleteItemAsync(CLE_NOTIFICATIONS);
}

/** Pour les tests seulement : vide le cache de l'identifiant. */
export function reinitialiserInstallationPourLesTests(): void {
  installationEnMemoire = null;
}
