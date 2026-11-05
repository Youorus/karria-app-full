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
 * dossier de documents de l'app (il survit aux mises à jour, pas à la
 * désinstallation), fait exactement ce qu'il faut.
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

export interface BrouillonAtelier {
  dossierId: string;
  cv: Cv;
  modeleId: string | null;
  /** Le dernier élément touché, pour le remettre en lumière. */
  dernierChemin: string | null;
  /** ISO 8601 : quand ce brouillon a été écrit. */
  ecritLe: string;
}

function dossier(): Directory {
  return new Directory(Paths.document, "atelier");
}

function fichier(dossierId: string): File {
  return new File(dossier(), `${dossierId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
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
    const d = dossier();
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

/** Vrai si le brouillon est plus récent que la dernière écriture serveur. */
export function brouillonPrime(brouillon: BrouillonAtelier, modifieLe: string): boolean {
  return Date.parse(brouillon.ecritLe) > Date.parse(modifieLe);
}
