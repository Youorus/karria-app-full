/**
 * L'achat « en attente » : la session Stripe qu'on n'a pas vue livrer, et
 * le merci qui s'affiche quand le serveur la confirme plus tard.
 *
 * ═══ Le trou qu'il bouche ═══
 *
 * Après la page de paiement, l'app relit `GET /payments/status/{id}` une
 * douzaine de secondes (`attente.ts`). Si Stripe ou le serveur traînent —
 * le 2026-11-05 au matin, le webhook répondait 500 — l'app dit « reviens
 * plus tard » et **oubliait la session** : personne ne revérifiait, et la
 * personne qui avait payé ne voyait jamais son merci. Ici, la session est
 * retenue (magasin local, elle survit à un redémarrage) et revérifiée au
 * retour au premier plan et au prochain lancement
 * (`hooks/use-droits-connectes.ts`), jusqu'à ce que le serveur dise
 * « livré », ou que la session ait expiré (Stripe ferme les siennes au
 * bout de 24 h).
 *
 * ═══ Le merci ═══
 *
 * Quand la livraison arrive ainsi, hors de l'écran d'achat, un petit
 * store en mémoire (`useRemerciement`) porte ce qu'il y a à dire : la
 * bande (`components/bande-remerciement.tsx`) le montre où qu'on soit, et
 * l'écran concerné — le détail du modèle, la feuille de l'atelier, la carte
 * de soutien — passe à son état « livré » s'il est ouvert. Le push
 * `type: purchase` du serveur, lui, ouvre l'écran utile ; les deux se
 * complètent sans se répéter : la bande ne se montre qu'une fois.
 *
 * ═══ Une seule session à la fois ═══
 *
 * On ne retient que la dernière : deux achats laissés en attente en moins
 * d'une minute n'arrivent pas, et le second remplacerait le premier qui
 * sera de toute façon visible au profil (relu au focus) et dans la galerie.
 */

import { useSyncExternalStore } from "react";

import { ErreurApi } from "@/lib/http";
import { ecrireLocal, lireLocal } from "@/lib/magasin-local";
import { poserSansPub } from "@/lib/sans-pub";

import { lireStatut } from "../api/soutien.api";
import type {
  SessionPaiement,
  StatutPaiement,
  TypeDePaiement,
} from "../types/soutien.types";

const CLE = "karria.achat-en-attente";

/** Au-delà, la session Stripe a expiré : on ne la relit plus. */
export const DUREE_MAX_MS = 24 * 60 * 60 * 1000;

export interface AchatEnAttente {
  sessionId: string;
  type: TypeDePaiement;
  /** Le modèle acheté, pour l'ouvrir ; `null` pour un café ou le sans pub. */
  modeleId: string | null;
  /** Quand l'attente a commencé (ms). */
  depuis: number;
}

export interface Remerciement {
  type: TypeDePaiement;
  modeleId: string | null;
}

const TYPES: readonly string[] = ["ad_free", "coffee", "template"];

function estAchatEnAttente(valeur: unknown): valeur is AchatEnAttente {
  if (typeof valeur !== "object" || valeur === null) return false;
  const v = valeur as Record<string, unknown>;
  return (
    typeof v.sessionId === "string" &&
    v.sessionId !== "" &&
    typeof v.type === "string" &&
    TYPES.includes(v.type) &&
    (v.modeleId === null || typeof v.modeleId === "string") &&
    typeof v.depuis === "number" &&
    Number.isFinite(v.depuis)
  );
}

// ─── La session retenue ────────────────────────────────────────────────

export async function retenirAchatEnAttente(
  session: SessionPaiement,
  modeleId: string | null = null,
  maintenant: number = Date.now(),
): Promise<void> {
  const achat: AchatEnAttente = {
    sessionId: session.id,
    type: session.type,
    modeleId,
    depuis: maintenant,
  };
  await ecrireLocal(CLE, achat);
}

export async function oublierAchatEnAttente(): Promise<void> {
  await ecrireLocal(CLE, null);
}

export async function lireAchatEnAttente(): Promise<AchatEnAttente | null> {
  return lireLocal<AchatEnAttente | null>(
    CLE,
    null,
    (valeur): valeur is AchatEnAttente | null =>
      valeur === null || estAchatEnAttente(valeur),
  );
}

// ─── Le merci à montrer ────────────────────────────────────────────────

let remerciement: Remerciement | null = null;
const abonnes = new Set<() => void>();

function publier(): void {
  abonnes.forEach((r) => r());
}

export function poserRemerciement(valeur: Remerciement | null): void {
  remerciement = valeur;
  publier();
}

export function effacerRemerciement(): void {
  poserRemerciement(null);
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

const lire = () => remerciement;

/** Le merci en attente d'affichage, ou `null`. */
export function useRemerciement(): Remerciement | null {
  return useSyncExternalStore(abonner, lire, lire);
}

/**
 * Prévient à chaque merci posé (jamais à l'effacement). Pour un écran qui
 * veut changer **son** état quand l'achat qu'il a laissé en attente arrive
 * : s'abonner à un système extérieur et poser l'état dans le rappel, c'est
 * ce que React attend d'un effet.
 */
export function abonnerRemerciement(rappel: (valeur: Remerciement) => void): () => void {
  return abonner(() => {
    if (remerciement !== null) rappel(remerciement);
  });
}

// ─── La revérification ─────────────────────────────────────────────────

export type IssueReverification =
  "aucun" | "livre" | "en_attente" | "perime" | "illisible";

let enCours: Promise<IssueReverification> | null = null;

/**
 * Relit la session retenue, une seule fois à la fois. « livré » oublie la
 * session, pose le merci et, pour le sans pub, coupe la publicité sans
 * attendre la relecture des droits.
 */
export function reverifierAchatEnAttente(
  options: {
    readonly lireStatut?: (sessionId: string) => Promise<StatutPaiement>;
    readonly maintenant?: () => number;
  } = {},
): Promise<IssueReverification> {
  if (enCours !== null) return enCours;
  enCours = reverifier(options).finally(() => {
    enCours = null;
  });
  return enCours;
}

async function reverifier(options: {
  readonly lireStatut?: (sessionId: string) => Promise<StatutPaiement>;
  readonly maintenant?: () => number;
}): Promise<IssueReverification> {
  const achat = await lireAchatEnAttente();
  if (achat === null) return "aucun";
  const maintenant = options.maintenant ?? Date.now;
  if (maintenant() - achat.depuis > DUREE_MAX_MS) {
    await oublierAchatEnAttente();
    return "perime";
  }
  const relire = options.lireStatut ?? lireStatut;
  try {
    const statut = await relire(achat.sessionId);
    if (!statut.livre) return "en_attente";
  } catch (cause) {
    // Une session que le serveur ne connaît pas (ou plus) ne reviendra pas.
    if (cause instanceof ErreurApi && cause.statut === 404) {
      await oublierAchatEnAttente();
      return "perime";
    }
    console.warn("[karria] achat en attente non revérifié", cause);
    return "illisible";
  }
  await oublierAchatEnAttente();
  if (achat.type === "ad_free") poserSansPub(true);
  poserRemerciement({ type: achat.type, modeleId: achat.modeleId });
  return "livre";
}
