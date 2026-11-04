/**
 * L'import d'un CV : ce que l'on dit quand il échoue, et ce que l'on
 * raconte quand il réussit.
 *
 * ═══ Chaque refus dit quoi faire ═══
 *
 * `POST /cv/import` (`docs/contrat-api-cv.md`) refuse un document pour des
 * raisons précises, et chacune appelle un geste différent de l'utilisateur :
 * changer de format, choisir un fichier plus léger, en envoyer une version
 * plus courte, reprendre une photo plus nette. Un « Import impossible »
 * générique les confondrait toutes, et la personne réessaierait le même
 * fichier.
 *
 * La panne du modèle (`503`) et la panne réseau, elles, ne dépendent pas
 * du fichier : on le dit, pour qu'elle réessaie **sans** le changer.
 *
 * ═══ Les notes de lecture ne racontent que le vrai ═══
 *
 * `lignesDeLecture` tire ses phrases du compte rendu du serveur (`retenus`,
 * `ecartes`, `manquants`) et du CV écrit — jamais d'une liste de phrases
 * d'attente. « 4 expériences trouvées » n'apparaît que si quatre
 * expériences ont été écrites ; « Pas de téléphone trouvé » que si le
 * serveur le dit. Une rubrique vide n'est pas tue : on le dit aussi.
 */

import { ErreurApi } from "@/lib/http";

import type { ChampManquant, Cv, ResultatImport } from "../types/cv.types";

/** Les types de document que le serveur accepte — les mêmes que ceux
 *  proposés par le sélecteur, pour ne jamais refuser après coup ce que
 *  l'on a laissé choisir. */
export const TYPES_ACCEPTES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
] as const;

/** Autant de photos de pages qu'un CV compte de pages, au plus. */
export const PAGES_MAX = 10;

const MESSAGES: Record<string, string> = {
  document_type_unsupported:
    "Ce format n'est pas lu. Envoie ton CV en PDF, en Word (.docx) ou en photo.",
  document_too_large:
    "Ce fichier est trop lourd (10 Mo au plus). Exporte-le en PDF plus léger, ou prends-le en photo.",
  document_too_many_pages:
    "Ce document fait plus de 10 pages : ce n'est sans doute pas ton CV. Choisis le bon fichier.",
  document_pages_must_be_images:
    "Plusieurs fichiers ne s'envoient qu'en photos, une par page. Pour un PDF ou un Word, choisis un seul fichier.",
  document_empty:
    "Je n'ai rien trouvé à lire dans ce fichier. S'il s'agit d'un scan, essaie une photo plus nette.",
  document_unreadable:
    "Ce fichier ne s'ouvre pas. Réenregistre ton CV en PDF, ou reprends la photo bien à plat.",
  document_not_a_cv:
    "Je n'ai trouvé ni nom, ni expérience, ni formation dans ce document. Vérifie que c'est bien ton CV, ou prends une photo plus nette.",
};

/** Le message à afficher pour une cause d'échec d'import. */
export function messageDImport(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau) {
      return "Pas de connexion. Ton fichier n'est pas parti : réessaie quand le réseau sera là.";
    }
    const precis = cause.raison === undefined ? undefined : MESSAGES[cause.raison];
    if (precis !== undefined) return precis;
    if (cause.statut === 503) {
      return "Karria n'arrive pas à lire les CV pour le moment. Réessaie dans quelques minutes, ou crée ton CV de zéro.";
    }
  }
  return "Ton CV n'a pas pu être importé. Réessaie, ou crée-le de zéro.";
}

function pluriel(n: number, singulier: string, pluriel: string): string {
  return `${n} ${n > 1 ? pluriel : singulier}`;
}

/** « chez Zara, Carrefour et Lidl » — les trois premières entreprises, dans l'ordre du CV. */
function chez(cv: Cv): string {
  const noms = [
    ...new Set(cv.experiences.map((e) => e.entreprise.trim()).filter(Boolean)),
  ];
  const tetes = noms.slice(0, 3);
  if (tetes.length === 0) return "";
  const liste =
    tetes.length === 1
      ? tetes[0]
      : `${tetes.slice(0, -1).join(", ")} et ${tetes[tetes.length - 1]}`;
  return noms.length > 3 ? `${liste}…` : liste;
}

