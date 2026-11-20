/**
 * Les recherches enregistrées — les routes `/search/saved` de
 * `docs/contrat-api-recherche.md` (ADR-0041 de l'API).
 *
 * Elles vivent à côté de `recherche.api.ts` (la recherche **en cours**) :
 * c'est le même objet vu des paramètres. Le serveur tient les deux en
 * phase — couper ici l'alerte de la recherche en cours, c'est la couper
 * aussi pour `/search/criteria` ; supprimer ici la recherche en cours rend
 * le fil à « toutes les offres ». L'application n'en recalcule rien : elle
 * relit.
 */

import { http } from "@/lib/http";

import type {
  RechercheEnregistree,
  RechercheEnregistreeBrute,
  RecherchesEnregistrees,
  RecherchesEnregistreesBrutes,
} from "../types/recherches-enregistrees.types";

/** Le code du `404` quand la recherche n'existe plus (`details.reason`). */
export const RECHERCHE_INTROUVABLE = "saved_search_not_found";

export function versRechercheEnregistree(
  brute: RechercheEnregistreeBrute,
): RechercheEnregistree {
  return {
    id: brute.id,
    resume: brute.summary,
    demande: brute.query,
    metiers: brute.job_titles,
    lieu: brute.location_label,
    touteLaFrance: brute.whole_france,
    contrats: brute.contract_types,
    alertes: brute.alerts_enabled,
    enCours: brute.is_current,
    creeeLe: brute.created_at,
    utiliseeLe: brute.last_used_at,
    derniereAlerteLe: brute.last_alert_at,
  };
}

export function versRecherchesEnregistrees(
  brutes: RecherchesEnregistreesBrutes,
): RecherchesEnregistrees {
  return {
    recherches: brutes.items.map(versRechercheEnregistree),
    maximum: brutes.max,
  };
}

/** Les recherches de la personne, la plus récemment utilisée d'abord ;
 *  liste vide tant qu'elle n'a rien cherché. */
export async function lireRecherchesEnregistrees(): Promise<RecherchesEnregistrees> {
  return versRecherchesEnregistrees(
    await http.get<RecherchesEnregistreesBrutes>("/search/saved"),
  );
}

/** Active ou coupe l'alerte d'une recherche ; rend la recherche à jour.
 *  `404 saved_search_not_found` si elle n'existe plus. */
export async function reglerAlertesDeRecherche(
  id: string,
  actives: boolean,
): Promise<RechercheEnregistree> {
  return versRechercheEnregistree(
    await http.put<RechercheEnregistreeBrute>(
      `/search/saved/${encodeURIComponent(id)}/alerts`,
      { enabled: actives },
    ),
  );
}

/** Supprime une recherche : Karria ne la surveille plus. Si c'était la
 *  recherche en cours, le fil redevient « toutes les offres ». */
export async function supprimerRechercheEnregistree(id: string): Promise<void> {
  await http.delete(`/search/saved/${encodeURIComponent(id)}`);
}
