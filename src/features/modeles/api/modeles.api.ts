/**
 * Les modèles de CV et leur traduction — sur les routes de l'API Karria
 * qu'utilisait la V1.
 *
 * - `GET /templates/?active_only=true` : la galerie.
 * - `GET /templates/{id}` : un modèle, avec ses lettres assorties.
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

function versModele(brut: ModeleBrut): Modele {
  const lettres = brut.cover_letters ?? [];
  const apercus: Apercu[] = [
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
  return {
    id: brut.id,
    libelle: brut.label,
    categorie: brut.category?.trim() || "professionnel",
    description: brut.description,
    premium: brut.is_premium,
    prix: brut.is_premium && brut.price !== null ? Number(brut.price).toFixed(2) : null,
    etiquettes: brut.tags ?? [],
    miniature: brut.signed_thumbnail_url,
    vues: brut.views_count,
    utilisations: brut.uses_count,
    note: brut.rating_avg,
    nombreDAvis: brut.rating_count,
    couleur: brut.primary_color,
    police: brut.font_family,
    avecPhoto: brut.has_photo,
    apercus,
    avecLettre: lettres.length > 0,
  };
}

export async function lireModeles(): Promise<Modele[]> {
  const bruts = await http.get<ModeleBrut[]>("/templates/?active_only=true");
  return bruts.map(versModele);
}

export async function lireModele(id: number): Promise<Modele> {
  return versModele(await http.get<ModeleBrut>(`/templates/${id}`));
}

export async function lireAvis(id: number): Promise<AvisDuModele> {
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
export async function lireMesModeles(): Promise<Set<number>> {
  const bruts = await http.get<PossessionBrute[]>("/user-templates/me");
  return new Set(bruts.filter((p) => p.is_active).map((p) => p.template.id));
}

/** Obtenir un modèle gratuit. Les modèles payants passent par l'achat
 *  intégré (RevenueCat), qui n'est pas encore branché dans la refonte. */
export async function obtenirModele(id: number): Promise<void> {
  await http.post("/user-templates/me", { template_id: id, acquisition_type: "free" });
}

/** Une vue du détail — une mesure, envoyée sans attendre ni bloquer. */
export function noterVue(id: number): void {
  http
    .post(`/templates/${id}/view`)
    .catch((cause: unknown) => console.warn("[karria] vue de modèle non notée", cause));
}
