/**
 * L'écran de l'équipe est-il ouvert sous les yeux de la personne ?
 *
 * Lu par le centre des notifications : au premier plan, une notification
 * `support` qui arrive pendant que l'échange est affiché ne montre pas sa
 * bannière — la réponse est déjà là, en direct. Le serveur évite déjà la
 * plupart de ces notifications (lecture de moins de 45 s) ; ceci couvre la
 * course entre sa décision et l'arrivée du message.
 *
 * Une valeur de module, comme `lib/intention.ts` : deux domaines s'y
 * parlent sans contexte React commun.
 */

let ouvert = false;

export function signalerEcranEquipe(estOuvert: boolean): void {
  ouvert = estOuvert;
}

export function ecranEquipeOuvert(): boolean {
  return ouvert;
}
