/**
 * L'intention en attente : ce qu'on voulait faire quand la connexion
 * s'est interposée.
 *
 * ═══ Le problème ═══
 *
 * En mode invité, on touche « Garder » sur une offre, Karria, ou « Créer
 * mon CV ». La feuille de connexion s'ouvre ; une fois connecté, l'action
 * doit **reprendre toute seule** — sinon la personne refait le geste, ou
 * ne le refait pas. L'écran qui a demandé la connexion est toujours monté
 * dessous (l'espace `(app)` ne se démonte plus à la connexion) : il lui
 * suffit de savoir qu'une intention l'attend.
 *
 * ═══ Pourquoi un store minuscule, et non la navigation ═══
 *
 * L'intention traverse deux écrans de connexion qu'on ne contrôle pas
 * (adresse, code) et une feuille sociale. La faire voyager en paramètre de
 * route la mettrait dans l'historique ; un contexte React arriverait trop
 * bas. Une valeur de module, consommée une fois, suffit — et se teste sans
 * rendu.
 *
 * `cle` nomme l'action (« fil.garder », « karria », « cv.creer ») ; `charge`
 * porte l'identifiant visé, s'il y en a un. Une seule intention à la fois :
 * la plus récente remplace la précédente.
 */

export interface Intention {
  cle: string;
  charge?: string;
}

let enAttente: Intention | null = null;

export function retenirIntention(intention: Intention): void {
  enAttente = intention;
}

/** L'intention en attente, sans la consommer. */
export function intentionEnAttente(): Intention | null {
  return enAttente;
}

/**
 * Prend l'intention si elle porte cette clé, et l'efface.
 *
 * Rend `null` sinon : un écran qui n'est pas concerné ne touche à rien,
 * et l'écran concerné la trouvera.
 */
export function consommerIntention(cle: string): Intention | null {
  if (enAttente === null || enAttente.cle !== cle) return null;
  const prise = enAttente;
  enAttente = null;
  return prise;
}

/** « Pas maintenant » : l'intention tombe. */
export function oublierIntention(): void {
  enAttente = null;
}
