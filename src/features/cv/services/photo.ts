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
 * Dans les deux cas, l'originale reste un très bon choix.
 */

import { ErreurApi } from "@/lib/http";

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
    if (cause.raison === "photo_missing")
      return "Ajoute d'abord une photo, puis Karria pourra la retravailler.";
    if (cause.raison === "cv_not_found")
      return "Ton CV n'existe plus : crée-le ou importe-le d'abord.";
  }
  return "Je n'ai pas pu retravailler ta photo. Réessaie.";
}
