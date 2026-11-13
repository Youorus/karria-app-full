/**
 * Tenir sur une page : ce que Karria propose de masquer, dans l'ordre.
 *
 * ═══ La règle (Marc, 2026-11-13) ═══
 *
 * Un CV se lit sur une page ; la seconde n'est jamais propre. Quand la
 * feuille déborde, l'atelier le dit (une alerte, pas un petit « 2 pages »)
 * et propose, dans l'ergonomie de la mise en avant, **les éléments à
 * retirer** — pré-classés du moins coûteux au plus coûteux pour la
 * candidature. Chaque geste s'applique aussitôt et la page derrière le
 * montre : on s'arrête quand elle tient.
 *
 * ═══ L'ordre des propositions ═══
 *
 * 1. les centres d'intérêt au-delà de trois (le recruteur n'en lit pas plus) ;
 * 2. les compétences au-delà de huit ;
 * 3. les langues au-delà de trois ;
 * 4. les formations les plus anciennes au-delà de deux ;
 * 5. les expériences les plus anciennes au-delà de trois — en dernier,
 *    parce que ce sont les faits du parcours.
 *
 * Tout ce qui est masqué reste dans le CV de la personne et se remet d'un
 * geste (« Montrer »). Pure : testable sans écran.
 */

import type { Cv } from "@/features/cv/types/cv.types";

import { cleDe, libelleDe, type RubriqueEnListe } from "./mise-en-avant";

export interface Proposition {
  rubrique: RubriqueEnListe;
  /** L'index dans la liste courante du CV : c'est ce que `masquer` attend. */
  index: number;
  cle: string;
  libelle: string;
  /** « Centre d'intérêt », « Expérience la plus ancienne »… */
  raison: string;
}

const GARDER: Record<RubriqueEnListe, number> = {
  interets: 3,
  competences: 8,
  langues: 3,
  formations: 2,
  experiences: 3,
};

const RAISONS: Record<RubriqueEnListe, string> = {
  interets: "Centre d'intérêt",
  competences: "Compétence",
  langues: "Langue",
  formations: "Formation la plus ancienne",
  experiences: "Expérience la plus ancienne",
};

/** Les rubriques, de la moins coûteuse à la plus coûteuse à masquer. */
const ORDRE: readonly RubriqueEnListe[] = [
  "interets",
  "competences",
  "langues",
  "formations",
  "experiences",
];

function debutDe(e: { debut?: string | null }): string {
  return e.debut ?? "";
}

/**
 * Les éléments à proposer, dans l'ordre où l'on conseille de les masquer.
 * Les listes datées (expériences, formations) partent des plus anciennes ;
 * les autres de la fin, puisque l'ordre y est celui de la mise en avant.
 */
export function propositionsUnePage(cv: Cv): Proposition[] {
  const out: Proposition[] = [];
  for (const rubrique of ORDRE) {
    const elements = cv[rubrique] as readonly { debut?: string | null }[];
    const surplus = elements.length - GARDER[rubrique];
    if (surplus <= 0) continue;
    const indices = elements.map((_, i) => i);
    const candidats =
      rubrique === "experiences" || rubrique === "formations"
        ? [...indices].sort((a, b) =>
            debutDe(elements[a] ?? {}).localeCompare(debutDe(elements[b] ?? {})),
          )
        : [...indices].reverse();
    for (const index of candidats.slice(0, surplus)) {
      const element = cv[rubrique][index];
      if (element === undefined) continue;
      out.push({
        rubrique,
        index,
        cle: cleDe(element),
        libelle: libelleDe(element),
        raison: RAISONS[rubrique],
      });
    }
  }
  return out;
}

/** « Ton CV fait 2 pages » : un fait, pas un reproche. */
export function phraseDepassement(pages: number): string {
  return `Ton CV fait ${pages} pages`;
}

/** « Masque 2 éléments pour tenir sur une page. » — une estimation honnête. */
export function phraseConseil(propositions: number): string {
  if (propositions === 0) {
    return "Rien à masquer ici : raccourcis une mission ou l'à-propos dans « Je modifie », ou garde deux pages.";
  }
  return "Masque un ou deux éléments : la page derrière te dit quand ça tient.";
}
