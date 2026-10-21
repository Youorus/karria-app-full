/**
 * La salutation selon l'heure — partagée par l'assistant et les offres.
 */

/**
 * La salutation selon l'heure.
 *
 * L'heure est passée en paramètre plutôt que lue ici : lire l'horloge
 * rendrait la fonction impure, donc impossible à éprouver sans truquer le
 * temps.
 */
export function salutation(heure: number): string {
  if (heure >= 5 && heure < 18) return "Bonjour";
  return "Bonsoir";
}
