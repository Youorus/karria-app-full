/**
 * Ce qui doit être vrai avant d'envoyer une section du CV au serveur.
 *
 * ═══ Pourquoi valider ici alors que le serveur revalide ═══
 *
 * Le serveur a le dernier mot (`422 chapter_invalid`), mais un aller-retour
 * pour apprendre qu'une date de fin précède le début, c'est une seconde de
 * perdue et une erreur affichée loin du geste. Ici, l'erreur apparaît sous
 * le champ pendant qu'on tape, et le bouton reste bloqué tant que c'est
 * incohérent. Les règles sont celles du serveur (`domain/schemas.py` de
 * l'API) : mêmes formats, mêmes bornes — on ne refuse rien qu'il
 * accepterait.
 *
 * ═══ Deux natures d'erreur ═══
 *
 * - **requis** : il manque quelque chose (un prénom, une entreprise). On ne
 *   le reproche pas à quelqu'un qui n'a pas encore commencé à taper : ces
 *   erreurs s'affichent à la première tentative d'enregistrement.
 * - **incohérent** : ce qui est là ne va pas (fin avant début, e-mail sans
 *   arobase). On le montre tout de suite, et ça bloque le bouton.
 *
 * Pur : des valeurs en entrée, des erreurs en sortie. La date du jour se
 * passe en paramètre pour que les tests ne dépendent pas de l'horloge.
 */

import type { ValeurSection } from "../hooks/use-modifier-cv";
import type { CleChapitre, Experience, Formation, Lien } from "../types/cv.types";

export type NatureErreur = "requis" | "incoherent";

export interface ErreurChamp {
  /** La clé du champ dans le formulaire (`prenom`, `fin`, `liens.0.url`). */
  champ: string;
  message: string;
  nature: NatureErreur;
}

/** Avant, ce n'est plus une date de CV, c'est une faute de frappe. */
export const ANNEE_MIN = 1950;
export const MISSIONS_MAX = 15;
export const MISSION_LONGUEUR_MAX = 300;
export const PRESENTATION_LONGUEUR_MAX = 1500;
export const TITRE_LONGUEUR_MAX = 150;
export const LIENS_MAX = 10;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
/** Un schéma quelconque en tête (`https:`, `javascript:`, `mailto:`). */
const SCHEMA = /^[a-z][a-z0-9+.-]*:/i;
/** `linkedin.com/in/awa`, `https://awa.fr/cv` : un domaine avec un point. */
const ADRESSE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

const requis = (champ: string, message: string): ErreurChamp => ({
  champ,
  message,
  nature: "requis",
});
const incoherent = (champ: string, message: string): ErreurChamp => ({
  champ,
  message,
  nature: "incoherent",
});

function vide(texte: string | null | undefined): boolean {
  return (texte ?? "").trim() === "";
}

// ─────────────────────────────────────────────────────────────────────
// Les formats
// ─────────────────────────────────────────────────────────────────────

export function emailValide(email: string): boolean {
  return EMAIL.test(email.trim());
}

/** Six à quinze chiffres, avec ce qu'on tape autour : `+33 6 12 34 56 78`, `06.12.34.56.78`. */
export function telephoneValide(telephone: string): boolean {
  const propre = telephone.trim();
  if (!/^\+?[\d\s().-]+$/.test(propre)) return false;
  const chiffres = propre.replace(/\D/g, "").length;
  return chiffres >= 6 && chiffres <= 15;
}

