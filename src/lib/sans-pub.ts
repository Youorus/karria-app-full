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
 * recopie. Au démarrage, la réponse est « non » tant que le serveur n'a
 * pas parlé — et les annonces, elles, attendent 2,5 s après le premier
 * écran : le serveur a le temps de répondre. La déconnexion remet à « non ».
 */

let sansPub = false;
const abonnes = new Set<() => void>();

export function estSansPub(): boolean {
  return sansPub;
}

/** Recopie ce que le serveur a dit. Prévient les abonnés si cela change. */
export function poserSansPub(valeur: boolean): void {
  if (valeur === sansPub) return;
  sansPub = valeur;
  abonnes.forEach((rappel) => rappel());
}

export function abonnerSansPub(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}
