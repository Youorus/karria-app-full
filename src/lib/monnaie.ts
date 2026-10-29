/**
 * Les montants, écrits comme on les lit en France.
 *
 * ═══ Des centimes entiers, jamais des flottants ═══
 *
 * Le serveur compte en centimes (`amount_cents`) et c'est ce qu'on garde :
 * `4.99 * 3` vaut `14.969999…` en JavaScript, et c'est le montant affiché
 * que la personne réclamerait. On ne fait ici que **formater** ; aucun
 * total ne se recalcule dans l'application (AGENTS.md §6.4).
 *
 * Partagé par le soutien (cafés, abonnement) et les modèles (prix d'un
 * modèle Premium) : deux domaines, donc `src/lib/`.
 */

/** `499` → « 4,99 € » ; `1200` → « 12 € ». */
export function euros(centimes: number): string {
  const entier = Math.trunc(Math.abs(centimes) / 100);
  const reste = Math.abs(centimes) % 100;
  const signe = centimes < 0 ? "-" : "";
  return reste === 0
    ? `${signe}${entier} €`
    : `${signe}${entier},${String(reste).padStart(2, "0")} €`;
}

/** « 4.99 » (le `price` d'un modèle, tel que le serveur l'écrit) → `499`. */
export function centimesDepuisTexte(prix: string): number | null {
  const n = Number(prix.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}
