/**
 * Le module `documents`, pour l'atelier — `docs/contrat-api-documents.md`.
 *
 * ═══ Les routes ═══
 *
 * - `POST /documents/{template_id}/render` : le HTML ancré d'un CV ou d'une
 *   lettre dans un modèle ; `?sample=true` pour l'exemple du modèle.
 * - `POST /cv/me/generated-cvs` : l'export d'un CV — **toujours** avec `cv`
 *   (la copie adaptée d'un dossier, ou le brouillon de l'atelier libre) ;
 *   `dossier_id` quand il y a un dossier, absent pour un CV libre.
 * - `GET /cv/me/generated-cvs?kind=cv` : tous les exports de CV de la
 *   personne — dossiers compris : « Mes CV » garde ceux **sans dossier**
 *   (`services/mes-cv.ts`), le contrat n'a pas de filtre « sans dossier ».
 * - `DELETE /cv/me/generated-cvs/{id}` : effacer un export.
 * - `POST /documents/letters/export` : l'export de la lettre d'un dossier.
 * - `POST /documents/exports/send` : plusieurs exports dans un seul e-mail ;
 *   `POST /documents/exports/{id}/send` : un seul.
 * - `GET /documents/sends/{id}` : où en est l'envoi.
 * - `GET|PUT /user-templates/me/selected` : le modèle choisi par la personne,
 *   et sa couleur principale par défaut.
 *
 * La **couleur principale** (`primary_color`, ADR-0034) part à chaque rendu et
 * à chaque export ; `null` = la couleur du modèle. Le serveur la normalise en
 * `#RRGGBB` et répond `422` sur un autre code : on envoie toujours
 * `normaliserCode` (`services/couleur.ts`).
 *
 * Le **style de lettre** (`letter_style`, ADR-0036) part au rendu et à l'export
 * d'une lettre : `template` (la lettre assortie du modèle) ou `plain` (la
 * lettre sobre) ; `null` = par défaut. La réponse dit le style réellement
 * servi (`letter_style_served`, `letter_style`) : un modèle sans lettre
 * assortie sert la sobre.
 *
 * Le CV part dans la forme de `GET /cv/me` : on réutilise `versCvBrut` des
 * dossiers — une seule traduction du CV dans l'application.
 */

import { versCvBrut } from "@/features/candidatures/api/candidatures.api";
import {
  type StyleLettre,
  versStyleLettre,
  versStyleLettreBrut,
} from "@/features/candidatures/services/style-lettre";
import type { Cv } from "@/features/cv/types/cv.types";
import { http } from "@/lib/http";

import type {
  AtsBrut,
  Envoi,
  EnvoiBrut,
  Export,
  ExportBrut,
  LettreDocumentBrute,
  Rendu,
  RenduBrut,
  ScoreAts,
  Selection,
  SelectionBrute,
} from "../types/atelier.types";

// ─────────────────────────────────────────────────────────────────────
// Brut → app
// ─────────────────────────────────────────────────────────────────────

const NIVEAUX = { good: "bon", fair: "moyen", poor: "faible" } as const;

function versScoreAts(b: AtsBrut | undefined): ScoreAts | null {
  if (b === undefined || b.score === undefined || b.level === undefined) return null;
  return {
    score: b.score,
    niveau: NIVEAUX[b.level],
    controles: (b.checks ?? []).map((c) => ({
      cle: c.key,
      libelle: c.label,
      points: c.points,
      maxPoints: c.max_points,
      constat: c.finding,
      conseil: c.tip,
    })),
    conseilAtsSafe: b.suggest_ats_safe === true,
  };
}

export function versExport(b: ExportBrut): Export {
  return {
    id: b.id,
    genre: b.kind === "letter" ? "lettre" : "cv",
    modele: b.template === null ? null : { id: b.template.id, libelle: b.template.label },
    dossierId: b.dossier_id ?? null,
    creeLe: b.created_at,
    pdf: b.pdf_url ?? null,
    docx: b.docx_url ?? null,
    ats: versScoreAts(b.ats),
    couleur: b.primary_color ?? null,
    styleLettre: versStyleLettre(b.letter_style),
  };
}

const STATUTS = { queued: "en_file", sent: "envoye", failed: "echoue" } as const;

export function versEnvoi(b: EnvoiBrut): Envoi {
  return {
    id: b.id,
    statut: STATUTS[b.status],
    a: b.to,
    exports: b.generated_ids,
    creeLe: b.created_at,
    envoyeLe: b.sent_at,
  };
}

