/**
 * L'état vivant de la connexion : ce que le bandeau affiche, et le signal
 * « la connexion est revenue ».
 *
 * ═══ Qui écrit, qui lit ═══
 *
 * Écrivent : le client HTTP (`noterSuccesReseau`, `noterEchecReseau`) et
 * l'écoute de l'appareil (`noterAppareil`). Lisent : le bandeau
 * (`useAffichageConnexion`), les listes qui se relancent
 * (`useVersionRetour`, par `hooks/use-relance-au-retour.ts`), et le client
 * HTTP lui-même avant une action (`estSansReseau`). Les règles sont dans
 * `connexion.ts` ; ici il n'y a que la mémoire, deux minuteries et les
 * abonnés.
 *
 * ═══ Pourquoi un module et non un contexte React ═══
 *
 * Le client HTTP n'est pas un composant : il doit pouvoir écrire et lire
 * sans arbre. C'est la mécanique de `recherche-changee.ts` — un état de
 * module, lu par `useSyncExternalStore`.
 *
 * ═══ « Connexion rétablie », seulement quand on l'a constaté ═══
 *
 * Elle s'affiche `DUREE_RETABLIE_MS` quand l'appareil retrouve le réseau ou
 * qu'une requête aboutit après une période instable. Un état instable
 * simplement **oublié** (plus aucun échec depuis longtemps) s'efface sans
 * rien annoncer, et ne relance rien.
 *
 * ═══ Le signal de retour, sans tempête ═══
 *
 * Un compteur, incrémenté au plus une fois toutes les `ECART_RELANCES_MS` :
 * un réseau qui va et vient ne fait pas repartir les listes à chaque
 * battement. Et n'y réagissent que les écrans restés en erreur.
 */

import { useSyncExternalStore } from "react";

import {
  actionImpossible,
  apresAppareil,
  apresEchec,
  apresOubli,
  apresSucces,
  DUREE_RETABLIE_MS,
  estUnRetour,
  etatDe,
  MEMOIRE_INITIALE,
  OUBLI_INSTABLE_MS,
  relancePermise,
  type Appareil,
  type MemoireConnexion,
} from "./connexion";

/** Ce que le bandeau montre. */
export type AffichageConnexion = "aucun" | "hors-ligne" | "instable" | "retablie";

let memoire: MemoireConnexion = MEMOIRE_INITIALE;
let affichage: AffichageConnexion = "aucun";
/** La personne a fermé le bandeau : il se tait jusqu'au prochain changement. */
let masque = false;
let versionRetour = 0;
let derniereRelance: number | null = null;
let minuterieRetablie: ReturnType<typeof setTimeout> | null = null;
let minuterieOubli: ReturnType<typeof setTimeout> | null = null;
/** Relit l'appareil ; posé par `ecoute-reseau.ts`. */
let relireAppareil: (() => void) | null = null;
const abonnes = new Set<() => void>();

function publier(): void {
  abonnes.forEach((rappel) => rappel());
}

function arreter(minuterie: ReturnType<typeof setTimeout> | null): null {
  if (minuterie !== null) clearTimeout(minuterie);
  return null;
}

function appliquer(suivante: MemoireConnexion, parOubli = false): void {
  const avant = etatDe(memoire);
  memoire = suivante;
  const apres = etatDe(memoire);
  if (apres !== "instable") minuterieOubli = arreter(minuterieOubli);
  if (apres === avant) return;

  masque = false;
  minuterieRetablie = arreter(minuterieRetablie);
  if (!estUnRetour(avant, apres)) {
    affichage = apres === "bonne" ? "aucun" : apres;
  } else if (parOubli) {
    affichage = "aucun";
  } else {
    affichage = "retablie";
    minuterieRetablie = setTimeout(() => {
      minuterieRetablie = null;
      affichage = "aucun";
      publier();
    }, DUREE_RETABLIE_MS);
    const maintenant = Date.now();
    if (relancePermise(derniereRelance, maintenant)) {
      derniereRelance = maintenant;
      versionRetour += 1;
    }
  }
  publier();
}

/** Une requête a reçu une réponse du serveur, quelle qu'elle soit. */
export function noterSuccesReseau(): void {
  // L'appareil se disait sans aucun réseau : sa parole date, on la relit.
  if (actionImpossible(memoire)) relireAppareil?.();
  appliquer(apresSucces(memoire));
}

/** Une requête est tombée sans réponse (délai dépassé, hôte injoignable). */
export function noterEchecReseau(): void {
  appliquer(apresEchec(memoire, Date.now()));
  if (etatDe(memoire) !== "instable") return;
  // Chaque nouvel échec repousse l'oubli.
  minuterieOubli = arreter(minuterieOubli);
  minuterieOubli = setTimeout(() => {
    minuterieOubli = null;
    appliquer(apresOubli(memoire), true);
  }, OUBLI_INSTABLE_MS);
}

/** L'appareil vient de dire s'il a un réseau. */
export function noterAppareil(appareil: Appareil): void {
  appliquer(apresAppareil(memoire, appareil));
}

/**
 * Vrai quand l'appareil n'a aucun réseau : une action lancée maintenant ne
 * peut qu'échouer. Demande au passage une relecture de l'appareil, pour
 * qu'un état périmé ne bloque jamais deux fois de suite.
 */
export function estSansReseau(): boolean {
  if (!actionImpossible(memoire)) return false;
  relireAppareil?.();
  return true;
}

/** Posé par l'écoute de l'appareil ; `null` quand elle s'arrête. */
export function auMomentDeRelireAppareil(rappel: (() => void) | null): void {
  relireAppareil = rappel;
}

/** La personne ferme le bandeau : il reviendra au prochain changement. */
export function masquerBandeauConnexion(): void {
  if (masque) return;
  masque = true;
  publier();
}

function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/** Ce que le bandeau montre à l'instant — hors de React. */
export const lireAffichage = (): AffichageConnexion => (masque ? "aucun" : affichage);
/** Le numéro du dernier retour — hors de React. */
export const lireVersionRetour = () => versionRetour;

export function useAffichageConnexion(): AffichageConnexion {
  return useSyncExternalStore(abonner, lireAffichage, lireAffichage);
}

/** Le numéro du dernier retour de connexion ; ne sert qu'à être comparé. */
export function useVersionRetour(): number {
  return useSyncExternalStore(abonner, lireVersionRetour, lireVersionRetour);
}

/** Pour les tests : repart d'une connexion dont on ne sait rien. */
export function reinitialiserConnexion(): void {
  memoire = MEMOIRE_INITIALE;
  affichage = "aucun";
  masque = false;
  derniereRelance = null;
  minuterieRetablie = arreter(minuterieRetablie);
  minuterieOubli = arreter(minuterieOubli);
  publier();
}
