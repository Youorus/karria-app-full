/**
 * Les offres, et leur traduction — les routes `/job-matches` de
 * `karria_api_v2` (`docs/contrat-api-offres.md`).
 *
 * ═══ Les routes ═══
 *
 * - `GET /job-matches/me` : le fil paginé. Sans recherche, toutes les
 *   offres actives, les plus récentes d'abord ; avec une recherche, les
 *   offres retenues, par pertinence. Les filtres de la V1 (`saved_only`,
 *   `unseen_only`, `unapplied_only`, `contract_types`, `cities`,
 *   `published_after`) s'appliquent par-dessus.
 * - `GET /job-matches/me/filter-options` : contrats et villes du fil,
 *   avec leurs effectifs.
 * - `GET /job-matches/{id}` : l'offre complète (`description`).
 * - `POST /job-matches/me/seen` : les offres passées à l'écran, par lots.
 * - `PATCH /job-matches/{id}/interaction` : garder, ouvrir, postuler,
 *   écarter.
 *
 * Il n'y a plus de génération d'analyse par offre (`…/summary`) : la V2
 * ne la sert pas encore, et `summary` vaut toujours `null`.
 *
 * Toute la mise en forme (contrat abrégé, salaire lisible, description
 * nettoyée) passe par `services/presentation.ts`.
 */

import { http } from "@/lib/http";
import {
  libelleExperience,
  libelleHoraires,
  libelleTeletravail,
  nettoyerDescription,
  qualite,
} from "../services/presentation";
import type {
  Fil,
  ModeDuFil,
  FilBrut,
  Filtres,
  MatchBrut,
  Offre,
  OptionsDeFiltre,
  OptionsDeFiltreBrutes,
} from "../types/offres.types";

export function versOffre(brut: MatchBrut): Offre {
  const offre = brut.job_offer;
  return {
    id: brut.id,
    titre: offre.title,
    entreprise: offre.company?.name ?? null,
    logo: offre.company?.logo ?? null,
    lieu: offre.location_label ?? offre.city?.name ?? null,
    ville: offre.city?.name ?? null,
    codePostal: offre.city?.postal_code ?? null,
    publieeLe: offre.published_at,
    contrat: offre.contract_type?.label ?? null,
    teletravail: libelleTeletravail(offre.remote),
    horaires: libelleHoraires(offre.schedule),
    experience: libelleExperience(offre.experience),
    salaire: offre.salary_raw,
    extrait: offre.excerpt,
    description:
      offre.description === null ? null : nettoyerDescription(offre.description),
    compatibilite:
      brut.score_normalized === null ? null : Math.round(brut.score_normalized * 100),
    raisons: brut.reasons,
    lienCandidature: offre.apply_url ?? offre.origin_url ?? null,
    latitude: offre.latitude,
    longitude: offre.longitude,
    enregistree: brut.saved,
    postulee: brut.applied,
    qualite: qualite(brut.match_quality),
    nouvelle: brut.is_new,
    nonOuverte: !brut.detail_opened,
    siteEntreprise: offre.company?.website ?? null,
    source: offre.source,
    active: offre.is_active,
  };
}

/** La requête du fil. Le tri n'est pas envoyé : sans recherche, l'API trie
 *  toujours par fraîcheur, et avec une recherche par pertinence — ce qu'on
 *  veut dans les deux cas. `maintenant` est passé pour garder la fonction
 *  pure : la période de la V1 devient un instant `published_after`.
 *
 *  `demande` est le mode voulu par la personne (« Toutes les offres » /
 *  « Ma recherche ») ; absent, le serveur le déduit des critères.
 *  `all_offers` garde la recherche et ses alertes : c'est tout ce qu'il
 *  faut pour « mettre en pause » son affichage. */
export function parametresDuFil(
  filtres: Filtres,
  offset: number,
  limit: number,
  maintenant: Date,
  demande: ModeDuFil | null = null,
): string {
  const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (demande !== null) p.set("mode", demande === "recherche" ? "search" : "all_offers");
  if (filtres.sauvegardees) p.set("saved_only", "true");
  if (filtres.nonVues) p.set("unseen_only", "true");
  if (filtres.nonPostulees) p.set("unapplied_only", "true");
  if (filtres.contrats.length > 0) p.set("contract_types", filtres.contrats.join(","));
  if (filtres.villes.length > 0) p.set("cities", filtres.villes.join(","));
  if (filtres.periode !== null) {
    const depuis = new Date(maintenant.getTime() - filtres.periode * 86_400_000);
    p.set("published_after", depuis.toISOString());
  }
  return p.toString();
}

export async function lireFil(
  filtres: Filtres,
  offset: number,
  demande: ModeDuFil | null = null,
  limit = 20,
): Promise<Fil> {
  const brut = await http.get<FilBrut>(
    `/job-matches/me?${parametresDuFil(filtres, offset, limit, new Date(), demande)}`,
  );
  return {
    offres: brut.items.map(versOffre),
    total: brut.count,
    suivantes: brut.has_next,
    mode: brut.mode === "search" ? "recherche" : "toutes",
    resumeRecherche: brut.criteria_summary,
  };
}

export async function lireOptionsDeFiltre(): Promise<OptionsDeFiltre> {
  const brut = await http.get<OptionsDeFiltreBrutes>("/job-matches/me/filter-options");
  const versOption = (o: { value: string; label: string; count: number }) => ({
    valeur: o.value,
    libelle: o.label,
    nombre: o.count,
  });
  return {
    contrats: (brut.contract_types ?? []).map(versOption),
    villes: (brut.cities ?? []).map(versOption),
  };
}

export async function lireOffre(id: string): Promise<Offre> {
  return versOffre(await http.get<MatchBrut>(`/job-matches/${id}`));
}

/** Les offres passées à l'écran, par lots de 100 au plus. Idempotent :
 *  renvoyer deux fois la même ne coûte rien. */
export async function marquerVues(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i += 100) {
    await http.post("/job-matches/me/seen", { offer_ids: ids.slice(i, i + 100) });
  }
}

/** Garde ou retire l'offre. Rend l'état que le serveur confirme. */
export async function garderOffre(id: string, garder: boolean): Promise<boolean> {
  const brut = await http.patch<MatchBrut>(`/job-matches/${id}/interaction`, {
    saved: garder,
  });
  return brut.saved;
}

/** Écarte l'offre : elle quitte le fil et n'y revient plus. */
export async function ecarterOffre(id: string): Promise<void> {
  await http.patch<MatchBrut>(`/job-matches/${id}/interaction`, { dismissed: true });
}

/** Une mesure d'interaction : envoyée sans attendre ni bloquer. */
function noter(id: string, champ: "detail_opened" | "link_clicked"): void {
  http
    .patch(`/job-matches/${id}/interaction`, { [champ]: true })
    .catch((cause: unknown) => console.warn("[karria] interaction non notée", cause));
}

/** Le détail a été ouvert : le liseré et le point de la carte disparaissent. */
export const noterDetailOuvert = (id: string) => noter(id, "detail_opened");

/** La page de candidature a été ouverte. */
export const noterCandidatureOuverte = (id: string) => noter(id, "link_clicked");