function versRendu(b: RenduBrut): Rendu {
  return {
    html: b.html,
    pages: b.pages,
    avertissements: b.warnings,
    styleLettreServi: versStyleLettre(b.letter_style_served),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Les routes
// ─────────────────────────────────────────────────────────────────────

/** Le CV, ancré, dans ce modèle. `403 template_not_owned`, `429 render_rate_limited`. */
export async function rendreCv(
  modeleId: string,
  cv: Cv,
  atsSafe = false,
  couleur: string | null = null,
): Promise<Rendu> {
  return versRendu(
    await http.post<RenduBrut>(`/documents/${modeleId}/render`, {
      cv: versCvBrut(cv),
      letter: null,
      ats_safe: atsSafe,
      primary_color: couleur,
    }),
  );
}

/** La lettre, ancrée, dans le style demandé (lettre du modèle ou lettre sobre)
 *  — et la couleur du dossier. `styleLettreServi` dit ce qui a été rendu. */
export async function rendreLettre(
  modeleId: string,
  lettre: LettreDocumentBrute,
  couleur: string | null = null,
  style: StyleLettre | null = null,
): Promise<Rendu> {
  return versRendu(
    await http.post<RenduBrut>(`/documents/${modeleId}/render`, {
      letter: lettre,
      primary_color: couleur,
      letter_style: versStyleLettreBrut(style),
    }),
  );
}

/** L'exemple du modèle, sans ancres — permis même sur un Premium non possédé. */
export async function rendreExemple(modeleId: string): Promise<Rendu> {
  return versRendu(
    await http.post<RenduBrut>(`/documents/${modeleId}/render?sample=true`),
  );
}

/**
 * Exporte le CV **adapté** d'un dossier (PDF et DOCX, score ATS sur ce
 * CV-là). `409 cv_missing`, `403 template_locked`, `503 rendering_unavailable`.
 */
export async function exporterCvDuDossier(options: {
  cv: Cv;
  modeleId: string;
  dossierId: string;
  atsSafe?: boolean;
  couleur?: string | null;
}): Promise<Export> {
  return versExport(
    await http.post<ExportBrut>("/cv/me/generated-cvs", {
      template_id: options.modeleId,
      formats: ["pdf", "docx"],
      ats_safe: options.atsSafe ?? false,
      dossier_id: options.dossierId,
      cv: versCvBrut(options.cv),
      primary_color: options.couleur ?? null,
    }),
  );
}

/**
 * Exporte le CV de l'atelier **libre** : le brouillon local (le CV de base
 * retouché), sans dossier. C'est lui qui apparaît dans « Mes CV ». Le CV de
 * base, lui, n'est pas touché : il n'existe aucun `PUT /cv/me` ici.
 */
export async function exporterCvLibre(options: {
  cv: Cv;
  modeleId: string;
  atsSafe?: boolean;
  couleur?: string | null;
}): Promise<Export> {
  return versExport(
    await http.post<ExportBrut>("/cv/me/generated-cvs", {
      template_id: options.modeleId,
      formats: ["pdf", "docx"],
      ats_safe: options.atsSafe ?? false,
      cv: versCvBrut(options.cv),
      primary_color: options.couleur ?? null,
    }),
  );
}

/** Tous les exports de CV de la personne, dossiers compris, du serveur tels quels. */
export async function lireMesExports(genre: "cv" | "lettre" = "cv"): Promise<Export[]> {
  const brut = await http.get<{ items: ExportBrut[]; total: number }>(
    `/cv/me/generated-cvs?kind=${genre === "cv" ? "cv" : "letter"}`,
  );
  return brut.items.map(versExport);
}

/** Efface un export (ses fichiers avec). `404 generated_cv_not_found`. */
export async function effacerExport(id: string): Promise<void> {
  await http.delete(`/cv/me/generated-cvs/${id}`);
}

/** Exporte la lettre d'un dossier — un document à part, `kind: "letter"` —
 *  dans le style retenu par le dossier ; l'export dit le style servi. */
export async function exporterLettre(options: {
  lettre: LettreDocumentBrute;
  modeleId: string;
  dossierId: string;
  couleur?: string | null;
  style?: StyleLettre | null;
}): Promise<Export> {
  return versExport(
    await http.post<ExportBrut>("/documents/letters/export", {
      template_id: options.modeleId,
      letter: options.lettre,
      formats: ["pdf", "docx"],
      dossier_id: options.dossierId,
      primary_color: options.couleur ?? null,
      letter_style: versStyleLettreBrut(options.style ?? null),
    }),
  );
}

/**
 * Un seul e-mail avec ces exports en pièces jointes. `a` à `null` : l'adresse
 * du compte. `429 send_quota_exceeded` (`details.scope`, `retry_after`),
 * `422 recipient_invalid`, `409 document_file_missing`.
 */
export async function envoyerExports(ids: string[], a: string | null): Promise<Envoi> {
  return versEnvoi(
    await http.post<EnvoiBrut>("/documents/exports/send", { generated_ids: ids, to: a }),
  );
}

/** Un seul export par e-mail — mêmes quotas et mêmes refus que `envoyerExports`. */
export async function envoyerExport(id: string, a: string | null): Promise<Envoi> {
  return versEnvoi(
    await http.post<EnvoiBrut>(`/documents/exports/${id}/send`, { to: a }),
  );
}

export async function lireEnvoi(id: string): Promise<Envoi> {
  return versEnvoi(await http.get<EnvoiBrut>(`/documents/sends/${id}`));
}

/** Le modèle choisi par la personne, ou `null` (`204`). */
export async function lireModeleChoisi(): Promise<Selection | null> {
  const brut = await http.get<SelectionBrute | undefined>("/user-templates/me/selected");
  if (brut === undefined) return null;
  return {
    modeleId: brut.template.id,
    libelle: brut.template.label,
    atsSafe: brut.ats_safe,
    couleur: brut.primary_color ?? null,
    couleurOrigine: brut.default_primary_color ?? null,
  };
}

/** Retient ce modèle — et cette couleur, `null` = celle du modèle — comme
 *  choix par défaut. Le `PUT` remplace le choix entier. `403 template_locked`. */
export async function choisirModele(
  modeleId: string,
  couleur: string | null = null,
): Promise<void> {
  await http.put("/user-templates/me/selected", {
    template_id: modeleId,
    ats_safe: false,
    primary_color: couleur,
  });
}
