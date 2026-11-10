/**
 * L'atelier CV — ce que le module `documents` de `karria_api_v2` sert
 * (`docs/contrat-api-documents.md`) : le rendu HTML ancré, les exports
 * (CV et lettre), l'envoi par e-mail, le modèle choisi.
 *
 * ═══ Deux formes, comme partout ═══
 *
 * `…Brut` reproduit **exactement** ce que l'API envoie et ne quitte jamais
 * `api/`. Le CV et la lettre d'un dossier gardent leurs types du domaine
 * `candidatures` : l'atelier ne redéfinit pas le dossier, il le pilote.
 */

import type { StyleLettre } from "@/features/candidatures/services/style-lettre";

// ─────────────────────────────────────────────────────────────────────
// Ce que l'API envoie
// ─────────────────────────────────────────────────────────────────────

/** `POST /documents/{template_id}/render`. */
export interface RenduBrut {
  html: string;
  /** Estimation par mesure ; la vérité est `window.karriaFit.pages` dans la page. */
  pages: number;
  warnings: string[];
  /** Lettre : le style réellement servi — `template` (assortie) ou `plain` (sobre) (ADR-0036). */
  letter_style_served?: "template" | "plain" | null;
}

/** La lettre telle que `documents` la met en page (§ 2 du contrat). */
export interface LettreDocumentBrute {
  recipient: { company: string | null; logo_url: string | null; city: string | null };
  subject: string;
  greeting: string | null;
  paragraphs: { kind: string; text: string }[];
  closing: string | null;
  sender: {
    first_name: string;
    last_name: string;
    headline: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
  };
}

export interface ControleAtsBrut {
  key: string;
  label: string;
  points: number;
  max_points: number;
  finding: string | null;
  tip: string | null;
}

/** L'objet `ats` d'un export (`contrat-api-modeles.md`) — sur une lettre il
 *  ne porte que `explanation_status: "unavailable"`. */
export interface AtsBrut {
  score?: number;
  level?: "good" | "fair" | "poor";
  format?: string;
  checks?: ControleAtsBrut[];
  keywords?: { coverage: number; covered: string[]; missing: string[] } | null;
  explanation?: { summary: string; tips: string[] } | null;
  explanation_status: "pending" | "ready" | "unavailable";
  suggest_ats_safe?: boolean;
}

/** `GeneratedCv` : un export, CV ou lettre. */
export interface ExportBrut {
  id: string;
  kind?: "cv" | "letter";
  template: { id: string; label: string; version: number } | null;
  ats_safe?: boolean;
  /** La couleur principale du rendu, si la personne en a posé une (ADR-0034). */
  primary_color?: string | null;
  /** Lettre : le style servi (`template` | `plain`) ; absent ou `null` pour un CV. */
  letter_style?: "template" | "plain" | null;
  dossier_id?: string | null;
  company_name?: string | null;
  created_at: string;
  pdf_url?: string | null;
  docx_url?: string | null;
  fit?: { spacing: number; font_scale: number; pages: number } | null;
  /** Toujours là sur le vrai serveur ; toléré absent (un export de dossier d'avance). */
  ats?: AtsBrut;
}

/** `POST /documents/exports/send` → `202 Envoi`. */
export interface EnvoiBrut {
  id: string;
  status: "queued" | "sent" | "failed";
  to: string;
  generated_ids: string[];
  created_at: string;
  sent_at: string | null;
}

/** `GET /user-templates/me/selected` → `200 Selection` (ou `204`). */
export interface SelectionBrute {
  template: { id: string; label: string; version: number };
  ats_safe: boolean;
  updated_at: string;
  /** La couleur posée par la personne (`#RRGGBB`), ou `null` (ADR-0034). */
  primary_color?: string | null;
  /** La couleur d'origine du modèle choisi. */
  default_primary_color?: string | null;
}

// ─────────────────────────────────────────────────────────────────────
// Ce que l'application manipule
// ─────────────────────────────────────────────────────────────────────

export interface Rendu {
  html: string;
  pages: number;
  avertissements: string[];
  /** Lettre : le style que le serveur a réellement servi ; `null` pour un CV. */
  styleLettreServi: StyleLettre | null;
}

export type NiveauAts = "bon" | "moyen" | "faible";

export interface ControleAts {
  cle: string;
  libelle: string;
  points: number;
  maxPoints: number;
  constat: string | null;
  conseil: string | null;
}

export interface ScoreAts {
  /** Sur 100. */
  score: number;
  niveau: NiveauAts;
  controles: ControleAts[];
  /** La variante « optimisée ATS » ferait gagner des points. */
  conseilAtsSafe: boolean;
}

export interface Export {
  id: string;
  genre: "cv" | "lettre";
  modele: { id: string; libelle: string } | null;
  /** Le dossier de candidature qui l'a produit ; `null` pour un CV libre (« Mes CV »). */
  dossierId: string | null;
  creeLe: string;
  /** URL signée (1 h), ou `null` si le format n'a pas été demandé. */
  pdf: string | null;
  docx: string | null;
  /** `null` sur une lettre, ou quand le serveur n'a pas noté. */
  ats: ScoreAts | null;
  /** La couleur principale avec laquelle l'export a été rendu ; `null` : celle du modèle. */
  couleur: string | null;
  /** Lettre : le style servi ; `null` pour un CV. */
  styleLettre: StyleLettre | null;
}

export type StatutEnvoi = "en_file" | "envoye" | "echoue";

export interface Envoi {
  id: string;
  statut: StatutEnvoi;
  a: string;
  exports: string[];
  creeLe: string;
  envoyeLe: string | null;
}

export interface Selection {
  modeleId: string;
  libelle: string;
  atsSafe: boolean;
  /** La couleur principale retenue par défaut ; `null` : celle du modèle. */
  couleur: string | null;
  /** La couleur d'origine du modèle choisi, si le serveur la connaît. */
  couleurOrigine: string | null;
}
