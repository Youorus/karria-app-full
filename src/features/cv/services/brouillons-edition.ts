/**
 * Ce qu'on a tapé dans un formulaire du CV et pas encore enregistré.
 *
 * ═══ Quitter un formulaire ne perd rien ═══
 *
 * Un appel, un retour en arrière par réflexe, un glissement : l'écran de
 * modification se démonte et son état avec. On garde donc, par section, la
 * dernière valeur saisie **non enregistrée** ; rouvrir la section la
 * restitue, et le dit (« Tes modifications non enregistrées sont là »).
 * Enregistrer, ou annuler explicitement, l'efface.
 *
 * En mémoire seulement : c'est la session qui compte. Un brouillon qui
 * survivrait des jours à un formulaire abandonné serait une surprise, pas
 * un service.
 *
 * Le type est volontairement ouvert (`unknown`) : chaque hook de section
 * sait ce qu'il y a rangé, et le relit avec son propre type.
 */

import type { CleChapitre } from "../types/cv.types";

const brouillons = new Map<CleChapitre, unknown>();

export function garderBrouillon(section: CleChapitre, valeur: unknown): void {
  brouillons.set(section, valeur);
}

export function lireBrouillon<T>(section: CleChapitre): T | undefined {
  return brouillons.get(section) as T | undefined;
}

export function oublierBrouillon(section: CleChapitre): void {
  brouillons.delete(section);
}
