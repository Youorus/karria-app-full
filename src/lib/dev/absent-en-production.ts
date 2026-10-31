/**
 * Ce qui remplace `lib/dev/` dans un paquet de production.
 *
 * `metro.config.js` redirige ici tout import de `lib/dev/` quand
 * `NODE_ENV` vaut `production`. Le faux serveur et ses textes préparés
 * n'atteignent ainsi jamais l'appareil d'un utilisateur.
 *
 * Il exporte les mêmes noms, pour que l'empaquetage réussisse. Et s'il
 * était appelé malgré `SIMULATION` — qui exige `__DEV__` —, il échoue
 * bruyamment plutôt que de répondre à la place du vrai serveur.
 */

export const CODE_SIMULATION = "";

export function enAvanceSurLeBackend(): boolean {
  return false;
}

export function repondreEnSimulation(): Promise<Response> {
  return Promise.reject(
    new Error("[karria] le faux serveur a été appelé dans un paquet de production"),
  );
}

export function ouvrirFluxSimule(): Promise<never> {
  return Promise.reject(
    new Error("[karria] le flux simulé a été ouvert dans un paquet de production"),
  );
}
