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
  surtitre: "Offrir un café",
  titre: "Karria reste gratuit. Pour toujours.",
  invitation:
    "On est une petite équipe qui construit Karria avec passion, tard le soir et tôt le matin. Si l'app t'aide dans ta recherche, tu peux nous offrir un café : c'est ce qui nous fait tenir, et avancer plus vite.",
  promesse: "Rien à débloquer, rien à perdre : tout reste gratuit, pour tout le monde.",
  bientot: "Les cafés arrivent avec la prochaine version de l'app.",
  merciTitre: "Merci, du fond du cœur !",
  merciTexte:
    "Ton café vient d'arriver chez l'équipe. Il va servir à rendre Karria encore meilleur — on file coder. Et bonne chance pour ta recherche.",
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
