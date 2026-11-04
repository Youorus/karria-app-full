/**
 * Les suggestions pour ce qu'on est en train de taper.
 *
 * ═══ Un appel toutes les 200 ms, pas à chaque frappe ═══
 *
 * Taper « Dével » fait cinq frappes en une demi-seconde. Appeler le
 * serveur à chacune, c'est cinq réponses qui arrivent dans un ordre
 * quelconque. On attend donc 200 ms de calme avant d'appeler, et chaque
 * appel porte un numéro : une réponse plus ancienne que la dernière
 * demande est ignorée. Ce qui s'affiche correspond toujours à ce qui est
 * dans le champ.
 *
 * ═══ Une panne ne gêne pas ═══
 *
 * Une suggestion est une aide. Si le serveur ne répond pas, la liste reste
 * vide et la personne continue de taper — on journalise la cause, on
 * n'affiche rien : un message d'erreur sous un champ qui fonctionne
 * serait pire que l'absence de suggestions.
 */

import { useEffect, useRef, useState } from "react";

import { lireSuggestions } from "../api/cv.api";
import type { TypeSuggestion } from "../types/cv.types";

export const DELAI_SUGGESTIONS_MS = 200;

export interface Suggestions {
  suggestions: string[];
  enCours: boolean;
}

/**
 * @param kind ce qu'on complète (poste, ville…)
 * @param texte ce qui est dans le champ
 * @param actif faux quand le champ n'a pas le focus : on n'appelle pas, on n'affiche rien
 */
export function useSuggestions(
  kind: TypeSuggestion,
  texte: string,
  actif: boolean,
): Suggestions {
  // La réponse porte la saisie qui l'a produite : on n'affiche jamais la
  // liste d'une saisie précédente pendant qu'on attend la suivante — et
  // rien n'est posé dans l'état depuis l'effet lui-même.
  const [reponse, setReponse] = useState<{ cle: string; suggestions: string[] } | null>(
    null,
  );
  const [enAttente, setEnAttente] = useState<string | null>(null);
  const derniere = useRef(0);
  const saisie = texte.trim();
  const inactif = !actif || saisie === "";
  const cle = `${kind}|${saisie}`;

  useEffect(() => {
    if (inactif) {
      derniere.current += 1;
      return;
    }
    const numero = ++derniere.current;
    const minuteur = setTimeout(() => {
      setEnAttente(cle);
      lireSuggestions(kind, saisie)
        .then((trouvees) => {
          if (numero !== derniere.current) return;
          setReponse({ cle, suggestions: trouvees });
        })
        .catch((cause: unknown) => {
          if (numero !== derniere.current) return;
          console.warn("[karria] suggestions indisponibles", cause);
          setReponse({ cle, suggestions: [] });
        })
        .finally(() => {
          if (numero === derniere.current) setEnAttente(null);
        });
    }, DELAI_SUGGESTIONS_MS);
    return () => clearTimeout(minuteur);
  }, [kind, saisie, cle, inactif]);

  return {
    suggestions: !inactif && reponse?.cle === cle ? reponse.suggestions : [],
    enCours: !inactif && enAttente === cle,
  };
}
