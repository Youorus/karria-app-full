/**
 * La traduction d'une erreur en **consigne**.
 *
 * ═══ La règle, et pourquoi elle est absolue ═══
 *
 * Un message d'erreur qui ne dit pas quoi faire est un cul-de-sac. « Une
 * erreur est survenue » laisse l'utilisateur devant un écran qu'il ne peut
 * pas débloquer : il ferme l'application, et il ne revient pas.
 *
 * Chaque erreur affichée par Karria répond donc à trois questions :
 * **quoi** s'est passé, **pourquoi**, et **quoi faire maintenant**.
 *
 * ═══ Pourquoi une table et non un `if` dans chaque écran ═══
 *
 * Le serveur rend un code stable dans `details.reason`. Le brancher au bon
 * endroit une seule fois évite que deux écrans traduisent la même panne de
 * deux façons — et évite surtout qu'un écran oublie de la traduire.
 *
 * ═══ Pourquoi on ne réécrit pas systématiquement le message du serveur ═══
 *
 * Il est déjà rédigé pour être lu, et il connaît des détails que le client
 * ignore : le nombre exact de secondes à patienter, le champ fautif. On ne
 * le remplace que lorsqu'on peut faire **mieux** — c'est-à-dire ajouter la
 * marche à suivre. Sinon on le laisse passer tel quel.
 */

import { ErreurApi } from "@/lib/http";

/** Ce qu'un écran a besoin de savoir pour afficher une erreur. */
export interface ErreurLisible {
  /** Le texte montré. Toujours une phrase complète, jamais un code. */
  message: string;
  /** Le champ à souligner, s'il y en a un. */
  champ?: "email" | "code";
  /** Vrai si l'action se retente à l'identique — on propose « Réessayer ». */
  retentable: boolean;
  /** Vrai si le parcours est perdu et doit repartir de l'adresse. */
  recommencer: boolean;
}

/** Les consignes qui font mieux que le message brut du serveur. */
const CONSIGNES: Record<string, Omit<ErreurLisible, "message"> & { message?: string }> = {
  // ── Le code saisi ──
  auth_code_invalid: {
    message: "Ce code ne correspond pas. Vérifie les six chiffres reçus par e-mail.",
    champ: "code",
    retentable: false,
    recommencer: false,
  },
  // « Recommencer » et non « Renvoyer » : le plan l'attend (ACC02), et
  // le renvoi peut lui-même être épuisé ou trop tôt — repartir de
  // l'adresse marche toujours (A21). « Renvoyer le code » reste offert
  // sous le champ quand le délai du serveur le permet.
  auth_code_expired: {
    message: "Ce code a expiré. Demandes-en un nouveau ou recommence.",
    champ: "code",
    retentable: false,
    recommencer: true,
  },
  auth_code_exhausted: {
    message: "Trop d'essais sur ce code. Demandes-en un nouveau.",
    champ: "code",
    retentable: false,
    recommencer: false,
  },

  // ── Le parcours ──
  auth_login_challenge_expired: {
    message: "Cette connexion a expiré. Saisis à nouveau ton adresse e-mail.",
    retentable: false,
    recommencer: true,
  },
  auth_login_step_out_of_order: {
    message: "Cette étape n'est plus valable. Reprends depuis ton adresse e-mail.",
    retentable: false,
    recommencer: true,
  },
  auth_login_code_resend_exhausted: {
    message:
      "Tu as demandé trop de codes. Reprends depuis ton adresse e-mail — " +
      "et vérifie qu'elle est correcte.",
    retentable: false,
    recommencer: true,
  },
  // Le serveur compte les secondes restantes : son message est plus juste
  // que tout ce qu'on pourrait écrire ici.
  auth_login_code_resend_too_soon: { retentable: false, recommencer: false },

  // ── Les limites ──
  auth_too_many_attempts: {
    message: "Trop de tentatives. Patiente quelques minutes avant de réessayer.",
    retentable: false,
    recommencer: false,
  },

  // ── L'adresse ──
  user_email_invalid: {
    message: "Cette adresse e-mail n'est pas valide. Vérifie la saisie.",
    champ: "email",
    retentable: false,
    recommencer: false,
  },

  // ── Le compte ──
  user_account_suspended: {
    message: "Ce compte est suspendu. Écris-nous à hello@karria.fr pour le rétablir.",
    retentable: false,
    recommencer: false,
  },
  user_account_blocked: {
    message: "Ce compte est bloqué. Écris-nous à hello@karria.fr.",
    retentable: false,
    recommencer: false,
  },

  // ── Le réseau ──
  reseau_injoignable: {
    message: "Connexion impossible. Vérifie ton réseau, puis réessaie.",
    retentable: true,
    recommencer: false,
  },
};

/**
 * Rend une erreur affichable, quelle qu'en soit l'origine.
 *
 * `secours` est le message utilisé quand rien n'est identifiable — une
 * panne serveur, un cas non prévu. Il est demandé à l'appelant et non
 * codé ici : « nous n'avons pas pu envoyer le code » et « nous n'avons pas
 * pu te connecter » n'appellent pas la même suite.
 */
export function lire(cause: unknown, secours: string): ErreurLisible {
  if (!(cause instanceof ErreurApi)) {
    // Une exception qui n'est pas une réponse du serveur est un défaut de
    // l'application. On le journalise — sans lui, il est invisible — et on
    // dit à l'utilisateur ce qu'il peut faire.
    console.error("[karria] erreur inattendue", cause);
    return { message: secours, retentable: true, recommencer: false };
  }

  const consigne = cause.raison === undefined ? undefined : CONSIGNES[cause.raison];
  if (consigne !== undefined) {
    return { ...consigne, message: consigne.message ?? cause.message };
  }

  // Pas de consigne dédiée : le message du serveur reste le meilleur —
  // il est rédigé, il est en français, et il connaît le contexte.
  return {
    message: cause.message,
    champ: cause.champ === "email" || cause.champ === "code" ? cause.champ : undefined,
    // 5xx : le serveur a échoué, pas l'utilisateur. Réessayer a du sens.
    retentable: cause.estReseau || cause.statut >= 500,
    recommencer: false,
  };
}

/** Secondes à patienter, quand le serveur les indique. */
export function attenteRestante(cause: unknown): number | null {
  if (!(cause instanceof ErreurApi)) {
    return null;
  }
  const valeur = cause.details.retry_after;
  return typeof valeur === "number" ? valeur : null;
}
