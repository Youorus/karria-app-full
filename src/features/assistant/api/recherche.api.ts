/**
 * La recherche en cours — les routes `/search/criteria` de
 * `docs/contrat-api-recherche.md`.
 *
 * Karria la pose en conversation ; ici, on la lit ou on l'oublie. Voir
 * toutes les offres sans perdre sa recherche ne passe **pas** par ici :
 * c'est le paramètre `mode=all_offers` du fil (`offres.api.ts`), qui garde
 * les critères et leurs alertes. `oublierRecherche` ne sert qu'à abandonner
 * vraiment la recherche.
 */

import { http } from "@/lib/http";
import type { Criteres, CriteresBruts } from "../types/assistant.types";

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
