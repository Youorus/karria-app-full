/**
 * Les jetons de session, et le seul endroit qui y touche.
 *
 * ═══ Deux jetons, deux rôles ═══
 *
 * Le jeton **d'accès** part à chaque requête et vit quinze minutes : c'est
 * lui qui a le plus d'occasions d'être intercepté, donc lui qui doit
 * périmer vite. Le jeton de **rafraîchissement** vit un an, ne sort que
 * pour en obtenir un nouveau, et se renouvelle à chaque usage.
 *
 * ═══ Pourquoi l'utilisateur n'est jamais déconnecté ═══
 *
 * Parce que la durée d'un an est *glissante* : chaque rotation la
 * repousse. Ouvrir l'application, même une fois par saison, suffit à ne
 * jamais atteindre l'échéance. C'est le comportement des grandes
 * applications grand public — et ce n'est pas une astuce, c'est la conséquence directe
 * d'un jeton qui se renouvelle plutôt que de compter à rebours.
 *
 * ═══ Pourquoi le magasin sécurisé et non `AsyncStorage` ═══
 *
 * `AsyncStorage` écrit en clair dans le bac à sable de l'application. Sur
 * un téléphone débridé — ou dans une sauvegarde extraite — le jeton se lit
 * à l'œil nu. `expo-secure-store` le confie au trousseau d'iOS et au
 * magasin chiffré d'Android : le système le protège comme un mot de passe
 * enregistré.
 *
 * ═══ Pourquoi tout passe par ce fichier ═══
 *
 * Un jeton lu à deux endroits finit par être écrit à deux endroits, et la
 * déconnexion en oublie un. Ici, `oublierSession()` suffit à être certain
 * qu'il ne reste rien.
 */

import * as SecureStore from "expo-secure-store";

const CLE_ACCES = "karria.acces";
const CLE_RAFRAICHISSEMENT = "karria.rafraichissement";
export interface Jetons {
  acces: string;
  rafraichissement: string;
}

/**
 * Les jetons enregistrés, ou `null` si personne n'est connecté.
 *
 * Un seul des deux présent est traité comme aucun : l'état est incohérent
 * — écriture interrompue, restauration partielle — et poursuivre avec la
 * moitié d'une session produirait des 401 en boucle plutôt qu'un écran de
 * connexion franc.
 */
export async function lireJetons(): Promise<Jetons | null> {
  try {
    const [acces, rafraichissement] = await Promise.all([
      SecureStore.getItemAsync(CLE_ACCES),
      SecureStore.getItemAsync(CLE_RAFRAICHISSEMENT),
    ]);
    if (acces === null || rafraichissement === null) {
      return null;
    }
    return { acces, rafraichissement };
  } catch {
    // Le magasin peut être indisponible — appareil encore verrouillé au
    // démarrage, par exemple. On se comporte comme si personne n'était
    // connecté : l'utilisateur ressaisira, ce qui vaut mieux qu'un écran
    // qui plante au lancement.
    return null;
  }
}

export async function ecrireJetons(jetons: Jetons): Promise<void> {
  // En parallèle, mais les deux écritures sont attendues : rendre la main
  // avant la fin laisserait une requête suivante lire l'ancien jeton.
  await Promise.all([
    SecureStore.setItemAsync(CLE_ACCES, jetons.acces),
    SecureStore.setItemAsync(CLE_RAFRAICHISSEMENT, jetons.rafraichissement),
  ]);
}

export async function oublierSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(CLE_ACCES),
    SecureStore.deleteItemAsync(CLE_RAFRAICHISSEMENT),
  ]);
}
