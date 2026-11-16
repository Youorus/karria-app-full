/**
 * La photo du CV, retravaillée par l'IA : les mots et les messages.
 *
 * ═══ Une seule promesse, deux parcours ═══
 *
 * La création (`etape-photo.tsx`) et l'édition (`formulaire-photo.tsx`)
 * proposent le même geste : rendre la photo plus professionnelle — lumière,
 * fond neutre, cadrage — et laisser la personne comparer puis choisir. La
 * promesse est écrite ici, une fois, pour qu'un mot changé le soit partout
 * et qu'aucun des deux parcours ne promette plus que l'autre : la personne
 * reste elle-même, on ne refait pas son visage.
 *
 * ═══ Les erreurs disent quoi faire ═══
 *
 * `photo_enhance_refused` : le générateur refuse **cette** image, réessayer
 * ne changera rien — on le dit, et on suggère une autre photo.
 * `photo_enhance_unavailable` : panne passagère — réessayer plus tard.
 * `portrait_quota_exceeded` : les trois portraits du mois sont utilisés —
 * on dit quand ils reviennent.
 * Dans tous les cas, l'originale reste un très bon choix.
 *
 * ═══ Trois portraits par mois ═══
 *
 * Retravailler une photo est l'action d'IA la plus chère de Karria : trois
 * par mois civil (ADR-0038 de l'API), sans compteur avec Karria sans pub.
 * Le compteur se lit près du bouton, avant d'appuyer ; une photo gardée
 * telle quelle n'est jamais limitée.
 */

import { ErreurApi } from "@/lib/http";

import type { QuotaPortraits } from "../types/cv.types";

const MOIS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/**
 * « le 1er décembre » : le jour où le compteur repart. La remise à zéro
 * tombe à minuit UTC le 1er, soit le 1er aussi à Paris : la date UTC suffit,
 * sans dépendre des fuseaux du moteur JavaScript.
 */
export function dateDeRetour(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "le mois prochain";
  const jour = date.getUTCDate();
  return `le ${jour === 1 ? "1er" : String(jour)} ${MOIS[date.getUTCMonth()]}`;
}

/**
 * Ce qu'on lit sous le bouton du portrait : ce qui reste, ou quand ça revient.
 * `null` pour un abonné tant qu'il reste de la marge : il n'a pas de compteur.
 */
export function mentionPortraits(quota: QuotaPortraits): string | null {
  if (quota.abonne) {
    return quota.restants <= 0
      ? `Tu as atteint la limite d'usage raisonnable des portraits ce mois-ci. Les prochains ${dateDeRetour(quota.repartLe)}.`
      : null;
  }
  if (quota.restants <= 0) {
    return `Tu as utilisé tes ${quota.limite} portraits du mois. Les prochains ${dateDeRetour(quota.repartLe)}.`;
  }
  return quota.restants === 1
    ? "1 portrait retravaillé restant ce mois-ci."
    : `${quota.restants} portraits retravaillés restants ce mois-ci.`;
}

export const TEXTES_PHOTO = {
  /** Ce que Karria propose, avant d'envoyer quoi que ce soit. */
  promesse:
    "Je peux la rendre plus pro : lumière, fond neutre, cadrage. Tu compareras les deux et tu garderas celle que tu préfères.",
  /** Le geste, tel qu'il se lit sur le bouton de l'édition. */
  action: "Rendre ma photo professionnelle",
  /** Pendant que le générateur travaille. */
  enCours: "Karria travaille ta photo…",
  /** Les deux portraits, côte à côte. */
  originale: "Ta photo",
  amelioree: "Retravaillée",
  garderOriginale: "Garder l'originale",
  garderAmelioree: "Garder cette version",
  /** Sous la comparaison : ce qui a changé, et ce qui n'a pas changé. */
  comparaison:
    "Même personne, même expression. Seuls la lumière, le fond et le cadrage ont bougé.",
  /** L'amélioration a échoué : l'originale reste. */
  originaleSuffit: "Ta photo est très bien comme ça.",
} as const;

/** Le message humain d'une amélioration qui a échoué. */
export function messageDAmelioration(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau) return "Pas de connexion. Réessaie quand le réseau sera là.";
    if (cause.raison === "photo_enhance_refused")
      return "Cette photo ne peut pas être retravaillée. Essaie avec une autre : visage bien visible, cadrage simple.";
    if (cause.raison === "photo_enhance_unavailable")
      return "L'amélioration est indisponible pour le moment. Réessaie dans quelques minutes.";
    if (cause.raison === "portrait_quota_exceeded") {
      const retour =
        typeof cause.details.resets_at === "string"
          ? dateDeRetour(cause.details.resets_at)
          : "le mois prochain";
      return cause.details.subscriber === true
        ? `Tu as atteint la limite d'usage raisonnable des portraits ce mois-ci. Les prochains ${retour}.`
        : `Tu as utilisé tes portraits du mois. Les prochains ${retour}. Ta photo actuelle reste un très bon choix.`;
    }
    if (cause.raison === "photo_missing")
      return "Ajoute d'abord une photo, puis Karria pourra la retravailler.";
    if (cause.raison === "cv_not_found")
      return "Ton CV n'existe plus : crée-le ou importe-le d'abord.";
  }
  return "Je n'ai pas pu retravailler ta photo. Réessaie.";
}
