/**
 * La mesure des notifications : un port, et rien de plus pour l'instant.
 *
 * ═══ Pourquoi un port sans fournisseur ═══
 *
 * Aucune bibliothèque de mesure n'est installée (et n'en ajouter une
 * demande l'accord de Marc). Les trois événements sont pourtant posés aux
 * bons endroits dès aujourd'hui : le jour où un fournisseur arrive, on
 * écrit son adaptateur et on appelle `brancherAnalytique` au démarrage —
 * aucun hook ni écran ne change. D'ici là, le journal de développement
 * suffit pour vérifier qu'ils partent.
 *
 * ═══ Ce qui est mesurable, et ce qui ne l'est pas ═══
 *
 * - `notification_received` : seulement **application ouverte**. Une
 *   notification reçue en arrière-plan ne réveille pas le JavaScript.
 * - `notification_opened` : toujours — premier plan, arrière-plan,
 *   lancement à froid, et la bannière interne.
 * - `notification_dismissed` : la bannière interne écartée, et sur iOS une
 *   notification effacée explicitement du centre (catégories à
 *   `customDismissAction`). Android ne le signale pas à `expo-notifications`.
 */

import type { TypeNotification } from "../types/notifications.types";

export type SourceNotification = "systeme" | "lancement" | "banniere";

export interface EvenementNotification {
  /** `null` quand la charge ne suivait pas le contrat. */
  type: TypeNotification | null;
  campagne: string | null;
  source: SourceNotification;
}

export interface PortAnalytiqueNotifications {
  recue(evenement: EvenementNotification): void;
  ouverte(evenement: EvenementNotification): void;
  ecartee(evenement: EvenementNotification): void;
}

/** Le journal de développement : les événements, nommés comme demain. */
const journal: PortAnalytiqueNotifications = {
  recue: (e) => trace("notification_received", e),
  ouverte: (e) => trace("notification_opened", e),
  ecartee: (e) => trace("notification_dismissed", e),
};

function trace(nom: string, evenement: EvenementNotification): void {
  if (__DEV__) console.info(`[karria] ${nom}`, evenement);
}

let actif: PortAnalytiqueNotifications = journal;

export function brancherAnalytique(port: PortAnalytiqueNotifications): void {
  actif = port;
}

export function analytiqueNotifications(): PortAnalytiqueNotifications {
  return actif;
}
