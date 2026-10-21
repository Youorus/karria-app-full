/**
 * Les offres, et leur traduction — sur les routes de l'API Karria
 * (`/job-matches`), celles qu'utilisait la V1.
 *
 * ═══ Les routes ═══
 *
 * - `GET /job-matches/me` : le fil paginé, avec les paramètres de la V1
 *   (`saved_only`, `unseen_only`, `unapplied_only`, `contract_types`,
 *   `cities`, `published_after`, `sort=fresh`).
 * - `GET /job-matches/me/filter-options` : contrats et villes du fil.
 * - `GET /job-matches/{id}` : un match et son offre.
 * - `POST /job-matches/{id}/summary` puis `GET …/summary-status` : la
 *   génération de l'analyse, sondée jusqu'à ce qu'elle soit prête.
 * - `PATCH /job-matches/{id}/interaction` : garder, ouvrir, postuler.
 *
 * Toute la mise en forme (lieu de repli, contrat de repli, description
 * nettoyée) passe par `services/presentation.ts`, la copie fidèle des
 * règles de la V1.
 */

import { http } from "@/lib/http";
import {
  contratDeLOffre,
  descriptionDeLOffre,
  lieuDeLOffre,
  qualite,
} from "../services/presentation";
import type {
  Fil,
  FilBrut,
  Filtres,
  MatchBrut,
  Offre,
  OptionsDeFiltre,
  OptionsDeFiltreBrutes,
  ResumeBrut,
} from "../types/offres.types";

export function versOffre(brut: MatchBrut): Offre {
  const offre = brut.job_offer;
  const source = offre?.raw_data ?? null;
  const contrat = contratDeLOffre(offre?.contract_type?.label ?? null, source);
  return {
    id: brut.id,
    titre: offre?.title ?? "Offre",
    entreprise: offre?.company?.name ?? null,
    logo: offre?.company?.logo ?? null,
    ville: lieuDeLOffre(offre?.city?.name ?? null, source),
    codePostal: offre?.city?.postal_code ?? null,
    publieeLe: offre?.published_at ?? "",
    contrats: contrat === null ? [] : [contrat],
    salaire: offre?.salary_raw ?? null,
    resume: offre?.summary ?? null,
    compatibilite:
      brut.score_normalized === null ? null : Math.round(brut.score_normalized * 100),
    lienCandidature: offre?.apply_url ?? offre?.origin_url ?? null,
    latitude: offre?.latitude ?? null,
    longitude: offre?.longitude ?? null,
    enregistree: brut.saved,
    qualite: qualite(brut.match_quality),
    nouvelle: (brut.score_recency ?? 0) > 0.9,
    nonOuverte: brut.detail_opened === false,
    description: descriptionDeLOffre(offre?.summary ?? null, source),
    siteEntreprise: offre?.company?.website ?? null,
    active: offre?.is_active !== false,
  };
}

/** La requête du fil, avec les paramètres de la V1. `maintenant` est
 *  passé pour garder la fonction pure. */
export function parametresDuFil(
  filtres: Filtres,
  offset: number,
  limit: number,
  maintenant: Date,
): string {
  const p = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    sort: "fresh",
  });
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
  limit = 20,
): Promise<Fil> {
  const brut = await http.get<FilBrut>(
    `/job-matches/me?${parametresDuFil(filtres, offset, limit, new Date())}`,
  );
  return {
    // Un match dont l'offre a disparu n'a rien à montrer : écarté plutôt
    // qu'affiché en carte vide.
    offres: brut.items.filter((m) => m.job_offer !== null).map(versOffre),
    total: brut.count,
    suivantes: brut.has_next,
  };
}

export async function lireOptionsDeFiltre(): Promise<OptionsDeFiltre> {
  const brut = await http.get<OptionsDeFiltreBrutes>("/job-matches/me/filter-options");
  const versOption = (o: { value: string; label: string }) => ({
    valeur: o.value,
    libelle: o.label,
  });
  // L'API peut renvoyer plusieurs entrées au même libellé (« Paris » pour
  // des identifiants de ville différents) : on filtre sur le libellé, donc
  // une seule option par libellé.
  const uniques = (options: { value: string; label: string }[]) => [
    ...new Map(options.map((o) => [o.value, versOption(o)])).values(),
  ];
  return {
    contrats: uniques(brut.contract_types ?? []),
    villes: uniques(brut.cities ?? []),
  };
}

export async function lireOffre(id: number): Promise<Offre> {
  return versOffre(await http.get<MatchBrut>(`/job-matches/${id}`));
}

export async function lireResume(id: number): Promise<ResumeBrut> {
  return http.get<ResumeBrut>(`/job-matches/${id}/summary-status`);
}

/** Lance la génération. Le serveur rend aussitôt `pending` — ou `ready`
 *  si l'analyse existait déjà. */
export async function demanderResume(id: number): Promise<ResumeBrut> {
  return http.post<ResumeBrut>(`/job-matches/${id}/summary`);
}

/** Garde ou retire l'offre. Rend l'état que le serveur confirme. */
export async function garderOffre(id: number, garder: boolean): Promise<boolean> {
  const brut = await http.patch<MatchBrut>(`/job-matches/${id}/interaction`, {
    saved: garder,
  });
  return brut.saved;
}

/** Une mesure d'interaction : envoyée sans attendre ni bloquer. */
function noter(id: number, champ: "detail_opened" | "link_clicked"): void {
  http
    .patch(`/job-matches/${id}/interaction`, { [champ]: true })
    .catch((cause: unknown) => console.warn("[karria] interaction non notée", cause));
}

/** Le détail a été ouvert : le liseré et le point de la carte disparaissent. */
export const noterDetailOuvert = (id: number) => noter(id, "detail_opened");

/** La page de candidature a été ouverte. */
export const noterCandidatureOuverte = (id: number) => noter(id, "link_clicked");
