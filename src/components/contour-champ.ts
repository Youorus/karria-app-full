/**
 * Le contour d'une zone de saisie, en un seul endroit.
 *
 * ═══ Pourquoi une fonction et non trois classes recopiées ═══
 *
 * Le même triplet — repos, saisie, erreur — était écrit à l'identique dans
 * six fichiers : le champ de texte, l'adresse, la date, le sélecteur de
 * pays, les cases du code, la zone de message. Changer la couleur du repos
 * demandait six modifications, et il suffisait d'en oublier une pour qu'un
 * écran reste en arrière — ce qui est exactement arrivé au sélecteur de
 * pays, qui n'avait jamais eu d'état de saisie.
 *
 * ═══ La couleur appartient au focus, et à lui seul ═══
 *
 * Au repos : un gris à 1,5 point, plus présent que le contour d'une carte
 * — un champ doit se lire comme une zone où l'on agit — mais neutre.
 *
 * En saisie : 2 points, et l'orange de la marque.
 *
 * L'orange a été essayé au repos, en suivant une maquette où le champ était
 * seul sur l'écran. Il tient dans ce cas et **cesse de tenir dès qu'il y a
 * plusieurs champs** : si tous portent la couleur, celui où l'on écrit ne
 * se distingue plus que par un demi-point d'épaisseur. Sur les cinq champs
 * de l'identité légale, on ne sait plus où l'on est. La couleur ne peut pas
 * à la fois marquer « ceci est un champ » et « c'est ici que vous
 * écrivez » : on lui laisse le second, qui est le seul dont la lecture
 * change à chaque instant.
 *
 * Le même partage vaut pour les cases et les boutons radio : contour gris
 * tant que rien n'est choisi, orange plein une fois le choix fait.
 *
 * ═══ C'est la fonction qui décide ce qu'« aucune erreur » veut dire ═══
 *
 * Elle prenait un booléen, que chaque appelant calculait lui-même. Trois
 * conventions coexistaient dans le dépôt pour la même idée : `string |
 * undefined` sur le champ de texte, `string | null` sur la date et le
 * sélecteur de pays, `boolean` sur les cases du code. Deux appelants ont
 * écrit `erreur !== undefined` sur une valeur qui vaut `null` par défaut —
 * et leur champ s'est affiché **en rouge en permanence**, sans qu'aucune
 * erreur n'existe.
 *
 * Elle reçoit donc la valeur elle-même, et tranche ici. Un appelant ne
 * peut plus se tromper sur la façon de tester le vide, puisqu'il ne le
 * teste plus.
 */

export function contourDeChamp({
  actif = false,
  erreur,
}: {
  /** La saisie a le focus. */
  actif?: boolean;
  /**
   * L'erreur qui porte sur ce champ — son message, ou un simple drapeau
   * quand il n'y a rien à écrire. Prime sur tout le reste.
   *
   * Absente, nulle, vide ou fausse : pas d'erreur. Les quatre valent
   * pareil, et c'est délibéré — voir l'en-tête.
   */
  erreur?: string | boolean | null;
}): string {
  if (erreur !== undefined && erreur !== null && erreur !== false && erreur !== "") {
    return "border-2 border-destructive";
  }
  return actif ? "border-2 border-primary" : "border-[1.5px] border-border-champ";
}
