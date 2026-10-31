/**
 * Pourquoi on part : les raisons proposées, et leurs mots.
 *
 * ═══ Une liste close, celle du contrat ═══
 *
 * Les codes sont ceux de `docs/contrat-api-compte.md` — le serveur refuse
 * tout autre. Les libellés, eux, sont les nôtres : au tutoiement, sans
 * reproche. Ajouter une raison, c'est d'abord l'ajouter au contrat.
 *
 * ═══ Ce que chaque raison déclenche ═══
 *
 * - `found_job` : on félicite. C'est la raison qu'on espère, et la seule
 *   bonne nouvelle de cet écran — elle mérite d'être dite.
 * - `too_many_notifications` : on propose de les régler **avant** de
 *   supprimer, une fois, sans insister. Supprimer un compte pour couper
 *   des notifications est le genre de geste qu'on regrette.
 *
 * ═══ Le détail libre ═══
 *
 * 1 000 caractères, la borne du contrat. On tronque à la saisie plutôt
 * que d'afficher une erreur après : personne n'écrit une lettre dans ce
 * champ, et un compteur suffit à le dire.
 */

import type { NomIcone } from "@/components/icone";
import type { RaisonDeDepart } from "@/features/auth/types/auth.types";

export interface Raison {
  code: RaisonDeDepart;
  libelle: string;
  icone: NomIcone;
}

export const RAISONS: readonly Raison[] = [
  { code: "found_job", libelle: "J'ai trouvé un emploi 🎉", icone: "fete" },
  {
    code: "no_matching_offers",
    libelle: "Je ne trouve pas d'offres qui me correspondent",
    icone: "loupeBarree",
  },
  { code: "not_useful", libelle: "L'app ne m'est pas utile", icone: "question" },
  {
    code: "too_many_notifications",
    libelle: "Trop de notifications",
    icone: "clocheBarree",
  },
  { code: "privacy", libelle: "Je suis inquiet pour mes données", icone: "bouclier" },
  { code: "other", libelle: "Autre", icone: "citation" },
] as const;

export const DETAILS_MAX = 1_000;

/** Ce que l'écran dit juste sous la raison choisie, s'il a quelque chose à dire. */
export function reactionA(raison: RaisonDeDepart | null): string | null {
  switch (raison) {
    case "found_job":
      return "Félicitations ! C'est exactement pour ça que Karria existe. Bonne route.";
    case "too_many_notifications":
      return "Tu peux aussi les couper sans supprimer ton compte — Karria reste là, en silence.";
    case "privacy":
      return "C'est légitime. La suppression efface tout, de ton côté comme du nôtre.";
    default:
      return null;
  }
}

/** Vrai quand on propose une alternative à la suppression. */
export function proposeLesNotifications(raison: RaisonDeDepart | null): boolean {
  return raison === "too_many_notifications";
}

/** La saisie, bornée. Un `slice` et non un refus : le champ ne bloque
 *  jamais, il s'arrête. */
export function bornerDetails(texte: string): string {
  return texte.length > DETAILS_MAX ? texte.slice(0, DETAILS_MAX) : texte;
}

/** Ce qui disparaît, dit sans détour. L'ordre va du plus personnel au
 *  plus technique : on commence par ce qui compte pour la personne. */
export const CE_QUI_DISPARAIT: readonly string[] = [
  "Ton compte et ton adresse e-mail",
  "Ton CV, ton brouillon et ta photo",
  "Tes offres gardées et ce que tu as dit à Karria",
  "Tes appareils : plus aucune notification",
];
