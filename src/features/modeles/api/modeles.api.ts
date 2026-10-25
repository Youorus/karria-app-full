/**
 * Les modèles de CV et leur traduction — `docs/contrat-api-modeles.md`.
 *
 * - `GET /templates/` : la galerie (seuls les modèles publiés y sont).
 * - `GET /templates/{id}` : un modèle, avec ses `pages` (le CV, puis les
 *   lettres assorties) ; sans `pages`, on retombe sur ses lettres (V1).
 * - `GET /templates/{id}/reviews` : les avis.
 * - `POST /templates/{id}/view` : une vue, notée sans bloquer.
 * - `GET /user-templates/me` : les modèles déjà acquis (cochés ✓).
 * - `POST /user-templates/me` : obtenir un modèle gratuit.
 */

import { http } from "@/lib/http";
import type {
  Apercu,
  Avis,
  AvisDuModele,
  AvisListeBrute,
  Modele,
  ModeleBrut,
  PossessionBrute,
} from "../types/modeles.types";

function versApercus(brut: ModeleBrut): Apercu[] {
  // La galerie renvoie `pages: null` (le détail seul les porte).
  if (brut.pages != null && brut.pages.length > 0) {
    return brut.pages.map((p, i) => ({
      cle: `${p.kind}-${i}`,
      type: p.kind === "cv" ? "cv" : "lettre",
      libelle: p.kind === "cv" ? "CV" : "Lettre",
      miniature: p.signed_thumbnail_url,
      image: p.signed_full_url ?? p.signed_thumbnail_url,
    }));
  }
  const lettres = brut.cover_letters ?? [];
  return [
    {
      cle: `cv-${brut.id}`,
      type: "cv",
      libelle: "CV",
      miniature: brut.signed_thumbnail_url,
      image: brut.signed_full_url ?? brut.signed_preview_url ?? brut.signed_thumbnail_url,
    },
    ...lettres.map((l) => ({
      cle: `lettre-${l.id}`,
      type: "lettre" as const,
      libelle: "Lettre",
      miniature: l.signed_thumbnail_url,
      image: l.signed_full_url ?? l.signed_preview_url ?? l.signed_thumbnail_url,
    })),
  ];
}

function versModele(brut: ModeleBrut): Modele {
  const apercus = versApercus(brut);
  return {
    id: brut.id,
    libelle: brut.label,
    categorie: brut.category?.trim() || "professionnel",
    description: brut.description,
    premium: brut.is_premium,
    prix: brut.is_premium && brut.price !== null ? Number(brut.price).toFixed(2) : null,
    etiquettes: brut.tags ?? [],
    miniature: brut.signed_thumbnail_url,
    flou: brut.thumbnail_blurhash ?? null,
    version: brut.version ?? 1,
    vues: brut.views_count,
    utilisations: brut.uses_count,
    note: brut.rating_avg,
    nombreDAvis: brut.rating_count,
    couleur: brut.primary_color,
    police: brut.font_family,
    avecPhoto: brut.has_photo,
    apercus,
    avecLettre: apercus.some((a) => a.type === "lettre"),
  };
}

/** Les modèles de la dernière galerie lue, par identifiant. Le détail
 *  s'en sert pour s'afficher **tout de suite** — le zoom de la vignette
 *  atterrit sur l'aperçu, pas sur un chargeur — puis se complète. Rien
 *  n'est gardé d'une session à l'autre : les URL signées expirent. */
const connus = new Map<string, Modele>();

export async function lireModeles(): Promise<Modele[]> {
  const bruts = await http.get<ModeleBrut[]>("/templates/");
  const modeles = bruts.map(versModele);
  connus.clear();
  for (const m of modeles) connus.set(m.id, m);
  return modeles;
}

/** Le modèle tel que la galerie l'a lu, ou `null` (lien profond). */
export function modeleConnu(id: string): Modele | null {
  return connus.get(id) ?? null;
}

export async function lireModele(id: string): Promise<Modele> {
  return versModele(await http.get<ModeleBrut>(`/templates/${id}`));
}

export async function lireAvis(id: string): Promise<AvisDuModele> {
  const brut = await http.get<AvisListeBrute>(`/templates/${id}/reviews`);
  const avis: Avis[] = brut.items.map((a) => ({
    id: a.id,
    note: a.rating,
    titre: a.title,
    texte: a.body,
    date: a.created_at,
    auteur: a.author_name,
    initiales: a.author_initials,
  }));
  return { avis, moyenne: brut.rating_avg, total: brut.total };
}

/** Les identifiants des modèles que la personne possède déjà. */
export async function lireMesModeles(): Promise<Set<string>> {
  const bruts = await http.get<PossessionBrute[]>("/user-templates/me");
  return new Set(bruts.filter((p) => p.is_active).map((p) => p.template.id));
}

/** Obtenir un modèle gratuit. Les modèles Premium passent par l'achat
 *  intégré (RevenueCat), qui n'est pas encore branché dans la refonte. Le
 *  corps est celui du contrat, rien de plus : la v2 refuse les champs
 *  inconnus (422). */
export async function obtenirModele(id: string): Promise<void> {
  await http.post("/user-templates/me", { template_id: id });
}

/** Une vue du détail — une mesure, envoyée sans attendre ni bloquer. */
export function noterVue(id: string): void {
  http
    .post(`/templates/${id}/view`)
    .catch((cause: unknown) => console.warn("[karria] vue de modèle non notée", cause));
}
