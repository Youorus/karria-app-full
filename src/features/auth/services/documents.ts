/**
 * Les documents que l'utilisateur accepte en continuant.
 *
 * ═══ Pourquoi un navigateur intégré et non `Linking` ═══
 *
 * `Linking.openURL` sort de l'application vers Safari ou Chrome : la
 * personne lit les conditions, puis doit retrouver Karria dans le
 * sélecteur d'applications — beaucoup ne reviennent pas. Le navigateur
 * intégré s'ouvre par-dessus et se referme d'un geste.
 *
 * ⚠️ Les adresses sont à confirmer : karria.fr est hébergé sur Vercel et
 * ces pages doivent y exister avant la publication sur les stores — Apple
 * et Google refusent une application dont la politique de
 * confidentialité ne s'ouvre pas.
 */

import * as WebBrowser from "expo-web-browser";

export const DOCUMENTS = {
  conditions: "https://karria.fr/conditions-generales",
  confidentialite: "https://karria.fr/confidentialite",
} as const;

export type Document = keyof typeof DOCUMENTS;

export async function ouvrirDocument(document: Document): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(DOCUMENTS[document]);
  } catch (cause) {
    // Rien à montrer de plus utile qu'un lien qui ne s'ouvre pas : on
    // journalise pour le diagnostic, sans interrompre la connexion.
    console.warn(`[karria] document « ${document} » impossible à ouvrir`, cause);
  }
}
