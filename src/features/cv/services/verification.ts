/**
 * Ce qu'il reste à vérifier sur le CV après un import.
 *
 * ═══ Pourquoi un store, et pas un champ du CV ═══
 *
 * Le serveur dit, à l'import, ce qu'il n'a pas trouvé (`manquants`). Ce
 * qu'il ne sait pas, c'est si la personne a **relu** ses coordonnées, ses
 * expériences et ses formations — c'est une affaire d'écran, pas de
 * donnée. On la garde ici, en mémoire, le temps de la session : rouvrir
 * l'app repart d'un CV « normal », et ce qui manque vraiment (pas de
 * téléphone) se voit de toute façon, calculé depuis le CV lui-même
 * (`manquantsDuCv`).
 *
 * Une section cesse d'être « à vérifier » quand on ouvre son écran de
 * modification — qu'on y change quelque chose ou non : l'avoir regardée,
 * c'est l'avoir vérifiée.
 *
 * Même motif que les autres stores de l'app : instantané stable pour
 * `useSyncExternalStore` (un objet neuf à chaque lecture ferait boucler le
 * rendu — constaté le 2026-10-30).
 */

import { useSyncExternalStore } from "react";

import type { ChampManquant, CleChapitre, Cv } from "../types/cv.types";

/** Les sections à relire après un import, dans l'ordre où Karria les demande :
 *  les coordonnées d'abord, puis les expériences et les formations. */
export const SECTIONS_A_VERIFIER: readonly CleChapitre[] = [
  "contact",
  "experiences",
  "educations",
];

export interface Verification {
  /** Vrai entre l'import et la première relecture complète. */
  importRecent: boolean;
  aVerifier: readonly CleChapitre[];
}

const RIEN: Verification = { importRecent: false, aVerifier: [] };

let etat: Verification = RIEN;
const abonnes = new Set<() => void>();

function publier(suivant: Verification): void {
  etat = suivant;
  for (const a of abonnes) a();
}

/** Après un import réussi : tout est à vérifier, coordonnées en tête. */
export function marquerImporte(): void {
  publier({ importRecent: true, aVerifier: SECTIONS_A_VERIFIER });
}

/** Une section a été ouverte pour modification : elle est vérifiée. */
export function marquerVerifie(section: CleChapitre): void {
  if (!etat.aVerifier.includes(section)) return;
  const reste = etat.aVerifier.filter((s) => s !== section);
  publier({ importRecent: reste.length > 0, aVerifier: reste });
}

/** « C'est bon » : la personne a relu, on n'insiste plus. */
export function effacerVerification(): void {
  publier(RIEN);
}

export function useVerification(): Verification {
  return useSyncExternalStore(
    (rappel) => {
      abonnes.add(rappel);
      return () => abonnes.delete(rappel);
    },
    () => etat,
    () => etat,
  );
}

/**
 * Ce qui manque au CV, calculé depuis le CV : même règle que le serveur
 * (`CurriculumVitae.missing_fields`), pour que la pastille « Téléphone
 * manquant » reste juste après une modification, sans attendre un import.
 */
export function manquantsDuCv(cv: Cv): ChampManquant[] {
  const manquants: ChampManquant[] = [];
  if (cv.contact === null || !cv.contact.telephone) manquants.push("contact.phone");
  if (cv.contact === null || !cv.contact.email) manquants.push("contact.email");
  if (cv.contact === null || !cv.contact.ville) manquants.push("contact.city");
  if (cv.identite === null) manquants.push("identity");
  else if (!cv.identite.titre) manquants.push("identity.headline");
  if (!cv.presentation) manquants.push("summary");
  if (cv.experiences.length === 0) manquants.push("experiences");
  else if (cv.experiences.some((e) => e.debut === null))
    manquants.push("experiences.dates");
  if (cv.formations.length === 0) manquants.push("educations");
  else if (cv.formations.some((f) => f.debut === null && f.fin === null)) {
    manquants.push("educations.dates");
  }
  if (cv.competences.length === 0) manquants.push("skills");
  return manquants;
}

/** La section à laquelle un champ manquant appartient. */
export function sectionDuManquant(manquant: ChampManquant): CleChapitre {
  if (manquant.startsWith("contact.")) return "contact";
  if (manquant.startsWith("identity")) return "identity";
  if (manquant.startsWith("experiences")) return "experiences";
  if (manquant.startsWith("educations")) return "educations";
  if (manquant === "skills") return "skills";
  return "summary";
}
