/**
 * « Cette personne est-elle sans publicité ? » — la seule question que la
 * publicité pose, répondue ici pour toute l'application.
 *
 * ═══ Pourquoi un état au niveau du module ═══
 *
 * La réponse vient du serveur (`GET /payments/me`, `ad_free.active`) et doit
 * être lue par deux domaines qui ne se connaissent pas : le soutien, qui
 * l'apprend, et la publicité, qui l'applique — avant même qu'un écran ne
 * soit monté, puisque le SDK AdMob ne doit **pas** s'initialiser pour une
 * personne qui a payé pour ne pas le voir. Un contexte React arriverait
 * trop tard et trop bas ; un store minuscule, abonnable, suffit.
 *
 * ═══ Ce qu'il ne fait pas ═══
 *
 * Il ne décide rien : le serveur dit « sans pub », l'application le
 * recopie. La déconnexion remet à « non ».
 *
 * ═══ La dernière réponse connue survit au redémarrage ═══
 *
 * Avant le 2026-11-20, le drapeau repartait à « non » à chaque démarrage à
 * froid : si `GET /payments/me` échouait (hors ligne, serveur en panne), un
 * abonné voyait des annonces toute la session. Désormais chaque réponse du
 * serveur est retenue dans le magasin local (`lib/magasin-local.ts`), et
 * relue au démarrage (`restaurerSansPub`). La publicité **attend** cette
 * relecture avant d'initialiser quoi que ce soit (`sansPubPret`,
 * `reserve-annonces.ts`) : un abonné ne voit jamais une annonce à cause
 * d'une panne réseau.
 *
 * Le serveur garde le dernier mot : dès qu'il répond, sa réponse remplace
 * la valeur relue — et une relecture qui arrive **après** lui est ignorée.
 * Un abonnement résilié se voit donc à la première lecture réussie ; d'ici
 * là, on préfère priver d'annonces un ancien abonné que d'en montrer à
 * quelqu'un qui paie.
 */

import { ecrireLocal, lireLocal } from "@/lib/magasin-local";

const CLE = "karria.sans-pub";

let sansPub = false;
/** Une réponse a été posée ce lancement-ci : la relecture ne la remplace plus. */
let tranche = false;
/** Ce que le magasin local contient, autant qu'on le sache ; `null` : inconnu. */
let retenu: boolean | null = null;
let relecture: Promise<void> | null = null;
const abonnes = new Set<() => void>();

function estUnBooleen(valeur: unknown): valeur is boolean {
  return typeof valeur === "boolean";
}

function appliquer(valeur: boolean): void {
  if (valeur === sansPub) return;
  sansPub = valeur;
  abonnes.forEach((rappel) => rappel());
}

export function estSansPub(): boolean {
  return sansPub;
}

/**
 * Recopie ce que le serveur a dit (ou la déconnexion : « non »). Prévient
 * les abonnés si cela change, et retient la réponse pour le prochain
 * démarrage — l'écriture ne lève jamais (`ecrireLocal`).
 */
export function poserSansPub(valeur: boolean): void {
  tranche = true;
  appliquer(valeur);
  if (retenu !== valeur) {
    retenu = valeur;
    void ecrireLocal(CLE, valeur);
  }
}

/**
 * Relit la dernière réponse connue — une seule fois par lancement, quel que
 * soit le nombre d'appelants. Ne lève jamais : une valeur illisible vaut
 * « non », comme avant.
 */
export function restaurerSansPub(): Promise<void> {
  relecture ??= lireLocal<boolean>(CLE, false, estUnBooleen).then((lu) => {
    // Le serveur (ou la déconnexion) a parlé entre-temps : il a raison.
    if (tranche) return;
    retenu = lu;
    appliquer(lu);
  });
  return relecture;
}

/**
 * Résolu quand la dernière réponse connue a été relue : à attendre avant
 * toute initialisation du SDK publicitaire.
 */
export function sansPubPret(): Promise<void> {
  return restaurerSansPub();
}

export function abonnerSansPub(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/** Pour les tests : comme un démarrage à froid (le magasin local, lui, reste). */
export function redemarrerSansPubPourTest(): void {
  sansPub = false;
  tranche = false;
  retenu = null;
  relecture = null;
}
