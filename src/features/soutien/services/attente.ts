/**
 * L'attente de la livraison, après le retour de la page de paiement.
 *
 * ═══ Pourquoi relire au lieu de croire le navigateur ═══
 *
 * `openAuthSessionAsync` rend « success » quand la page de retour a renvoyé
 * vers l'application, et « dismiss » ou « cancel » quand on l'a fermée — mais
 * aucun des deux ne dit si Stripe a encaissé : la personne peut avoir payé
 * puis fermé, ou atteint la page de retour sans payer (annulation). Le
 * serveur, lui, n'apprend le paiement que par la notification signée de
 * Stripe, quelques secondes après. On relit donc jusqu'à ce qu'il dise
 * « livré » (`fulfilled`), ou qu'on renonce.
 *
 * ═══ Pourquoi peu de relectures ═══
 *
 * Rien n'est perdu à abandonner : le café ou le « sans pub » apparaîtront à la
 * prochaine visite du profil, relu au focus. Six relectures sur une douzaine
 * de secondes couvrent le cas courant sans faire tourner un indicateur quand
 * la personne a simplement fermé la page.
 */

const DELAIS_MS: readonly number[] = [800, 1_200, 1_800, 2_500, 3_000, 4_000];

const dormirVraiment = (ms: number): Promise<void> =>
  new Promise((resoudre) => setTimeout(resoudre, ms));

export type Issue = "livre" | "en_attente" | "inconnu";

/**
 * Relit jusqu'à ce que `lire` dise vrai, ou jusqu'à épuisement.
 *
 * - `livre` : le serveur a livré ;
 * - `en_attente` : le serveur a répondu, mais pas encore livré ;
 * - `inconnu` : aucune lecture n'a abouti — on ne sait pas, et on ne doit
 *   pas dire « non payé » à quelqu'un dont l'argent est peut-être parti.
 */
export async function attendreLaLivraison(
  lire: () => Promise<boolean>,
  options: {
    readonly delaisMs?: readonly number[];
    readonly dormir?: (ms: number) => Promise<void>;
  } = {},
): Promise<Issue> {
  const delais = options.delaisMs ?? DELAIS_MS;
  const dormir = options.dormir ?? dormirVraiment;
  let repondu = false;

  // Une lecture immédiate d'abord : la notification est souvent déjà
  // arrivée pendant que la page se refermait.
  for (let tour = 0; tour <= delais.length; tour += 1) {
    if (tour > 0) await dormir(delais[tour - 1] ?? 0);
    try {
      if (await lire()) return "livre";
      repondu = true;
    } catch (cause) {
      console.warn("[karria] relecture du paiement échouée, on retente", cause);
    }
  }
  return repondu ? "en_attente" : "inconnu";
}
