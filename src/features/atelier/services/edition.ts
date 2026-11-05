/**
 * Écrire une section modifiée dans le CV du dossier.
 *
 * Les formulaires du CV travaillent par section (`ValeurSection`) ; le
 * dossier, lui, porte un CV entier. Ces deux fonctions font le pont, sans
 * réseau : une section → un nouveau CV ; un élément de liste → un nouveau
 * CV. Le hook de l'atelier enchaîne : patch local, rendu au repos, PUT
 * différé. Les règles de validation restent celles du domaine `cv`.
 */

import type { ValeurSection } from "@/features/cv/hooks/use-modifier-cv";
import type { Cv, Experience, Formation } from "@/features/cv/types/cv.types";

export function cvAvecSection(cv: Cv, v: ValeurSection): Cv {
  switch (v.section) {
    case "identity":
      return { ...cv, identite: v.valeur };
    case "contact":
      return {
        ...cv,
        contact: {
          ...v.valeur,
          // Une ligne de lien laissée vide n'est pas un lien.
          liens: v.valeur.liens.filter(
            (l) => l.libelle.trim() !== "" || l.url.trim() !== "",
          ),
        },
      };
    case "summary":
      return {
        ...cv,
        presentation: v.valeur.texte.trim() === "" ? null : v.valeur.texte.trim(),
      };
    case "experiences":
      return { ...cv, experiences: v.valeur };
    case "educations":
      return { ...cv, formations: v.valeur };
    case "skills":
      return { ...cv, competences: v.valeur.competences, langues: v.valeur.langues };
    case "interests":
      return { ...cv, interets: v.valeur.interets };
    case "photo":
      return cv;
  }
}

/** Remplace (ou ajoute, `index` hors liste) un élément d'une liste. */
export function cvAvecElement(
  cv: Cv,
  section: "experiences" | "educations",
  index: number,
  element: Experience | Formation,
): Cv {
  if (section === "experiences" && "poste" in element) {
    const liste = [...cv.experiences];
    if (index >= 0 && index < liste.length) liste[index] = element;
    else liste.push(element);
    return { ...cv, experiences: liste };
  }
  if (section === "educations" && "diplome" in element) {
    const liste = [...cv.formations];
    if (index >= 0 && index < liste.length) liste[index] = element;
    else liste.push(element);
    return { ...cv, formations: liste };
  }
  return cv;
}

export function cvAvecIntitule(cv: Cv, titre: string): Cv {
  const propre = titre.trim();
  return {
    ...cv,
    identite: {
      ...(cv.identite ?? { prenom: "", nom: "", titre: null }),
      titre: propre === "" ? null : propre,
    },
  };
}