/**
 * Les notes de lecture, dans l'ordre où Karria les dit. Chaque ligne vient
 * du compte rendu réel : rien n'est inventé, rien n'est tu.
 */
export function lignesDeLecture(resultat: ResultatImport): string[] {
  const { cv, retenus, ecartes, manquants } = resultat;
  const lignes: string[] = [];

  if (cv.identite !== null) {
    const nom = `${cv.identite.prenom} ${cv.identite.nom}`.trim();
    lignes.push(cv.identite.titre ? `${nom} — ${cv.identite.titre}.` : `${nom}.`);
  } else {
    lignes.push("Je n'ai pas trouvé ton nom.");
  }

  const entreprises = chez(cv);
  if (cv.experiences.length > 0) {
    const compte = pluriel(
      cv.experiences.length,
      "expérience trouvée",
      "expériences trouvées",
    );
    // « … » tient lieu de point quand la liste est abrégée.
    const fin = entreprises.endsWith("…") ? "" : ".";
    lignes.push(
      entreprises === "" ? `${compte}.` : `${compte}, chez ${entreprises}${fin}`,
    );
  } else {
    lignes.push("Aucune expérience trouvée.");
  }

  lignes.push(
    cv.formations.length > 0
      ? `${pluriel(cv.formations.length, "formation", "formations")}.`
      : "Aucune formation trouvée.",
  );

  const competences = retenus.skills ?? cv.competences.length;
  const langues = retenus.languages ?? cv.langues.length;
  if (competences > 0 || langues > 0) {
    const morceaux = [
      competences > 0 ? pluriel(competences, "compétence", "compétences") : null,
      langues > 0 ? pluriel(langues, "langue", "langues") : null,
    ].filter((m): m is string => m !== null);
    lignes.push(`${morceaux.join(" et ")}.`);
  } else {
    lignes.push("Aucune compétence trouvée.");
  }

  if (cv.presentation) lignes.push("Ton « à propos » est repris.");

  const ecartesTotal = Object.values(ecartes).reduce<number>(
    (somme, n) => somme + (n ?? 0),
    0,
  );
  if (ecartesTotal > 0) {
    lignes.push(
      `${pluriel(ecartesTotal, "élément illisible écarté", "éléments illisibles écartés")}.`,
    );
  }

  const coordonnees = manquants.filter((m) => m.startsWith("contact."));
  if (coordonnees.length > 0) lignes.push(`${manqueLisible(coordonnees)}.`);

  return lignes;
}

const LIBELLES: Record<ChampManquant, string> = {
  "contact.phone": "téléphone",
  "contact.email": "e-mail",
  "contact.city": "ville",
  identity: "nom",
  "identity.headline": "poste visé",
  summary: "à propos",
  experiences: "expériences",
  "experiences.dates": "dates des expériences",
  educations: "formations",
  "educations.dates": "dates des formations",
  skills: "compétences",
};

/** « Pas de téléphone ni d'e-mail trouvé » — ce qui manque, en une phrase. */
export function manqueLisible(manquants: ChampManquant[]): string {
  const mots = manquants.map((m) => LIBELLES[m]);
  if (mots.length === 0) return "";
  if (mots.length === 1) return `Pas de ${mots[0]} trouvé`;
  return `Pas de ${mots.slice(0, -1).join(", ")} ni de ${mots[mots.length - 1]} trouvés`;
}

const PASTILLES: Record<ChampManquant, string> = {
  "contact.phone": "Téléphone manquant",
  "contact.email": "E-mail manquant",
  "contact.city": "Ville manquante",
  identity: "Nom à renseigner",
  "identity.headline": "Poste visé manquant",
  summary: "À propos à écrire",
  experiences: "Aucune expérience",
  "experiences.dates": "Dates manquantes",
  educations: "Aucune formation",
  "educations.dates": "Dates manquantes",
  skills: "Aucune compétence",
};

/** Le libellé court d'un champ manquant, pour une pastille. */
export function libelleManquant(manquant: ChampManquant): string {
  return PASTILLES[manquant];
}
