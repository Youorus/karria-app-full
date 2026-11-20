/**
 * Ce que l'application a déjà demandé à la personne pendant ce lancement —
 * pour ne jamais lui demander deux choses coup sur coup.
 *
 * ═══ Pourquoi ce fichier ═══
 *
 * Trois domaines sollicitent : la publicité (le consentement UMP, le suivi
 * ATT), le soutien (la proposition d'abonnement après un CV filigrané ou des
 * portraits épuisés), et la demande d'avis sur le magasin. Le dernier doit
 * savoir ce que les deux premiers ont fait : pas d'invitation à noter dans
 * la session où le consentement publicitaire vient d'être montré, ni juste
 * après une proposition d'abonnement. Aucun de ces domaines n'a à connaître
 * les autres : chacun **note** ici, la demande d'avis **lit**.
 *
 * ═══ En mémoire seulement ═══
 *
 * La portée est le lancement : rien n'est retenu sur le disque. Une valeur
 * par genre — l'instant de la dernière fois.
 */

export type Sollicitation =
  /** Le formulaire de consentement UMP ou l'invite de suivi ATT. */
  | "consentement-pub"
  /** La feuille qui propose Karria sans pub. */
  | "proposition-abonnement";

const dernieres = new Map<Sollicitation, number>();

export function noterSollicitation(
  genre: Sollicitation,
  maintenant: number = Date.now(),
): void {
  dernieres.set(genre, maintenant);
}

/** L'instant de la dernière sollicitation de ce genre, ou `null`. */
export function derniereSollicitation(genre: Sollicitation): number | null {
  return dernieres.get(genre) ?? null;
}

/** Pour les tests : comme un nouveau lancement. */
export function oublierLesSollicitations(): void {
  dernieres.clear();
}
