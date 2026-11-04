/**
 * Un petit magasin clé → valeur JSON, persistant, qui ne lève jamais.
 *
 * ═══ Pourquoi un fichier de plus à côté de `installation.ts` ═══
 *
 * L'application retient quelques faits sans importance mais durables :
 * la date où une bande d'information a été montrée, les impressions
 * publicitaires comptées par emplacement. Chacun les écrivait jusqu'ici à
 * la main dans le magasin sécurisé, avec sa propre lecture d'erreur. Deux
 * domaines (`demarrage`, `publicite`) en ont besoin : d'où `lib/`.
 *
 * ═══ Pourquoi le magasin sécurisé, encore ═══
 *
 * La même raison que `installation.ts` : il est déjà là, il survit aux
 * mises à jour, et il évite une dépendance de stockage. Ce ne sont pas
 * des secrets. Mais le trousseau d'iOS tolère mal les grosses valeurs
 * (avertissement au-delà de 2 Ko) : on n'y range que des compteurs et des
 * dates, jamais une liste qui grandit.
 *
 * ═══ Jamais d'exception ═══
 *
 * Une date de bande illisible, un compteur perdu : rien de tout cela ne
 * mérite d'arrêter un écran. La cause est journalisée et l'appelant reçoit
 * la valeur par défaut qu'il a fournie.
 */

import * as SecureStore from "expo-secure-store";

export async function lireLocal<T>(
  cle: string,
  parDefaut: T,
  valider: (valeur: unknown) => valeur is T,
): Promise<T> {
  try {
    const brut = await SecureStore.getItemAsync(cle);
    if (brut === null || brut === "") return parDefaut;
    const valeur: unknown = JSON.parse(brut);
    return valider(valeur) ? valeur : parDefaut;
  } catch (cause) {
    console.warn(`[karria] valeur locale « ${cle} » illisible`, cause);
    return parDefaut;
  }
}

export async function ecrireLocal(cle: string, valeur: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(cle, JSON.stringify(valeur));
  } catch (cause) {
    console.warn(`[karria] valeur locale « ${cle} » non retenue`, cause);
  }
}

/** Un nombre fini, ou rien : le validateur des dates et des compteurs. */
export function estUnNombre(valeur: unknown): valeur is number {
  return typeof valeur === "number" && Number.isFinite(valeur);
}
