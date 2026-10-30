/**
 * « A déjà choisi de découvrir sans compte » : le seul fait que le mode
 * invité retient d'une ouverture à l'autre.
 *
 * ═══ Pourquoi le retenir ═══
 *
 * Quelqu'un qui a touché « Découvrir les offres » et revient le lendemain
 * ne doit pas retomber sur l'accueil : il a déjà répondu. On rouvre le
 * fil, comme pour une personne connectée — c'est ce qu'Apple attend d'une
 * app dont le contenu principal ne dépend pas d'un compte (5.1.1 v).
 *
 * ═══ Pourquoi le magasin sécurisé ═══
 *
 * Le même que l'identifiant d'installation (`lib/installation.ts`) : il est
 * déjà là, il survit aux mises à jour, et il évite une dépendance de
 * stockage pour un drapeau. Illisible, on se comporte comme si la personne
 * n'avait rien choisi : l'accueil se montre une fois de plus, rien ne casse.
 *
 * La déconnexion efface le choix : la personne qui sort veut l'accueil.
 */

import * as SecureStore from "expo-secure-store";

const CLE_INVITE = "karria.invite";

export async function aChoisiDeDecouvrir(): Promise<boolean> {
  try {
    return (await SecureStore.getItemAsync(CLE_INVITE)) === "1";
  } catch (cause) {
    console.warn("[karria] choix du mode invité illisible", cause);
    return false;
  }
}

export async function retenirDecouverte(): Promise<void> {
  try {
    await SecureStore.setItemAsync(CLE_INVITE, "1");
  } catch (cause) {
    // Au pire, l'accueil se remontre à la prochaine ouverture.
    console.warn("[karria] choix du mode invité non retenu", cause);
  }
}

export async function oublierDecouverte(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CLE_INVITE);
  } catch (cause) {
    console.warn("[karria] choix du mode invité non effacé", cause);
  }
}
