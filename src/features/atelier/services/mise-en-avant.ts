/**
 * La mise en avant : l'ordre des éléments, et ce qu'on montre ou cache.
 *
 * ═══ Ce que l'API porte, et ce qu'elle ne porte pas ═══
 *
 * Le CV d'un dossier (`PUT /applications/{id}/cv`) est une liste par
 * rubrique : **l'ordre des éléments** y vit tel quel — monter une
 * expérience, c'est la déplacer dans la liste envoyée. L'ordre des
 * **rubriques**, lui, n'existe pas dans le contrat : c'est le modèle qui le
 * fixe (ADR-0020, vue par rôle). L'atelier ne le propose donc pas, et le dit.
 *
 * ═══ Masquer, c'est retirer de la copie ═══
 *
 * Un dossier est une **copie** du CV de base. Masquer une expérience, c'est
 * la retirer de cette copie — le CV de base n'y perd rien. « Montrer » la
 * reprend du CV de base, à la place qu'elle y occupe. Un élément masqué
 * perd donc la retouche faite dans le dossier ; c'est le prix d'un contrat
 * sans champ « caché », et c'est écrit dans la feuille.
 *
 * Les éléments se reconnaissent par une clé stable (poste + entreprise +
 * début…), pas par leur index : l'index bouge dès qu'on réordonne.
 */

import type {
  Competence,
  Cv,
  Experience,
  Formation,
  Interet,
  Langue,
} from "@/features/cv/types/cv.types";

export type RubriqueEnListe =
  "experiences" | "formations" | "competences" | "langues" | "interets";

export const RUBRIQUES: readonly RubriqueEnListe[] = [
  "experiences",
  "formations",
  "competences",
  "langues",
  "interets",
];

export const LIBELLES_RUBRIQUES: Record<RubriqueEnListe, string> = {
  experiences: "Expériences",
  formations: "Formations",
  competences: "Compétences",
  langues: "Langues",
  interets: "Centres d'intérêt",
};

type Element = Experience | Formation | Competence | Langue | Interet;

function liste(cv: Cv, rubrique: RubriqueEnListe): Element[] {
  return cv[rubrique];
}

function avecListe(cv: Cv, rubrique: RubriqueEnListe, elements: Element[]): Cv {
  // Les listes ont chacune leur type ; l'appelant ne mélange jamais les
  // rubriques, d'où le passage par `unknown` sur une seule ligne.
  return { ...cv, [rubrique]: elements as unknown as Cv[typeof rubrique] };
}

/** Une clé stable d'un élément, indépendante de sa place. */
export function cleDe(e: Element): string {
  if ("poste" in e) return `exp:${e.poste}|${e.entreprise}|${e.debut ?? ""}`;
  if ("diplome" in e) return `for:${e.diplome}|${e.ecole}|${e.debut ?? ""}`;
  if ("langue" in e) return `lan:${e.langue}`;
  if ("categorie" in e) return `int:${e.nom}`;
  return `com:${e.nom}`;
}

/** Comment nommer un élément dans la feuille. */
export function libelleDe(e: Element): string {
  if ("poste" in e)
    return [e.poste, e.entreprise].filter(Boolean).join(" · ") || "Expérience";
  if ("diplome" in e)
    return [e.diplome, e.ecole].filter(Boolean).join(" · ") || "Formation";
  if ("langue" in e) return e.langue;
  return e.nom;
}

export function deplacerElement(
  cv: Cv,
  rubrique: RubriqueEnListe,
  index: number,
  vers: number,
): Cv {
  const elements = [...liste(cv, rubrique)];
  if (index < 0 || index >= elements.length || vers < 0 || vers >= elements.length)
    return cv;
  const [element] = elements.splice(index, 1);
  elements.splice(vers, 0, element);
  return avecListe(cv, rubrique, elements);
}

export function masquerElement(cv: Cv, rubrique: RubriqueEnListe, index: number): Cv {
  const elements = liste(cv, rubrique).filter((_, i) => i !== index);
  return avecListe(cv, rubrique, elements);
}

/** Les éléments du CV de base absents de la copie : ceux qu'on a masqués. */
export function elementsMasques(
  base: Cv,
  copie: Cv,
  rubrique: RubriqueEnListe,
): Element[] {
  const presents = new Set(liste(copie, rubrique).map(cleDe));
  return liste(base, rubrique).filter((e) => !presents.has(cleDe(e)));
}

/**
 * Remet un élément masqué dans la copie, à la place qu'il occupe dans le
 * CV de base (juste après le dernier élément de base qui le précède et
 * qui est encore dans la copie).
 */
export function montrerElement(
  base: Cv,
  copie: Cv,
  rubrique: RubriqueEnListe,
  cle: string,
): Cv {
  const deBase = liste(base, rubrique);
  const element = deBase.find((e) => cleDe(e) === cle);
  if (element === undefined) return copie;
  const copies = liste(copie, rubrique);
  if (copies.some((e) => cleDe(e) === cle)) return copie;
  const rangDeBase = deBase.indexOf(element);
  const clesAvant = new Set(deBase.slice(0, rangDeBase).map(cleDe));
  let position = 0;
  copies.forEach((e, i) => {
    if (clesAvant.has(cleDe(e))) position = i + 1;
  });
  const elements = [...copies];
  elements.splice(position, 0, element);
  return avecListe(copie, rubrique, elements);
}
