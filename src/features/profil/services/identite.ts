/**
 * Qui est la personne, d'après ce qu'on sait d'elle.
 *
 * ═══ L'inscription ne demande rien ═══
 *
 * Pas de nom à l'entrée (AGENTS.md §9). Le profil n'a donc, au départ,
 * qu'une adresse e-mail ; le nom, le métier et la photo arrivent avec le
 * CV, quand il existe. Ces fonctions font le pont : elles tirent le
 * meilleur affichage possible de ce qui est disponible, et ne mentent
 * jamais — pas de « Utilisateur » ni de prénom inventé.
 *
 * ═══ L'état du CV ═══
 *
 * Trois cas, lus par la carte « Mon CV » du profil : rien, un brouillon en
 * cours avec Karria, un CV prêt. C'est la même règle que l'onglet CV
 * (`rempli` = `!cv.vide`), écrite une fois ici pour que les deux onglets
 * ne divergent pas.
 */

import type { Cv } from "@/features/cv/types/cv.types";

export interface Identite {
  /** « Marc Takoumba », ou la partie locale de l'e-mail à défaut. */
  nom: string;
  /** Le métier visé (`headline` du CV), ou `null`. */
  titre: string | null;
  /** Une ou deux lettres pour l'avatar. */
  initiales: string;
  /** La photo du CV, si elle existe. */
  photo: string | null;
}

export function identite(email: string | null, cv: Cv | null): Identite {
  const prenom = cv?.identite?.prenom.trim() ?? "";
  const nom = cv?.identite?.nom.trim() ?? "";
  const complet = `${prenom} ${nom}`.trim();
  const local = email?.split("@")[0]?.trim() ?? "";

  return {
    nom: complet !== "" ? complet : local !== "" ? local : "Toi",
    titre: cv?.identite?.titre?.trim() || null,
    initiales: initiales(prenom, nom, local),
    photo: cv?.photo ?? null,
  };
}

/** « MT » d'un prénom et d'un nom ; sinon la première lettre de l'e-mail ;
 *  sinon « K », pour Karria — jamais une case vide. */
export function initiales(prenom: string, nom: string, local: string): string {
  const lettres = [prenom, nom]
    .map((mot) => mot.trim().charAt(0))
    .filter((l) => l !== "")
    .join("");
  if (lettres !== "") return lettres.toUpperCase();
  const premiere = local.replace(/[^a-z0-9]/gi, "").charAt(0);
  return premiere === "" ? "K" : premiere.toUpperCase();
}

export type EtatDuCv = "absent" | "en-cours" | "pret";

export function etatDuCv(cv: Cv | null, brouillonEnCours: boolean): EtatDuCv {
  if (cv !== null && !cv.vide) return "pret";
  return brouillonEnCours ? "en-cours" : "absent";
}

/** Ce que la carte « Mon CV » dit sous son titre. */
export function resumeDuCv(etat: EtatDuCv, cv: Cv | null): string {
  switch (etat) {
    case "pret": {
      const n = cv?.experiences.length ?? 0;
      return n === 0
        ? "Prêt. Karria l'adapte à chaque offre."
        : `Prêt · ${n} expérience${n > 1 ? "s" : ""}`;
    }
    case "en-cours":
      return "En cours avec Karria — on reprend quand tu veux.";
    case "absent":
      return "Quelques minutes, en parlant. Je l'écris, tu valides.";
  }
}
