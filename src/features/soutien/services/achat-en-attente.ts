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
 * ═══ À qui appartient l'achat ═══
 *
 * Le téléphone peut changer de compte (revue de sécurité du 2026-11-05).
 * L'enregistrement porte donc l'identifiant du compte qui a ouvert le
 * paiement ; à la relecture, un autre compte le jette sans le relire. À la
 * déconnexion et à la suppression du compte, tout est purgé
 * (`purgerAchatALaDeconnexion`, appelé par `use-session.tsx`), et une
 * relecture encore en vol à ce moment-là ne produit rien. Enfin, « sans
 * pub » n'est **jamais** posé depuis l'enregistrement local : après
 * « livré », ce sont les droits relus au serveur, pour le compte courant,
 * qui font foi.
 *
 * ═══ Une seule session à la fois ═══
 *
 * On ne retient que la dernière : deux achats laissés en attente en moins
 * d'une minute n'arrivent pas, et le second remplacerait le premier qui
 * sera de toute façon visible au profil (relu au focus) et dans la galerie.
 */

import { useSyncExternalStore } from "react";
import { Platform } from "react-native";

import { lireMoi as lireMoiVraiment } from "@/features/auth/api/auth.api";
import { ErreurApi } from "@/lib/http";
import { ecrireLocal, lireLocal } from "@/lib/magasin-local";
import { poserSansPub } from "@/lib/sans-pub";

import {
  lireFacturation as lireFacturationVraiment,
  lireStatut as lireStatutVraiment,
} from "../api/soutien.api";
import type {
  Facturation,
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
  /** Le compte qui a ouvert le paiement : un autre ne le relit pas. */
  userId: string;
}

export interface Remerciement {
  type: TypeDePaiement;
  modeleId: string | null;
}

/** Ce que le service demande au dehors — remplaçable dans les tests. */
export interface Dependances {
  readonly lireStatut: (sessionId: string) => Promise<StatutPaiement>;
  readonly lireMoi: () => Promise<{ id: string }>;
  readonly lireFacturation: () => Promise<Facturation>;
  readonly maintenant: () => number;
}

const REELLES: Dependances = {
  lireStatut: lireStatutVraiment,
  lireMoi: lireMoiVraiment,
  lireFacturation: () => lireFacturationVraiment(Platform.OS),
  maintenant: Date.now,
};

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
    Number.isFinite(v.depuis) &&
    typeof v.userId === "string" &&
    v.userId !== ""
  );
}

// ─── La session retenue ────────────────────────────────────────────────

/**
 * Retient la session au nom du compte courant. Si le compte ne se lit
 * pas, rien n'est retenu : un enregistrement sans propriétaire pourrait
 * être relu par le suivant.
 */
export async function retenirAchatEnAttente(
  session: SessionPaiement,
  modeleId: string | null = null,
  dependances: Partial<Dependances> = {},
): Promise<void> {
  const { lireMoi, maintenant } = { ...REELLES, ...dependances };
  let userId: string;
  try {
    userId = (await lireMoi()).id;
  } catch (cause) {
    console.warn("[karria] achat en attente non retenu : compte illisible", cause);
    return;
  }
  const achat: AchatEnAttente = {
    sessionId: session.id,
    type: session.type,
    modeleId,
    depuis: maintenant(),
    userId,
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

// ─── La déconnexion ────────────────────────────────────────────────────

/** Change à chaque déconnexion : une relecture partie avant ne compte plus. */
let generation = 0;

/**
 * À la déconnexion et à la suppression du compte : l'achat retenu et le
 * merci sont ceux d'un compte, ils ne survivent pas pour le suivant.
 */
export async function purgerAchatALaDeconnexion(): Promise<void> {
  generation += 1;
  effacerRemerciement();
  await oublierAchatEnAttente();
}

// ─── La revérification ─────────────────────────────────────────────────

export type IssueReverification =
  | "aucun"
  | "livre"
  | "en_attente"
  | "perime"
  | "illisible"
  /** L'enregistrement est à un autre compte : jeté sans être relu. */
  | "autre_compte"
  /** La session a changé pendant la relecture : rien n'est appliqué. */
  | "abandonne";

let enCours: Promise<IssueReverification> | null = null;

/**
 * Relit la session retenue, une seule fois à la fois. « livré » oublie la
 * session, relit les droits **au serveur** (c'est lui qui dit « sans pub »
 * pour le compte courant) et pose le merci.
 */
export function reverifierAchatEnAttente(
  dependances: Partial<Dependances> = {},
): Promise<IssueReverification> {
  if (enCours !== null) return enCours;
  enCours = reverifier({ ...REELLES, ...dependances }).finally(() => {
    enCours = null;
  });
  return enCours;
}

async function reverifier(d: Dependances): Promise<IssueReverification> {
  const depart = generation;
  const achat = await lireAchatEnAttente();
  if (achat === null) return "aucun";
  if (depart !== generation) return "abandonne";
  if (d.maintenant() - achat.depuis > DUREE_MAX_MS) {
    await oublierAchatEnAttente();
    return "perime";
  }

  let moi: { id: string };
  try {
    moi = await d.lireMoi();
  } catch (cause) {
    console.warn("[karria] achat en attente : compte illisible", cause);
    return "illisible";
  }
  if (depart !== generation) return "abandonne";
  if (moi.id !== achat.userId) {
    await oublierAchatEnAttente();
    return "autre_compte";
  }

  try {
    const statut = await d.lireStatut(achat.sessionId);
    if (depart !== generation) return "abandonne";
    if (!statut.livre) return "en_attente";
  } catch (cause) {
    if (depart !== generation) return "abandonne";
    // Une session que le serveur ne connaît pas (ou plus) ne reviendra pas.
    if (cause instanceof ErreurApi && cause.statut === 404) {
      await oublierAchatEnAttente();
      return "perime";
    }
    console.warn("[karria] achat en attente non revérifié", cause);
    return "illisible";
  }

  await oublierAchatEnAttente();
  // Les droits viennent du serveur, jamais de l'enregistrement local : un
  // échec de lecture garde la dernière réponse connue.
  try {
    const facturation = await d.lireFacturation();
    if (depart !== generation) return "abandonne";
    poserSansPub(facturation.sansPub.actif);
  } catch (cause) {
    console.warn("[karria] droits illisibles après la livraison", cause);
  }
  if (depart !== generation) return "abandonne";
  poserRemerciement({ type: achat.type, modeleId: achat.modeleId });
  return "livre";
}