/** Un lien http(s), le schéma pouvant manquer — jamais `javascript:` ni `mailto:`. */
export function urlValide(url: string): boolean {
  const propre = url.trim();
  if (propre === "") return false;
  if (SCHEMA.test(propre) && !/^https?:\/\//i.test(propre)) return false;
  return ADRESSE.test(propre);
}

// ─────────────────────────────────────────────────────────────────────
// Les dates (`AAAA-MM` ou `AAAA`)
// ─────────────────────────────────────────────────────────────────────

function moisCourant(aujourdHui: Date): string {
  return `${aujourdHui.getFullYear()}-${String(aujourdHui.getMonth() + 1).padStart(2, "0")}`;
}

/** `AAAA` seul vaut janvier pour un début, décembre pour une fin : on ne
 *  reproche pas à « 2021 – 2021-03 » d'être à l'envers. */
function borne(date: string, role: "debut" | "fin"): string {
  return date.length === 4 ? `${date}-${role === "debut" ? "01" : "12"}` : date;
}

function annee(date: string): number {
  return Number(date.slice(0, 4));
}

/** `AAAA` seul est dans le futur quand l'année l'est ; `AAAA-MM` quand le mois l'est. */
function dansLeFutur(date: string, aujourdHui: Date): boolean {
  return date.length === 4
    ? annee(date) > aujourdHui.getFullYear()
    : date > moisCourant(aujourdHui);
}

function validerPeriode(
  debut: string | null,
  fin: string | null,
  enCours: boolean,
  aujourdHui: Date,
  messages: { finFuture: string },
): ErreurChamp[] {
  const erreurs: ErreurChamp[] = [];
  if (debut !== null) {
    if (annee(debut) < ANNEE_MIN) {
      erreurs.push(incoherent("debut", "Cette date semble trop ancienne."));
    } else if (dansLeFutur(debut, aujourdHui)) {
      erreurs.push(incoherent("debut", "Le début est dans le futur."));
    }
  }
  if (!enCours && fin !== null) {
    if (annee(fin) < ANNEE_MIN) {
      erreurs.push(incoherent("fin", "Cette date semble trop ancienne."));
    } else if (dansLeFutur(fin, aujourdHui)) {
      erreurs.push(incoherent("fin", messages.finFuture));
    } else if (debut !== null && borne(fin, "fin") < borne(debut, "debut")) {
      erreurs.push(incoherent("fin", "La fin est avant le début."));
    }
  }
  return erreurs;
}

// ─────────────────────────────────────────────────────────────────────
// Les éléments de liste
// ─────────────────────────────────────────────────────────────────────

export function validerExperience(e: Experience, aujourdHui = new Date()): ErreurChamp[] {
  const erreurs: ErreurChamp[] = [];
  if (vide(e.poste)) erreurs.push(requis("poste", "Le poste est nécessaire."));
  if (vide(e.entreprise))
    erreurs.push(requis("entreprise", "L'entreprise est nécessaire."));
  erreurs.push(
    ...validerPeriode(e.debut, e.fin, e.enCours, aujourdHui, {
      finFuture:
        "La fin est dans le futur : coche « J'y travaille encore » si ça continue.",
    }),
  );
  if (e.missions.length > MISSIONS_MAX) {
    erreurs.push(incoherent("missions", `${MISSIONS_MAX} missions au plus.`));
  } else if (e.missions.some((m) => m.length > MISSION_LONGUEUR_MAX)) {
    erreurs.push(
      incoherent("missions", `Une mission tient en ${MISSION_LONGUEUR_MAX} caractères.`),
    );
  }
  return erreurs;
}

export function validerFormation(f: Formation, aujourdHui = new Date()): ErreurChamp[] {
  const erreurs: ErreurChamp[] = [];
  if (vide(f.diplome)) erreurs.push(requis("diplome", "Le diplôme est nécessaire."));
  if (vide(f.ecole)) erreurs.push(requis("ecole", "L'établissement est nécessaire."));
  erreurs.push(
    ...validerPeriode(f.debut, f.fin, f.enCours, aujourdHui, {
      finFuture: "L'obtention est dans le futur : coche « Formation en cours ».",
    }),
  );
  return erreurs;
}

export function validerElement(
  section: CleChapitre,
  element: Experience | Formation,
  aujourdHui = new Date(),
): ErreurChamp[] {
  if (section === "experiences" && "poste" in element) {
    return validerExperience(element, aujourdHui);
  }
  if (section === "educations" && "diplome" in element) {
    return validerFormation(element, aujourdHui);
  }
  return [];
}

// ─────────────────────────────────────────────────────────────────────
// Les sections
// ─────────────────────────────────────────────────────────────────────

function validerLien(lien: Lien, index: number): ErreurChamp[] {
  // Une ligne entièrement vide n'est pas un lien : elle ne part pas, et on
  // ne la reproche pas (`versContenu` la retire).
  if (vide(lien.libelle) && vide(lien.url)) return [];
  const erreurs: ErreurChamp[] = [];
  if (vide(lien.libelle))
    erreurs.push(requis(`liens.${index}.libelle`, "Donne un nom à ce lien."));
  if (vide(lien.url)) {
    erreurs.push(requis(`liens.${index}.url`, "Colle l'adresse du lien."));
  } else if (!urlValide(lien.url)) {
    erreurs.push(
      incoherent(
        `liens.${index}.url`,
        "Ce lien n'a pas l'air valide (ex. : linkedin.com/in/ton-nom).",
      ),
    );
  }
  return erreurs;
}

export function validerSection(v: ValeurSection, aujourdHui = new Date()): ErreurChamp[] {
  const erreurs: ErreurChamp[] = [];
  switch (v.section) {
    case "identity":
      if (vide(v.valeur.prenom))
        erreurs.push(requis("prenom", "Ton prénom est nécessaire."));
      if (vide(v.valeur.nom)) erreurs.push(requis("nom", "Ton nom est nécessaire."));
      if ((v.valeur.titre ?? "").length > TITRE_LONGUEUR_MAX) {
        erreurs.push(incoherent("titre", `${TITRE_LONGUEUR_MAX} caractères au plus.`));
      }
      break;
    case "contact": {
      const { email, telephone, liens } = v.valeur;
      if (vide(email) && vide(telephone)) {
        erreurs.push(
          requis("telephone", "Un téléphone ou un e-mail : il faut pouvoir te joindre."),
        );
      }
      if (!vide(email) && !emailValide(email ?? "")) {
        erreurs.push(incoherent("email", "Cette adresse e-mail n'a pas l'air valide."));
      }
      if (!vide(telephone) && !telephoneValide(telephone ?? "")) {
        erreurs.push(incoherent("telephone", "Ce numéro n'a pas l'air valide."));
      }
      if (liens.length > LIENS_MAX) {
        erreurs.push(incoherent("liens", `${LIENS_MAX} liens au plus.`));
      }
      liens.forEach((lien, i) => erreurs.push(...validerLien(lien, i)));
      break;
    }
    case "summary":
      if (v.valeur.texte.length > PRESENTATION_LONGUEUR_MAX) {
        erreurs.push(
          incoherent(
            "texte",
            `${PRESENTATION_LONGUEUR_MAX.toLocaleString("fr-FR")} caractères au plus.`,
          ),
        );
      }
      break;
    case "experiences":
    case "educations":
      // Chaque élément est validé dans sa feuille (`validerElement`) ; la
      // liste elle-même — déplacer, supprimer — s'enregistre toujours.
      break;
    case "skills":
    case "interests":
    case "photo":
      break;
  }
  return erreurs;
}

// ─────────────────────────────────────────────────────────────────────
// Ce qu'on en montre
// ─────────────────────────────────────────────────────────────────────

/** Vrai si quelque chose d'incohérent bloque l'enregistrement. */
export function estBloque(erreurs: ErreurChamp[]): boolean {
  return erreurs.some((e) => e.nature === "incoherent");
}

/**
 * Les messages par champ : les incohérences toujours, les manques
 * seulement après une tentative. Le premier message d'un champ gagne.
 */
export function messagesDe(
  erreurs: ErreurChamp[],
  { avecRequis }: { avecRequis: boolean },
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const e of erreurs) {
    if (e.nature === "requis" && !avecRequis) continue;
    messages[e.champ] ??= e.message;
  }
  return messages;
}
