/**
 * Ce qu'une connexion par fournisseur produit, côté mobile.
 *
 * ═══ Pourquoi un type d'annulation, et pas une erreur ═══
 *
 * Fermer la feuille d'Apple ou le sélecteur de compte Google n'est pas
 * une panne : c'est une réponse. La traiter comme une erreur ferait
 * afficher « une erreur est survenue » à quelqu'un qui a simplement
 * changé d'avis — le message le plus agaçant qu'une application puisse
 * produire.
 *
 * Le distinguer au niveau du type oblige chaque appelant à décider quoi
 * en faire, plutôt qu'à le découvrir en production.
 */

export type FournisseurSocial = "apple" | "google";

/** L'annulation : rien à dire, rien à afficher. */
export interface ConnexionAnnulee {
  resultat: "annulee";
}

/** Une panne réelle : réseau, configuration, fournisseur indisponible. */
export interface ConnexionEchouee {
  resultat: "echec";
  /** Message affichable. Jamais le détail technique du fournisseur. */
  message: string;
}

/** Ce que le fournisseur a rendu, prêt à partir au serveur. */
export interface CredentialSocial {
  resultat: "obtenu";
  fournisseur: FournisseurSocial;
  /** Le JWT signé — `identityToken` chez Apple, `idToken` chez Google. */
  jeton: string;
  /**
   * Le nonce **en clair**. Apple signe son SHA-256 ; le serveur compare
   * les deux. Absent chez Google, dont la bibliothèque native ne l'expose
   * pas de façon fiable selon les plateformes.
   */
  nonce?: string;
}

export type ResultatSocial = CredentialSocial | ConnexionAnnulee | ConnexionEchouee;
