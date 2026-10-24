/**
 * Les mots du café : ce que la carte du profil dit, selon l'état.
 *
 * ═══ Le ton ═══
 *
 * Tutoiement, chaleur, honnêteté. On ne culpabilise pas, on ne vend
 * rien : Karria reste gratuit, et un café ne débloque aucune fonction.
 * Il dit merci à une petite équipe, et l'aide à continuer.
 *
 * ═══ Dans un service, pas dans la vue ═══
 *
 * Un libellé choisi selon un nombre de tasses et un état, c'est de la
 * règle (§3.1) — et c'est ce qui se teste sans écran.
 */

import type { OffreDeCafe, Tasses } from "../types/soutien.types";

export const TEXTES = {
  surtitre: "Un mot de l'équipe",
  message:
    "Karria, c'est une toute petite équipe qui y met beaucoup de cœur. L'app restera gratuite, pour tout le monde. Si elle t'aide un peu dans ta recherche, un café nous ferait vraiment plaisir.",
  signature: "— L'équipe Karria",
  bientot: "Les cafés arrivent avec la prochaine version de l'app.",
  merciTitre: "Merci, vraiment.",
  merciTexte:
    "Ton café est bien arrivé. Il nous donne de l'élan pour rendre Karria encore meilleur. Bonne chance pour ta recherche.",
  encoreUn: "En offrir un autre",
} as const;

/** « ☕☕ » : les tasses dessinées, pour le gros du bouton. */
export function tassesDessinees(tasses: Tasses): string {
  return "☕".repeat(tasses);
}

/** Le nom lu par le lecteur d'écran, et le titre sous les tasses. */
export function nomDesTasses(tasses: Tasses): string {
  return tasses === 1 ? "Un café" : tasses === 2 ? "Deux cafés" : "Trois cafés";
}

/** Le bouton d'envoi : « Bientôt » tant que le store n'est pas branché,
 *  sinon le geste et, s'il est connu, le prix. */
export function libelleDOffre(offre: OffreDeCafe | null, disponible: boolean): string {
  if (!disponible || offre === null) return "Bientôt";
  const base = `Offrir ${nomDesTasses(offre.tasses).toLowerCase()}`;
  return offre.prix === null ? base : `${base} · ${offre.prix}`;
}
