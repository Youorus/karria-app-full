/**
 * Le brouillon local de l'atelier : ce qu'on retrouve en rouvrant un dossier.
 *
 * ═══ Pourquoi un fichier, pas le trousseau ═══
 *
 * Le serveur reçoit chaque modification 1,5 s après le geste : le brouillon
 * ne couvre que cette fenêtre, une coupure réseau, et la **reprise** — le
 * modèle choisi, le dernier élément touché. Mais un CV pèse quelques
 * dizaines de kilo-octets, et le trousseau d'iOS tolère mal au-delà de
 * 2 Ko (`lib/magasin-local.ts`). Un fichier JSON par dossier, dans le
 * **cache** de l'app : le système peut le reprendre s'il manque de place
 * (le serveur a la vérité, rien n'est perdu), et il n'est pas sauvegardé
 * dans iCloud — un CV est une donnée personnelle, il ne voyage pas sans
 * qu'on le lui demande.
 *
 * ═══ Effacé avec la session ═══
 *
 * Un brouillon est celui d'un compte. À la déconnexion comme à la
 * suppression du compte, `oublierTousLesBrouillonsAtelier` retire tout le
 * répertoire (`use-session.tsx`), au même endroit où les brouillons des
 * formulaires du CV s'oublient : le compte suivant sur ce téléphone ne
 * trouve rien.
 *
 * ═══ Les exports téléchargés passent par ici aussi ═══
 *
 * Un PDF ou un Word téléchargé pour la feuille de partage est posé dans
 * `atelier/exports/` (`fichierDExport`) — donc effacé par la même purge —
 * et Finaliser le supprime dès que la feuille de partage rend la main : un
 * document personnel ne traîne pas dans le cache.
 *
 * ═══ Jamais d'exception ═══
 *
 * Un brouillon illisible vaut l'absence de brouillon : on repart du
 * serveur, la cause est journalisée.
 *
 * ═══ Le disque ne gagne pas toujours ═══
 *
 * Un brouillon n'est repris que s'il est **plus récent** que la dernière
 * écriture serveur du dossier (`modifieLe`) : sinon, c'est que le serveur
 * a reçu quelque chose depuis (une proposition acceptée sur un autre
 * appareil, par exemple), et c'est lui qui a raison.
 */

import { Directory, File, Paths } from "expo-file-system";

import type { Cv } from "@/features/cv/types/cv.types";

/**
 * La clé du brouillon de l'atelier **libre** (« Nouveau CV », sans dossier).
 * Un seul CV libre à la fois : on reprend là où l'on en était, ou l'on
 * repart du CV de base. Ce n'est pas un identifiant serveur — aucun dossier
 * ne porte ce nom, le faux serveur comme le vrai refusent un UUID pareil.
 */
export const CLE_BROUILLON_LIBRE = "libre";

export interface BrouillonAtelier {
  dossierId: string;
  cv: Cv;
  modeleId: string | null;
  /** Le dernier élément touché, pour le remettre en lumière. */
  dernierChemin: string | null;
  /** ISO 8601 : quand ce brouillon a été écrit. */
  ecritLe: string;
}

function repertoire(): Directory {
  return new Directory(Paths.cache, "atelier");
}

function fichier(dossierId: string): File {
  return new File(repertoire(), `${dossierId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
}

function estUnBrouillon(v: unknown): v is BrouillonAtelier {
  if (typeof v !== "object" || v === null) return false;
  const b = v as Partial<BrouillonAtelier>;
  return (
    typeof b.dossierId === "string" &&
    typeof b.cv === "object" &&
    b.cv !== null &&
    typeof b.ecritLe === "string"
  );
}

export function lireBrouillonAtelier(dossierId: string): BrouillonAtelier | null {
  try {
    const f = fichier(dossierId);
    if (!f.exists) return null;
    const lu: unknown = JSON.parse(f.textSync());
    return estUnBrouillon(lu) && lu.dossierId === dossierId ? lu : null;
  } catch (cause) {
    console.warn("[karria] brouillon d'atelier illisible", cause);
    return null;
  }
}

export function ecrireBrouillonAtelier(brouillon: BrouillonAtelier): void {
  try {
    const d = repertoire();
    if (!d.exists) d.create({ intermediates: true, idempotent: true });
    fichier(brouillon.dossierId).write(JSON.stringify(brouillon));
  } catch (cause) {
    console.warn("[karria] brouillon d'atelier non écrit", cause);
  }
}

export function oublierBrouillonAtelier(dossierId: string): void {
  try {
    const f = fichier(dossierId);
    if (f.exists) f.delete();
  } catch (cause) {
    console.warn("[karria] brouillon d'atelier non effacé", cause);
  }
}

/** Où poser un export téléchargé pour le partager : sous le répertoire de
 *  l'atelier, créé au besoin, et donc effacé avec lui. */
export function fichierDExport(nom: string): File {
  const d = new Directory(repertoire(), "exports");
  if (!d.exists) d.create({ intermediates: true, idempotent: true });
  const f = new File(d, nom);
  if (f.exists) f.delete();
  return f;
}

/** Supprime un fichier d'export, sans lever : il est de toute façon dans le cache. */
export function supprimerExport(f: File): void {
  try {
    if (f.exists) f.delete();
  } catch (cause) {
    console.warn("[karria] export téléchargé non supprimé", cause);
  }
}

/** À la déconnexion et à la suppression du compte : tout le répertoire,
 *  brouillons et exports téléchargés compris. */
export function oublierTousLesBrouillonsAtelier(): void {
  try {
    const d = repertoire();
    if (d.exists) d.delete();
  } catch (cause) {
    console.warn("[karria] brouillons d'atelier non effacés", cause);
  }
}

/** Vrai si le brouillon est plus récent que la dernière écriture serveur. */
export function brouillonPrime(brouillon: BrouillonAtelier, modifieLe: string): boolean {
  return Date.parse(brouillon.ecritLe) > Date.parse(modifieLe);
}
