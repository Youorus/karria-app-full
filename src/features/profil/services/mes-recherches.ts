/**
 * Les mots de l'écran « Mes recherches », et ce qu'il dit sous chaque
 * recherche.
 *
 * ═══ Pourquoi ici ═══
 *
 * Une phrase qui dépend d'une donnée (« Utilisée hier », le plafond, ce
 * que la suppression emporte) est une règle de présentation : elle
 * s'éprouve sans écran. Le libellé de la ligne des paramètres vit ici
 * aussi, parce que Karria le cite en conversation — « rubrique « Mes
 * recherches » » (ADR-0041 de l'API) : les deux doivent rester le même mot.
 */

import type { RechercheEnregistree } from "@/features/assistant/types/recherches-enregistrees.types";
import { dateCourte } from "@/features/candidatures/services/presentation";

export const TEXTES_MES_RECHERCHES = {
  /** Le titre de l'écran **et** le libellé de la ligne des paramètres :
   *  c'est le nom que Karria donne à la rubrique. */
  titre: "Mes recherches",
  detailDeLaLigne: "Ce que Karria surveille pour toi.",
  introduction:
    "Karria surveille ces recherches et te prévient dès qu'une offre correspond.",
  enCours: "Recherche en cours",
  vide: "Tu n'as pas encore de recherche. Dis à Karria ce que tu cherches : elle la gardera ici.",
  parlerAKarria: "Parler à Karria",
  supprimer: "Supprimer",
  supprimerTitre: "Supprimer cette recherche ?",
  supprimerPhrase: "Karria ne la surveillera plus.",
  supprimerPhraseEnCours:
    "Karria ne la surveillera plus. Ton fil redeviendra toutes les offres.",
  annuler: "Annuler",
  erreurListe: "Tes recherches n'ont pas pu être chargées.",
  erreurReseau: "Pas de connexion. Tes recherches reviennent dès que le réseau est là.",
  alerteNonModifiee: "L'alerte n'a pas pu être modifiée. Réessaie dans un instant.",
  alerteNonModifieeReseau: "Pas de connexion : l'alerte n'a pas été modifiée.",
  rechercheDisparue: "Cette recherche n'existe plus.",
  nonSupprimeeTitre: "La recherche n'a pas été supprimée",
  nonSupprimeeReseau: "Vérifie ta connexion, puis réessaie.",
  nonSupprimee: "Réessaie dans un instant.",
} as const;

/** Ce que le lecteur d'écran dit de l'interrupteur d'une recherche. */
export function libelleDesAlertes(
  recherche: Pick<RechercheEnregistree, "resume">,
): string {
  return `Alertes pour ${recherche.resume}`;
}

/** Sous le résumé : « Recherche en cours », sinon « Utilisée hier »,
 *  « Utilisée le 3 nov. » — ou rien si la date est illisible. */
export function detailDeRecherche(
  recherche: Pick<RechercheEnregistree, "enCours" | "utiliseeLe">,
  maintenant: Date,
): string | null {
  if (recherche.enCours) return TEXTES_MES_RECHERCHES.enCours;
  const quand = dateCourte(recherche.utiliseeLe, maintenant);
  return quand === null ? null : `Utilisée ${quand}`;
}

/** Ce que la confirmation de suppression annonce. */
export function phraseDeSuppression(
  recherche: Pick<RechercheEnregistree, "enCours">,
): string {
  return recherche.enCours
    ? TEXTES_MES_RECHERCHES.supprimerPhraseEnCours
    : TEXTES_MES_RECHERCHES.supprimerPhrase;
}

/** « Jusqu'à 10 recherches ; au-delà, la plus ancienne est remplacée. » */
export function piedDeListe(maximum: number): string {
  return `Jusqu'à ${maximum} recherches ; au-delà, la plus ancienne est remplacée.`;
}

/** L'ordre du serveur — la plus récemment utilisée d'abord. Ne sert qu'à
 *  remettre à sa place une ligne dont la suppression a été refusée. */
export function parDerniereUtilisation(
  recherches: readonly RechercheEnregistree[],
): RechercheEnregistree[] {
  return [...recherches].sort((a, b) => b.utiliseeLe.localeCompare(a.utiliseeLe));
}
