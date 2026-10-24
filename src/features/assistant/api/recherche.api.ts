/**
 * La recherche en cours — les routes `/search/criteria` de
 * `docs/contrat-api-recherche.md`.
 *
 * Karria la pose en conversation ; ici, on la lit, on l'oublie et on la
 * repose. `PUT` ne sert pas (encore) à éditer les critères depuis l'app :
 * il remet en place une recherche **mise en pause** quand la personne
 * revient de « Toutes les offres » à « Pour toi » (voir
 * `services/recherche-en-pause.ts`). Le contrat n'offre pas d'autre moyen
 * de voir toutes les offres tout en gardant sa recherche.
 */

import { http } from "@/lib/http";
import type { CorpsDeRecherche, Criteres, CriteresBruts } from "../types/assistant.types";

/** Ce que le serveur accepte en retour de ce qu'il a rendu. */
export function versCorpsDeRecherche(brut: CriteresBruts): CorpsDeRecherche {
  return {
    job_titles: brut.job_titles,
    keywords: brut.keywords,
    location: brut.location,
    whole_france: brut.whole_france,
    contract_types: brut.contract_types,
    remote: brut.remote,
    schedule: brut.schedule,
    max_experience: brut.max_experience,
    salary_min_monthly: brut.salary_min_monthly,
  };
}

/** La recherche en cours, telle que le serveur la rend, ou `null`. */
export async function lireRechercheBrute(): Promise<CriteresBruts | null> {
  const brut = await http.get<{ criteria: CriteresBruts | null }>("/search/criteria");
  return brut.criteria;
}

/** Pose la recherche directement ; le serveur recalcule le fil. */
export async function poserRecherche(corps: CorpsDeRecherche): Promise<Criteres> {
  const brut = await http.put<{ criteria: CriteresBruts; results_count: number }>(
    "/search/criteria",
    corps,
  );
  return versCriteres(brut.criteria);
}

export function versCriteres(brut: CriteresBruts): Criteres {
  return {
    resume: brut.summary,
    metiers: brut.job_titles,
    lieu: brut.location?.label ?? null,
    rayonKm: brut.location?.radius_km ?? null,
    touteLaFrance: brut.whole_france,
    contrats: brut.contract_types,
    alertes: brut.alerts_enabled,
  };
}

/** La recherche en cours, ou `null` si la personne n'a rien demandé. */
export async function lireRecherche(): Promise<Criteres | null> {
  const brut = await http.get<{ criteria: CriteresBruts | null }>("/search/criteria");
  return brut.criteria === null ? null : versCriteres(brut.criteria);
}

/** Oublie la recherche : le fil redevient « toutes les offres », les
 *  alertes cessent, les offres gardées restent. */
export async function oublierRecherche(): Promise<void> {
  await http.delete("/search/criteria");
}
