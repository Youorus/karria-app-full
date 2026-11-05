/**
 * Modifier **un** élément du CV dans la feuille basse de l'atelier.
 *
 * ═══ Le formulaire existant, limité à la cible ═══
 *
 * Une cible désigne une section, et pour les listes un élément. Le hook
 * tient la valeur en cours de saisie, la juge avec les règles du domaine
 * `cv` (`validation-edition.ts` : les incohérences bloquent tout de suite,
 * les manques à la première tentative), et rend à l'atelier soit une
 * section entière, soit un élément. L'atelier fait le reste : patch, rendu,
 * sauvegarde.
 *
 * La valeur initiale est lue **au montage** : la feuille qui porte ce hook
 * est recréée à chaque nouvelle cible (`key`), donc chaque ouverture part
 * du CV courant, sans effet de synchronisation.
 *
 * ═══ Et Karria propose ═══
 *
 * Si une proposition de Karria vise cet élément (`experiences.0.missions.1`
 * commence par le chemin de la cible), elle s'affiche dans la feuille, avec
 * ses deux boutons. C'est le « Karria propose » de la feuille de route —
 * seulement quand elle a quelque chose à dire.
 */

import { useCallback, useMemo, useState } from "react";

import type { Proposition } from "@/features/candidatures/types/candidatures.types";
import { valeurDuCv, type ValeurSection } from "@/features/cv/hooks/use-modifier-cv";
import {
  estBloque,
  messagesDe,
  validerElement,
  validerSection,
} from "@/features/cv/services/validation-edition";
import type { Cv, Experience, Formation } from "@/features/cv/types/cv.types";

import { cheminDeCible, libelleDeCible, type Cible } from "../services/chemins";

export type ValeurEnEdition =
  | { genre: "section"; valeur: ValeurSection }
  | {
      genre: "element";
      section: "experiences" | "educations";
      index: number;
      valeur: Experience | Formation;
    };

export interface EditionElement {
  titre: string;
  valeur: ValeurEnEdition | null;
  erreurs: Record<string, string>;
  bloque: boolean;
  modifie: boolean;
  changerSection: (v: ValeurSection["valeur"]) => void;
  changerElement: (v: Experience | Formation) => void;
  /** Rend faux (et montre les manques) si l'élément n'est pas prêt. */
  enregistrer: () => boolean;
  /** Les propositions de Karria qui visent cet élément. */
  propositions: Proposition[];
}

function valeurInitiale(cible: Cible, cv: Cv): ValeurEnEdition | null {
  if (cible.section === "experiences") {
    const e = cv.experiences[cible.index];
    return e === undefined
      ? null
      : { genre: "element", section: "experiences", index: cible.index, valeur: e };
  }
  if (cible.section === "educations") {
    const f = cv.formations[cible.index];
    return f === undefined
      ? null
      : { genre: "element", section: "educations", index: cible.index, valeur: f };
  }
  return { genre: "section", valeur: valeurDuCv(cible.section, cv) };
}

/** La clé qui identifie une cible : la feuille se recrée quand elle change. */
export function cleDeCible(cible: Cible | null): string {
  if (cible === null) return "aucune";
  return "index" in cible ? `${cible.section}.${cible.index}` : cible.section;
}

export function useEditionElement(
  cible: Cible | null,
  cv: Cv | null,
  propositions: Proposition[],
  onSection: (v: ValeurSection) => void,
  onElement: (
    section: "experiences" | "educations",
    index: number,
    v: Experience | Formation,
  ) => void,
): EditionElement {
  const [valeur, setValeur] = useState<ValeurEnEdition | null>(() =>
    cible === null || cv === null ? null : valeurInitiale(cible, cv),
  );
  const [modifie, setModifie] = useState(false);
  const [tentative, setTentative] = useState(false);

  const erreursLocales = useMemo(() => {
    if (valeur === null) return [];
    return valeur.genre === "element"
      ? validerElement(valeur.section, valeur.valeur)
      : validerSection(valeur.valeur);
  }, [valeur]);

  const enregistrer = useCallback((): boolean => {
    if (valeur === null) return false;
    if (erreursLocales.length > 0) {
      setTentative(true);
      return false;
    }
    if (valeur.genre === "element")
      onElement(valeur.section, valeur.index, valeur.valeur);
    else onSection(valeur.valeur);
    setModifie(false);
    return true;
  }, [valeur, erreursLocales, onElement, onSection]);

  const changerSection = useCallback((v: ValeurSection["valeur"]) => {
    setValeur((courante) =>
      courante === null || courante.genre !== "section"
        ? courante
        : {
            genre: "section",
            valeur: { section: courante.valeur.section, valeur: v } as ValeurSection,
          },
    );
    setModifie(true);
  }, []);

  const changerElement = useCallback((v: Experience | Formation) => {
    setValeur((courante) =>
      courante === null || courante.genre !== "element"
        ? courante
        : { ...courante, valeur: v },
    );
    setModifie(true);
  }, []);

  const prefixe =
    cible === null
      ? null
      : cheminDeCible(cible)
          .split(".")
          .slice(0, "index" in cible ? 2 : 1)
          .join(".");

  return {
    titre: cible === null || cv === null ? "Modifier" : libelleDeCible(cible, cv),
    valeur,
    erreurs: messagesDe(erreursLocales, { avecRequis: tentative }),
    bloque: estBloque(erreursLocales),
    modifie,
    changerSection,
    changerElement,
    enregistrer,
    propositions:
      prefixe === null
        ? []
        : propositions.filter(
            (p) => p.chemin === prefixe || p.chemin.startsWith(`${prefixe}.`),
          ),
  };
}
