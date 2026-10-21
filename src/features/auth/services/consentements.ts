/**
 * Les versions des documents que l'on fait accepter.
 *
 * ═══ Pourquoi une version et pas un simple « oui » ═══
 *
 * Un consentement sans version ne prouve rien : le jour où les conditions
 * changent, on ne sait plus qui a accepté quoi. Le serveur enregistre donc
 * la version acceptée, et c'est elle qui fait foi.
 *
 * ═══ Où l'utilisateur les accepte ═══
 *
 * Sur l'écran d'accueil, par la phrase « en continuant, tu acceptes… ».
 * Il n'y a plus d'écran d'inscription : continuer **est** l'acceptation,
 * et ces versions partent avec la première requête de connexion (voir
 * `api/auth.api.ts`).
 *
 * La bonne évolution est que l'API les annonce elle-même. Tant qu'elle ne
 * le fait pas, ces constantes font foi côté application.
 */

export const VERSIONS = {
  conditions: "1.0",
  confidentialite: "1.0",
} as const;
