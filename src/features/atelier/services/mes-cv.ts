/**
 * « Mes CV » : ce qu'on y montre, et dans quel ordre.
 *
 * ═══ Sans dossier, côté app ═══
 *
 * `GET /cv/me/generated-cvs?kind=cv` rend **tous** les exports de CV, ceux
 * des dossiers de candidature compris ; le contrat (`contrat-api-documents.md`
 * § 2) filtre par `dossier_id` donné, pas par « sans dossier ». Les CV
 * génériques — créés dans l'atelier libre, avec le modèle de son choix — sont
 * donc gardés ici, par `dossierId === null`. Les CV adaptés à une offre
 * restent dans leur dossier (onglet Candidatures) : un CV ne se montre qu'à
 * un endroit.
 *
 * ═══ Le plus récent d'abord ═══
 *
 * On revient dans « Mes CV » pour le dernier qu'on a fait : il est en tête.
 */

import { dateCourte } from "@/features/candidatures/services/presentation";

import type { Export } from "../types/atelier.types";

export const TEXTES_MES_CV = {
  titreApercu: "Mon CV",
  titre: "Mes CV",
  nouveau: "Nouveau CV",
  retour: "Mon CV",
  videTitre: "Ton premier CV mis en page",
  videPhrase:
    "Choisis un modèle, retouche ce que tu veux, et récupère un PDF prêt à envoyer. Ton CV de base reste tel quel.",
  inviteePhrase: "Connecte-toi pour retrouver les CV que tu as mis en page.",
  seConnecter: "Se connecter",
  sansCvTitre: "Il te faut d'abord un CV",
  ouvrir: "Ouvrir",
  envoyer: "Envoyer par e-mail",
  supprimer: "Supprimer",
  supprimerTitre: "Supprimer ce CV ?",
  supprimerPhrase: "Le PDF et le Word seront effacés. Ton CV de base n'est pas touché.",
  annuler: "Annuler",
  envoye: "Envoyé",
  erreurLecture: "Tes CV n'ont pas pu être chargés.",
  erreurReseau: "Pas de connexion. Tes CV reviennent dès que le réseau est là.",
  // Un titre court et une phrase, comme les autres alertes de l'application :
  // Android coupe un titre d'alerte à deux lignes (« Réessaie dans un ins… »,
  // vu sur l'émulateur le 2026-11-05), iOS le laissait filer.
  erreurSuppression: "Ce CV n'a pas pu être supprimé",
  erreurTelechargement: "Le fichier n'a pas pu être enregistré",
  reessayer: "Réessaie dans un instant.",
  apercuIndisponible: "L'aperçu n'est pas disponible pour ce CV.",
} as const;

/** Les exports sans dossier, du plus récent au plus ancien. */
export function exportsLibres(exports: readonly Export[]): Export[] {
  return exports
    .filter((e) => e.genre === "cv" && e.dossierId === null)
    .sort((a, b) => b.creeLe.localeCompare(a.creeLe));
}

/** « Créé hier », « Créé le 3 nov. » — la ligne de date d'une carte. */
export function ligneDeCreation(exporte: Export, maintenant: Date): string {
  const quand = dateCourte(exporte.creeLe, maintenant);
  return quand === null ? "Créé" : `Créé ${quand}`;
}

/** « 1 CV », « 3 CV » — le sous-titre de l'écran ; vide : l'invitation. */
export function sousTitreDesCv(nombre: number): string {
  if (nombre === 0) return "Tes CV mis en page, prêts à envoyer";
  return `${nombre} CV mis en page`;
}

/** Le nom du modèle, ou ce qu'on dit quand il n'est plus publié. */
export function libelleDuModele(exporte: Export): string {
  return exporte.modele?.libelle ?? "Modèle retiré";
}
