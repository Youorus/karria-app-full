/**
 * Ce que l'on dit quand l'import d'un CV échoue.
 *
 * ═══ Chaque refus dit quoi faire ═══
 *
 * `POST /cv/import` (`docs/contrat-api-cv.md`) refuse un document pour
 * cinq raisons précises, et chacune appelle un geste différent de
 * l'utilisateur : changer de format, choisir un fichier plus léger, en
 * envoyer une version plus courte, ou renoncer à un scan illisible. Un
 * « Import impossible » générique les confondrait toutes, et la personne
 * réessaierait le même fichier.
 *
 * La panne du modèle (`503`) et la panne réseau, elles, ne dépendent pas
 * du fichier : on le dit, pour qu'elle réessaie **sans** le changer.
 */

import { ErreurApi } from "@/lib/http";

/** Les types de document que le serveur accepte — les mêmes que ceux
 *  proposés par le sélecteur, pour ne jamais refuser après coup ce que
 *  l'on a laissé choisir. */
export const TYPES_ACCEPTES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/*",
] as const;

const MESSAGES: Record<string, string> = {
  document_type_unsupported:
    "Ce format n'est pas lu. Envoie ton CV en PDF, en Word (.docx) ou en photo.",
  document_too_large:
    "Ce fichier est trop lourd (10 Mo au plus). Exporte-le en PDF plus léger, ou prends-le en photo.",
  document_too_many_pages:
    "Ce document fait plus de 10 pages : ce n'est sans doute pas ton CV. Choisis le bon fichier.",
  document_empty:
    "Je n'ai rien trouvé à lire dans ce fichier. S'il s'agit d'un scan, essaie une photo plus nette.",
  document_unreadable:
    "Ce fichier ne s'ouvre pas. Réenregistre ton CV en PDF, puis réessaie.",
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
      return "Karria n'arrive pas à lire les CV pour le moment. Réessaie dans quelques minutes, ou commence en parlant.";
    }
  }
  return "Ton CV n'a pas pu être importé. Réessaie, ou commence en parlant.";
}
