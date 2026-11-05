/**
 * Annuler / rétablir : une pile d'états, bornée.
 *
 * ═══ Des instantanés, pas des deltas ═══
 *
 * Un CV pèse quelques dizaines de kilo-octets ; cinquante instantanés en
 * mémoire restent légers, et un instantané se rétablit sans rejouer quoi
 * que ce soit — là où un journal de deltas se trompe à la première
 * réorganisation de liste. Pur : l'état est une valeur, chaque geste rend
 * un nouvel historique.
 */

export interface Historique<T> {
  present: T;
  passe: T[];
  futur: T[];
}

export const PROFONDEUR_MAX = 50;

export function historiqueDe<T>(present: T): Historique<T> {
  return { present, passe: [], futur: [] };
}

/** Un nouvel état : le présent passe dans le passé, le futur s'efface. */
export function pousser<T>(h: Historique<T>, suivant: T): Historique<T> {
  const passe = [...h.passe, h.present];
  return {
    present: suivant,
    passe:
      passe.length > PROFONDEUR_MAX ? passe.slice(passe.length - PROFONDEUR_MAX) : passe,
    futur: [],
  };
}

export function annuler<T>(h: Historique<T>): Historique<T> {
  const precedent = h.passe[h.passe.length - 1];
  if (precedent === undefined) return h;
  return {
    present: precedent,
    passe: h.passe.slice(0, -1),
    futur: [h.present, ...h.futur],
  };
}

export function retablir<T>(h: Historique<T>): Historique<T> {
  const [suivant, ...reste] = h.futur;
  if (suivant === undefined) return h;
  return { present: suivant, passe: [...h.passe, h.present], futur: reste };
}

export function peutAnnuler<T>(h: Historique<T>): boolean {
  return h.passe.length > 0;
}

export function peutRetablir<T>(h: Historique<T>): boolean {
  return h.futur.length > 0;
}
