/**
 * Les règles du fil avec l'équipe : fusion, curseur, jours, durées,
 * reconnexion. Pures, sans React : testées une à une.
 *
 * ═══ Pourquoi une fusion par identifiant ═══
 *
 * Un même message arrive par deux chemins : la réponse du `POST` qui l'a
 * envoyé, puis le flux en direct, qui renvoie **aussi** les messages de la
 * personne (pour ses autres appareils). Et au retour au premier plan, la
 * relecture du fil recouvre ce que le flux avait livré. L'identifiant du
 * serveur tranche : un message n'apparaît qu'une fois, à sa place dans le
 * temps.
 */

import { ErreurApi } from "@/lib/http";

import type { EnvoiLocal, MessageEquipe } from "../types/equipe.types";

export const TEXTE_MAX = 4_000;
/** Au-delà, l'API refuse le vocal (`support_voice_too_long`). */
export const VOCAL_MAX_MS = 5 * 60 * 1000;
/** Plus court, c'est un appui manqué, pas un message. */
export const VOCAL_MIN_MS = 800;

const RECONNEXION_MIN_MS = 1_000;
const RECONNEXION_MAX_MS = 30_000;

/** Fusionne sans doublon, du plus ancien au plus récent. */
export function fusionner(
  existants: readonly MessageEquipe[],
  nouveaux: readonly MessageEquipe[],
): MessageEquipe[] {
  const parId = new Map<string, MessageEquipe>();
  for (const message of existants) parId.set(message.id, message);
  // Le plus récent l'emporte : son URL signée est la plus fraîche.
  for (const message of nouveaux) parId.set(message.id, message);
  return [...parId.values()].sort((a, b) => horodatage(a) - horodatage(b));
}

function horodatage(message: MessageEquipe): number {
  const t = Date.parse(message.creeLe);
  return Number.isNaN(t) ? 0 : t;
}

/** L'instant du dernier message : le `since` du flux. */
export function dernierInstant(messages: readonly MessageEquipe[]): string | null {
  return messages.length === 0 ? null : messages[messages.length - 1].creeLe;
}

/** Attente avant la `essai`-ième reconnexion : 1, 2, 4, 8, 16, 30, 30… s. */
export function delaiReconnexion(essai: number): number {
  return Math.min(RECONNEXION_MAX_MS, RECONNEXION_MIN_MS * 2 ** Math.max(0, essai));
}

/** `7400` → `0:07`, `83000` → `1:23`. */
export function formaterDuree(ms: number | null): string {
  const secondes = Math.max(0, Math.round((ms ?? 0) / 1000));
  const minutes = Math.floor(secondes / 60);
  return `${minutes}:${String(secondes % 60).padStart(2, "0")}`;
}

/** Le texte à envoyer, nettoyé, ou `null` s'il n'y a rien à envoyer. */
export function texteAEnvoyer(brut: string): string | null {
  const propre = brut.trim();
  return propre === "" ? null : propre.slice(0, TEXTE_MAX);
}

// ─── Les lignes du fil : jours et messages ───

export type LigneFil =
  | { type: "jour"; cle: string; libelle: string }
  | { type: "message"; cle: string; message: MessageEquipe; heure: string }
  | { type: "envoi"; cle: string; envoi: EnvoiLocal };

function memeJour(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** « Aujourd'hui », « Hier », sinon « lundi 27 octobre ». */
export function libelleJour(date: Date, maintenant: Date): string {
  if (memeJour(date, maintenant)) return "Aujourd'hui";
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);
  if (memeJour(date, hier)) return "Hier";
  const libelle = date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(date.getFullYear() === maintenant.getFullYear() ? {} : { year: "numeric" }),
  });
  return libelle.charAt(0).toUpperCase() + libelle.slice(1);
}

export function heure(date: Date): string {
  return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Le fil à dessiner : un séparateur à chaque nouveau jour, chaque message
 * avec son heure, puis les envois encore en route (toujours en bas : ils
 * sont, par définition, les plus récents).
 */
export function lignesDuFil(
  messages: readonly MessageEquipe[],
  envois: readonly EnvoiLocal[],
  maintenant: Date,
): LigneFil[] {
  const lignes: LigneFil[] = [];
  let jourPrecedent: Date | null = null;
  for (const message of messages) {
    const date = new Date(message.creeLe);
    if (jourPrecedent === null || !memeJour(date, jourPrecedent)) {
      lignes.push({
        type: "jour",
        cle: `jour-${message.id}`,
        libelle: libelleJour(date, maintenant),
      });
      jourPrecedent = date;
    }
    lignes.push({ type: "message", cle: message.id, message, heure: heure(date) });
  }
  for (const envoi of envois) lignes.push({ type: "envoi", cle: envoi.cle, envoi });
  return lignes;
}

/** Ce qu'on dit quand un envoi échoue : réseau ou refus, pas la même consigne. */
export function problemeEnvoi(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau) return "Pas de réseau. Touche pour réessayer.";
    if (cause.statut === 422) return cause.message;
    if (cause.statut === 401) return "Ta session a expiré. Reconnecte-toi pour envoyer.";
  }
  return "L'envoi a échoué. Touche pour réessayer.";
}
