/**
 * La validation de l'adresse, côté client.
 *
 * ═══ Pourquoi valider ici alors que le serveur valide déjà ═══
 *
 * Pas pour la sécurité — le serveur reste seul juge. Pour le **temps** :
 * une faute de frappe détectée avant l'envoi coûte zéro seconde, détectée
 * par le serveur elle coûte un aller-retour et un message qui arrive trop
 * tard, alors que le clavier est déjà refermé.
 *
 * ═══ Pourquoi une règle si permissive ═══
 *
 * On ne cherche pas à décider si une adresse existe : c'est impossible, et
 * toute tentative rejette des adresses valides — les apostrophes, les
 * domaines longs, les caractères accentués. On refuse seulement ce qui ne
 * peut *pas* être une adresse : rien avant l'arobase, rien après, ou pas
 * de point dans le domaine.
 */

const FORME = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliser(saisie: string): string {
  // Les claviers mobiles ajoutent volontiers une espace après la saisie,
  // et les gestionnaires de mots de passe collent parfois une majuscule
  // initiale. Ni l'une ni l'autre n'appartient à l'adresse.
  return saisie.trim().toLowerCase();
}

export function estPlausible(saisie: string): boolean {
  return FORME.test(normaliser(saisie));
}
