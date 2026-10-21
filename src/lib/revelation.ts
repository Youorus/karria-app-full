/**
 * La révélation progressive d'une réponse.
 *
 * ═══ Pourquoi révéler plutôt qu'afficher d'un bloc ═══
 *
 * Un paragraphe qui apparaît d'un coup se lit comme un document qu'on
 * reçoit ; le même paragraphe qui se déroule se lit comme quelqu'un qui
 * parle. C'est une part essentielle de l'impression de présence — et ce
 * sera exactement le rendu du flux quand le backend diffusera sa réponse
 * au fil de l'eau.
 *
 * ═══ Par mots, pas par lettres ═══
 *
 * Lettre à lettre, l'œil suit le curseur au lieu de lire. On avance d'un
 * mot à chaque battement : la vitesse de lecture d'un humain, à peu près.
 */

/** Durée d'un battement, en millisecondes. */
export const BATTEMENT_MS = 35;

/**
 * La prochaine borne de révélation : la fin du mot suivant.
 *
 * Rend `texte.length` quand tout est visible ; l'appelant s'arrête là.
 */
export function borneSuivante(texte: string, visible: number): number {
  if (visible >= texte.length) return texte.length;
  const espace = texte.indexOf(" ", visible + 1);
  return espace === -1 ? texte.length : espace;
}
