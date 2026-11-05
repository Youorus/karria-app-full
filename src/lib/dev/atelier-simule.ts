/**
 * Le faux serveur de l'atelier — le module `documents` de
 * `docs/contrat-api-documents.md`, en exécutable : le rendu HTML ancré,
 * les exports (CV adapté, lettre), l'envoi par e-mail, le modèle choisi.
 *
 * ═══ Un vrai rendu ancré, pas un gabarit vide ═══
 *
 * Le HTML produit a tout ce que la feuille de l'atelier attend : une
 * `.page` A4, un `data-chemin` sur chaque texte du CV (y compris les
 * chemins virtuels `identity.full_name`, `experiences.i.dates`), un script
 * qui pose `window.karriaFit` après `document.fonts.ready`, et un filet
 * pointillé à chaque coupure de page. Deux mises en page, selon le modèle
 * (une colonne, ou deux colonnes avec bande latérale), pour que changer de
 * modèle **se voie**. Les avertissements suivent le contrat.
 *
 * ═══ Les exports ═══
 *
 * Un export rend un `GeneratedCv` avec des URL de fichiers de notre
 * stockage (elles ne répondent pas : la simulation n'écrit rien) et un
 * score ATS **calculé par quelques règles** (contact, à-propos, missions,
 * mots-clés) — assez pour exercer le cadran et « Je corrige », jamais
 * pour juger un CV. Sans `cv` dans le corps, c'est le CV de base du faux
 * serveur du CV (`cvSimule`) qui est exporté, comme le contrat le dit ;
 * `409 cv_missing` s'il n'existe pas.
 *
 * `GET /cv/me/generated-cvs` est tenu ici, pour les deux sources : les
 * exports faits ici (CV libres de « Mes CV », exports de Finaliser) et ceux
 * des dossiers d'avance du faux serveur des dossiers (`exportsSimulesDesDossiers`).
 * Deux CV libres sont semés (Meridian, Minimalist) pour que « Mes CV » ait
 * une liste à montrer — et son annonce après la deuxième carte.
 *
 * ═══ L'envoi ═══
 *
 * `202 Envoi` en file, `sent` à la relecture ; cinq envois par jour, deux
 * par adresse tierce, comme le contrat — pour voir les refus à l'écran.
 */

import {
  exportsSimulesDesDossiers,
  supprimerExportSimuleDeDossier,
} from "./candidatures-simule";
import { cvSimule } from "./cv-simule";

const PAGE_HAUTEUR_MM = 297;

interface Lien {
  label: string;
  url: string;
}

interface CvRecu {
  summary?: string | null;
  identity?: { first_name?: string; last_name?: string; headline?: string | null } | null;
  contact?: {
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    links?: Lien[];
  } | null;
  experiences?: {
    position?: string;
    company?: string;
    location?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_current?: boolean;
    missions?: string[] | null;
  }[];
  educations?: {
    degree?: string;
    school?: string;
    location?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    is_in_progress?: boolean;
  }[];
  skills?: { name: string; level?: string }[];
  languages?: { language: string; level?: string }[];
  interests?: { name: string }[];
}

interface LettreRecue {
  recipient?: { company?: string | null; logo_url?: string | null; city?: string | null };
  subject?: string;
  greeting?: string | null;
  paragraphs?: { kind?: string; text?: string }[];
  closing?: string | null;
  sender?: {
    first_name?: string;
    last_name?: string;
    headline?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
  };
}

interface ExportSimule {
  id: string;
  kind: "cv" | "letter";
  template: { id: string; label: string; version: number };
  ats_safe: boolean;
  dossier_id: string | null;
  company_name: string | null;
  created_at: string;
  pdf_url: string;
  docx_url: string;
  fit: { spacing: number; font_scale: number; pages: number };
  ats: Record<string, unknown>;
}

interface EnvoiSimule {
  id: string;
  status: "queued" | "sent" | "failed";
  to: string;
  generated_ids: string[];
  created_at: string;
  sent_at: string | null;
  tiers: boolean;
}

/** Les modèles que le faux serveur sait rendre : les trois de
 *  `modeles-simule.ts`, par identifiant. Recopiés ici — le faux serveur est
 *  le contrat, il ne dépend pas du reste. */
const MODELES: Record<
  string,
  { label: string; colonnes: 1 | 2; accent: string; police: string; premium: boolean }
> = {
  "6f1c2b0e-8d4a-4c1e-9a57-0b3f1e2d4c01": {
    label: "Meridian",
    colonnes: 2,
    accent: "#1f2937",
    police: "Georgia, serif",
    premium: false,
  },
  "9b2e7c41-3f6d-4a8b-b1c2-5e7f9a0d1b02": {
    label: "Marketing",
    colonnes: 1,
    accent: "#3f3f46",
    police: "Helvetica, Arial, sans-serif",
    premium: false,
  },
  "c4d81a93-7e25-4f0b-8c6d-2a9e4b7f3c03": {
    label: "Minimalist",
    colonnes: 2,
    accent: "#0f766e",
    police: "Futura, 'Trebuchet MS', sans-serif",
    premium: true,
  },
};

const ADRESSE_DU_COMPTE = "toi@exemple.fr";
const ENVOIS_PAR_JOUR = 5;
const ENVOIS_PAR_TIERS = 2;

const etat = {
  selection: null as {
    template_id: string;
    ats_safe: boolean;
    updated_at: string;
  } | null,
  exports: new Map<string, ExportSimule>(),
  envois: new Map<string, EnvoiSimule>(),
  /** Les modèles Premium possédés, pour `template_not_owned` — rempli par
   *  `possederModeleAtelier` quand le faux paiement livre. */
  possedes: new Set<string>(),
};

export function reinitialiserAtelier(maintenant: number = Date.now()): void {
  etat.selection = null;
  etat.exports.clear();
  etat.envois.clear();
  etat.possedes.clear();
  semer(maintenant);
}

const MERIDIAN_ID = "6f1c2b0e-8d4a-4c1e-9a57-0b3f1e2d4c01";
const MINIMALIST_ID = "c4d81a93-7e25-4f0b-8c6d-2a9e4b7f3c03";

/** Deux CV libres d'avance, du plus ancien au plus récent : « Mes CV » n'est pas vide. */
function semer(maintenant: number): void {
  for (const [templateId, heures] of [
    [MINIMALIST_ID, 9 * 24],
    [MERIDIAN_ID, 2 * 24 + 3],
  ] as const) {
    const { pages } = htmlDuCv(CV_EXEMPLE, templateId, false);
    const exporte = nouvelExport(
      "cv",
      templateId,
      null,
      null,
      false,
      scoreAts(CV_EXEMPLE, []),
      pages,
      maintenant - heures * 3_600_000,
    );
    etat.exports.set(exporte.id, exporte);
  }
}

/** Le faux paiement remet un modèle : le rendu cesse de répondre 403. */
export function possederModeleAtelier(templateId: string): void {
  etat.possedes.add(templateId);
}

// ─────────────────────────────────────────────────────────────────────
// L'outillage
// ─────────────────────────────────────────────────────────────────────

const CODES: Record<number, string> = {
  403: "forbidden",
  404: "not_found",
  409: "rule_violation",
  422: "invalid_input",
  429: "rate_limited",
};

function json(statut: number, corps: unknown): Response {
  return new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(
  statut: number,
  raison: string,
  message: string,
  details: Record<string, unknown> = {},
): Response {
  return json(statut, {
    error: {
      code: CODES[statut] ?? "invalid_input",
      message,
      details: { reason: raison, ...details },
    },
  });
}

function champ(corps: unknown, nom: string): unknown {
  return typeof corps === "object" && corps !== null
    ? (corps as Record<string, unknown>)[nom]
    : undefined;
}

function identifiant(prefixe: string): string {
  return `${prefixe}_${Math.random().toString(36).slice(2, 10)}`;
}

function echapper(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function moisLisible(date: string | null | undefined): string | null {
  if (!date) return null;
  const [annee, mois] = date.split("-");
  if (mois === undefined) return annee;
  return `${MOIS[Number(mois) - 1] ?? ""} ${annee}`.trim();
}

function periode(
  debut: string | null | undefined,
  fin: string | null | undefined,
  enCours: boolean | undefined,
): string {
  const d = moisLisible(debut);
  const f = enCours ? "aujourd'hui" : moisLisible(fin);
  if (d === null && f === null) return "";
  if (d === null) return f ?? "";
  return f === null ? d : `${d} – ${f}`;
}

function ancre(
  chemin: string,
  texte: string | null | undefined,
  balise = "span",
  classe = "",
): string {
  if (texte === null || texte === undefined || texte === "") return "";
  return `<${balise} data-chemin="${chemin}"${classe ? ` class="${classe}"` : ""}>${echapper(texte)}</${balise}>`;
}

function sansAccents(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────
// Le rendu
// ─────────────────────────────────────────────────────────────────────

function styleDePage(
  accent: string,
  police: string,
  colonnes: 1 | 2,
  pages: number,
): string {
  return `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ${police}; color: #1b1b1b; font-size: 10.5pt; line-height: 1.45; }
  .page { position: relative; width: 210mm; height: ${pages * PAGE_HAUTEUR_MM}mm; background: #fff; overflow: hidden; display: ${colonnes === 2 ? "grid" : "block"}; grid-template-columns: 64mm 1fr; }
  .bande { background: ${accent}; color: #fff; padding: 16mm 8mm; min-height: 100%; }
  .bande h1, .bande h2 { color: #fff; }
  .corps { padding: 16mm 14mm; }
  h1 { font-size: 24pt; margin: 0 0 2mm; line-height: 1.1; letter-spacing: -0.01em; }
  .intitule { font-size: 12pt; color: ${colonnes === 2 ? "rgba(255,255,255,.85)" : accent}; margin-bottom: 5mm; display: block; }
  h2 { font-size: 9.5pt; text-transform: uppercase; letter-spacing: .12em; color: ${accent}; margin: 7mm 0 2.5mm; border-bottom: 1px solid ${accent}33; padding-bottom: 1mm; }
  .bande h2 { border-color: rgba(255,255,255,.35); }
  .contact span { display: block; margin-bottom: 1mm; font-size: 9.5pt; }
  .element { margin-bottom: 4mm; }
  .element .ligne { display: flex; justify-content: space-between; gap: 4mm; font-weight: 700; }
  .element .meta { font-size: 9pt; color: #555; }
  ul { margin: 1.5mm 0 0; padding-left: 4.5mm; }
  li { margin-bottom: .8mm; }
  .pastilles span { display: inline-block; padding: .8mm 2.5mm; margin: 0 1.5mm 1.5mm 0; border: 1px solid ${colonnes === 2 ? "rgba(255,255,255,.5)" : `${accent}66`}; border-radius: 3mm; font-size: 9pt; }
  .coupure { position: absolute; left: 0; right: 0; border-top: 1px dashed ${accent}88; pointer-events: none; }
  `;
}

function scriptDeFit(pages: number): string {
  return `<script>(function(){var fin=function(){var page=document.querySelector('.page');var h=page?page.scrollHeight:0;var pages=Math.max(1,Math.ceil(h/(${PAGE_HAUTEUR_MM}*3.7795)))||${pages};window.karriaFit={k:1,f:1,pages:${pages}};document.title='fit k=1 f=1 pages=${pages}';};if(document.fonts&&document.fonts.ready){document.fonts.ready.then(fin,fin);}else{fin();}})();</script>`;
}

function rubriqueExperiences(cv: CvRecu): string {
  const exps = cv.experiences ?? [];
  if (exps.length === 0) return "";
  return `<h2>Expériences professionnelles</h2>${exps
    .map(
      (e, i) => `<div class="element">
  <div class="ligne"><span>${ancre(`experiences.${i}.position`, e.position)}${e.company ? ` <span>chez</span> ${ancre(`experiences.${i}.company`, e.company)}` : ""}</span>${ancre(`experiences.${i}.dates`, periode(e.start_date, e.end_date, e.is_current), "span", "meta")}</div>
  ${ancre(`experiences.${i}.location`, e.location, "div", "meta")}
  ${(e.missions ?? []).length > 0 ? `<ul>${(e.missions ?? []).map((m, j) => ancre(`experiences.${i}.missions.${j}`, m, "li")).join("")}</ul>` : ""}
</div>`,
    )
    .join("")}`;
}

function rubriqueFormations(cv: CvRecu): string {
  const fs = cv.educations ?? [];
  if (fs.length === 0) return "";
  return `<h2>Formation</h2>${fs
    .map(
      (f, i) => `<div class="element">
  <div class="ligne"><span>${ancre(`educations.${i}.degree`, f.degree)}</span>${ancre(`educations.${i}.dates`, periode(f.start_date, f.end_date, f.is_in_progress), "span", "meta")}</div>
  <div class="meta">${ancre(`educations.${i}.school`, f.school)}${f.location ? ` · ${ancre(`educations.${i}.location`, f.location)}` : ""}</div>
</div>`,
    )
    .join("")}`;
}

function pastilles(titre: string, prefixe: string, noms: string[]): string {
  if (noms.length === 0) return "";
  return `<h2>${titre}</h2><div class="pastilles">${noms.map((n, i) => ancre(`${prefixe}.${i}`, n)).join("")}</div>`;
}

function entete(cv: CvRecu, colonnes: 1 | 2): string {
  const id = cv.identity ?? {};
  const nom = `${id.first_name ?? ""} ${id.last_name ?? ""}`.trim();
  const c = cv.contact ?? {};
  const contact = `<div class="contact">${ancre("contact.phone", c.phone)}${ancre("contact.email", c.email)}${ancre("contact.city", c.city)}${(
    c.links ?? []
  )
    .map((l, i) => ancre(`contact.links.${i}.url`, l.url.replace(/^https?:\/\//, "")))
    .join("")}</div>`;
  const tete = `<h1>${ancre("identity.full_name", nom || "Prénom Nom")}</h1>${ancre("identity.headline", id.headline ?? "Poste visé", "span", "intitule")}`;
  if (colonnes === 1) return `${tete}${contact}`;
  return `${tete}<h2>Contact</h2>${contact}`;
}

/** Le HTML ancré d'un CV dans un modèle. Le nombre de pages est estimé
 *  au volume de texte, comme le vrai serveur le fait par mesure. */
export function htmlDuCv(
  cv: CvRecu,
  templateId: string,
  atelier = true,
): { html: string; pages: number; warnings: string[] } {
  const modele = MODELES[templateId] ?? MODELES["9b2e7c41-3f6d-4a8b-b1c2-5e7f9a0d1b02"];
  const volume = JSON.stringify(cv).length;
  const pages = volume > 2_600 ? 2 : 1;
  const competences = (cv.skills ?? []).map((s) => s.name);
  const langues = (cv.languages ?? []).map((l) => l.language);
  const interets = (cv.interests ?? []).map((i) => i.name);
  const apropos = cv.summary
    ? `<h2>À propos</h2>${ancre("summary", cv.summary, "p")}`
    : "";
  const coupures = Array.from(
    { length: pages - 1 },
    (_, i) => `<div class="coupure" style="top:${(i + 1) * PAGE_HAUTEUR_MM}mm"></div>`,
  ).join("");

  const corps =
    modele.colonnes === 1
      ? `<div class="corps">${entete(cv, 1)}${apropos}${rubriqueExperiences(cv)}${rubriqueFormations(cv)}${pastilles("Compétences", "skills", competences)}${pastilles("Langues", "languages", langues)}${pastilles("Centres d'intérêt", "interests", interets)}</div>`
      : `<aside class="bande">${entete(cv, 2)}${pastilles("Compétences", "skills", competences)}${pastilles("Langues", "languages", langues)}</aside><div class="corps">${apropos}${rubriqueExperiences(cv)}${rubriqueFormations(cv)}${pastilles("Centres d'intérêt", "interests", interets)}</div>`;

  const warnings: string[] = [];
  if (!cv.identity?.headline) warnings.push("headline_missing");
  if (modele.colonnes === 2 && modele.label !== "Marketing")
    warnings.push("photo_missing");
  if (pages > 1) warnings.push("more_than_one_page");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>fit</title><style>${styleDePage(modele.accent, modele.police, modele.colonnes, pages)}</style></head><body><div class="page">${corps}${atelier ? coupures : ""}</div>${scriptDeFit(pages)}</body></html>`;
  return { html, pages, warnings };
}

export function htmlDeLettre(
  lettre: LettreRecue,
  templateId: string,
): { html: string; pages: number; warnings: string[] } {
  const modele = MODELES[templateId] ?? MODELES["9b2e7c41-3f6d-4a8b-b1c2-5e7f9a0d1b02"];
  const s = lettre.sender ?? {};
  const r = lettre.recipient ?? {};
  const nom = `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim();
  const paragraphes = (lettre.paragraphs ?? []).filter(
    (p) => (p.text ?? "").trim() !== "",
  );
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const logo =
    r.logo_url && r.logo_url.startsWith("https://storage.karria.fr/")
      ? `<img src="${echapper(r.logo_url)}" alt="" style="height:12mm;margin-bottom:3mm">`
      : "";
  const warnings: string[] = [];
  if (paragraphes.length < 2) warnings.push("too_few_paragraphs");
  if (paragraphes.length > 5) warnings.push("too_many_paragraphs");
  if (!(lettre.subject ?? "").startsWith("Candidature"))
    warnings.push("subject_not_explicit");
  if (!lettre.closing) warnings.push("closing_missing");
  if (!r.company) warnings.push("company_missing");
  if (r.logo_url && logo === "") warnings.push("logo_unavailable");
  const corpsTexte = paragraphes.reduce((n, p) => n + (p.text ?? "").length, 0);
  if (corpsTexte > 3_200) warnings.push("body_too_long");

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>fit</title><style>${styleDePage(modele.accent, modele.police, 1, 1)}
  .lettre { padding: 20mm 22mm; font-size: 11pt; line-height: 1.6; }
  .exp { margin-bottom: 8mm; } .exp span { display: block; font-size: 9.5pt; color: #444; } .exp .nom { font-weight: 700; font-size: 12pt; color: #1b1b1b; }
  .dest { text-align: right; margin-bottom: 8mm; } .dest span { display: block; }
  .objet { font-weight: 700; color: ${modele.accent}; margin: 6mm 0; }
  p { margin: 0 0 4mm; text-align: justify; }
  .signature { margin-top: 10mm; font-weight: 700; }
  </style></head><body><div class="page"><div class="lettre">
  <div class="exp">${ancre("sender.full_name", nom, "span", "nom")}${ancre("sender.headline", s.headline)}${ancre("sender.email", s.email)}${ancre("sender.phone", s.phone)}${ancre("sender.city", s.city)}</div>
  <div class="dest">${logo}${ancre("recipient.company", r.company)}${ancre("recipient.city", r.city)}<span>${s.city ? `${echapper(s.city)}, le ${date}` : `Le ${date}`}</span></div>
  ${ancre("subject", lettre.subject, "div", "objet")}
  ${ancre("greeting", lettre.greeting ?? "Madame, Monsieur,", "p")}
  ${paragraphes.map((p, i) => ancre(`paragraphs.${i}.text`, p.text, "p")).join("")}
  ${ancre("closing", lettre.closing ?? "Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.", "p")}
  <div class="signature">${echapper(nom)}</div>
  </div></div>${scriptDeFit(1)}</body></html>`;
  return { html, pages: 1, warnings };
}

// ─────────────────────────────────────────────────────────────────────
// Le score ATS simulé
// ─────────────────────────────────────────────────────────────────────

function scoreAts(cv: CvRecu, motsCles: string[]): Record<string, unknown> {
  const texte = sansAccents(JSON.stringify(cv));
  const c = cv.contact ?? {};
  const contact = (c.email ? 5 : 0) + (c.phone ? 5 : 0);
  const apropos = (cv.summary ?? "").length;
  const content = Math.min(
    12,
    Math.round(apropos / 60) +
      (cv.experiences ?? []).reduce((n, e) => n + (e.missions?.length ?? 0), 0),
  );
  const couverts = motsCles.filter((m) => texte.includes(sansAccents(m)));
  const keywords =
    motsCles.length === 0
      ? null
      : {
          coverage: couverts.length / motsCles.length,
          covered: couverts,
          missing: motsCles.filter((m) => !couverts.includes(m)),
        };
  const checks = [
    {
      key: "text_layer",
      label: "Texte lisible par une machine",
      points: 20,
      max_points: 20,
      finding: null,
      tip: null,
    },
    {
      key: "fonts",
      label: "Polices exploitables",
      points: 6,
      max_points: 8,
      finding: "Un intitulé espacé",
      tip: "Des intitulés très espacés se lisent lettre à lettre : active la variante optimisée.",
    },
    {
      key: "reading_order",
      label: "Ordre de lecture",
      points: 10,
      max_points: 10,
      finding: null,
      tip: null,
    },
    {
      key: "contact",
      label: "Coordonnées trouvées",
      points: contact,
      max_points: 10,
      finding: contact < 10 ? "Téléphone ou e-mail absent" : null,
      tip:
        contact < 10
          ? "Ajoute un téléphone et un e-mail : c'est ce que le logiciel cherche en premier."
          : null,
    },
    {
      key: "layout",
      label: "Mise en page",
      points: 8,
      max_points: 10,
      finding: null,
      tip: "Une seule colonne passe mieux chez certains logiciels.",
    },
    {
      key: "sections",
      label: "Rubriques reconnues",
      points: 10,
      max_points: 10,
      finding: null,
      tip: null,
    },
    {
      key: "content",
      label: "Contenu exploitable",
      points: content,
      max_points: 12,
      finding: content < 12 ? "À-propos ou missions courts" : null,
      tip:
        content < 12
          ? "Développe ton à-propos et détaille tes missions : le logiciel y lit tes compétences."
          : null,
    },
    ...(keywords === null
      ? []
      : [
          {
            key: "keywords",
            label: "Mots-clés de l'offre",
            points: Math.round(keywords.coverage * 20),
            max_points: 20,
            finding:
              keywords.missing.length > 0
                ? `${keywords.missing.length} mot(s) absent(s)`
                : null,
            tip:
              keywords.missing.length > 0
                ? "Reprends les mots de l'offre, quand ils sont vrais pour toi."
                : null,
          },
        ]),
  ];
  const score = Math.round(
    (checks.reduce((n, k) => n + k.points, 0) /
      checks.reduce((n, k) => n + k.max_points, 0)) *
      100,
  );
  return {
    score,
    level: score >= 85 ? "good" : score >= 70 ? "fair" : "poor",
    format: "pdf",
    checks,
    keywords,
    explanation: null,
    explanation_status: "unavailable",
    suggest_ats_safe: true,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Le routage
// ─────────────────────────────────────────────────────────────────────

/** Les routes de ce faux serveur — les exports (`/cv/me/generated-cvs`,
 *  liste, création, suppression) compris. */
export function estUneRouteAtelier(_methode: string, chemin: string): boolean {
  const seul = chemin.split("?")[0];
  return (
    seul.startsWith("/documents/") ||
    seul === "/user-templates/me/selected" ||
    seul.startsWith("/cv/me/generated-cvs")
  );
}

function jourUtc(iso: string): string {
  return iso.slice(0, 10);
}

function nouvelExport(
  kind: "cv" | "letter",
  templateId: string,
  dossierId: string | null,
  companyName: string | null,
  atsSafe: boolean,
  ats: Record<string, unknown>,
  pages: number,
  maintenant: number,
): ExportSimule {
  const modele = MODELES[templateId] ?? MODELES["9b2e7c41-3f6d-4a8b-b1c2-5e7f9a0d1b02"];
  const id = identifiant("exp");
  return {
    id,
    kind,
    template: { id: templateId, label: modele.label, version: 1 },
    ats_safe: atsSafe,
    dossier_id: dossierId,
    company_name: companyName,
    created_at: new Date(maintenant).toISOString(),
    pdf_url: `https://storage.karria.fr/simule/${id}.pdf`,
    docx_url: `https://storage.karria.fr/simule/${id}.docx`,
    fit: { spacing: 1, font_scale: 1, pages },
    ats,
  };
}

export function repondreAtelier(
  methode: string,
  chemin: string,
  corps: unknown,
  maintenant: number = Date.now(),
): Response {
  const [cheminSeul, requete = ""] = chemin.split("?");
  const route = `${methode} ${cheminSeul}`;
  const params = new URLSearchParams(requete);

  if (route === "GET /user-templates/me/selected") {
    if (etat.selection === null) return json(204, undefined);
    const modele = MODELES[etat.selection.template_id];
    return json(200, {
      template: {
        id: etat.selection.template_id,
        label: modele?.label ?? "Modèle",
        version: 1,
      },
      ats_safe: etat.selection.ats_safe,
      updated_at: etat.selection.updated_at,
    });
  }

  if (route === "PUT /user-templates/me/selected") {
    const templateId = champ(corps, "template_id");
    if (typeof templateId !== "string" || MODELES[templateId] === undefined) {
      return erreur(404, "template_not_found", "Modèle inconnu.");
    }
    if (MODELES[templateId].premium && !etat.possedes.has(templateId)) {
      return erreur(403, "template_locked", "Ce modèle Premium n'est pas à toi.", {
        template_id: templateId,
      });
    }
    etat.selection = {
      template_id: templateId,
      ats_safe: champ(corps, "ats_safe") === true,
      updated_at: new Date(maintenant).toISOString(),
    };
    return json(200, {
      template: { id: templateId, label: MODELES[templateId].label, version: 1 },
      ats_safe: etat.selection.ats_safe,
      updated_at: etat.selection.updated_at,
    });
  }

  const rendu = /^\/documents\/([^/]+)\/render$/.exec(cheminSeul);
  if (rendu !== null && methode === "POST") {
    const templateId = rendu[1];
    const modele = MODELES[templateId];
    if (modele === undefined)
      return erreur(404, "template_not_found", "Modèle inconnu ou non publié.");
    if (params.get("sample") === "true") {
      return json(200, htmlDuCv(CV_EXEMPLE, templateId, false));
    }
    if (modele.premium && !etat.possedes.has(templateId)) {
      return erreur(403, "template_not_owned", "Ce modèle Premium n'est pas à toi.", {
        template_id: templateId,
      });
    }
    const letter = champ(corps, "letter");
    const cv = champ(corps, "cv");
    if (letter && typeof letter === "object")
      return json(200, htmlDeLettre(letter as LettreRecue, templateId));
    if (cv && typeof cv === "object")
      return json(200, htmlDuCv(cv as CvRecu, templateId, true));
    return erreur(422, "nothing_to_render", "Ni CV, ni lettre.");
  }

  if (route === "GET /cv/me/generated-cvs") {
    const dossierId = params.get("dossier_id");
    const kind = params.get("kind");
    if (kind !== null && kind !== "cv" && kind !== "letter") {
      return erreur(422, "invalid_input", "Genre inconnu.", { field: "kind" });
    }
    const items = [...etat.exports.values(), ...exportsSimulesDesDossiers()]
      .filter(
        (e) =>
          (dossierId === null || e.dossier_id === dossierId) &&
          (kind === null || e.kind === kind),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return json(200, { items, total: items.length });
  }

  const unExport = /^\/cv\/me\/generated-cvs\/([^/]+)$/.exec(cheminSeul);
  if (unExport !== null && methode === "DELETE") {
    if (etat.exports.delete(unExport[1]) || supprimerExportSimuleDeDossier(unExport[1]))
      return json(204, undefined);
    return erreur(404, "generated_cv_not_found", "Export inconnu.");
  }
  if (unExport !== null && methode === "GET") {
    const e =
      etat.exports.get(unExport[1]) ??
      exportsSimulesDesDossiers().find((x) => x.id === unExport[1]);
    return e === undefined
      ? erreur(404, "generated_cv_not_found", "Export inconnu.")
      : json(200, e);
  }

  if (route === "POST /cv/me/generated-cvs") {
    // Sans `cv` : le CV de base, comme le vrai serveur.
    const cv = champ(corps, "cv") ?? cvSimule();
    if (!cv || typeof cv !== "object") {
      return erreur(409, "cv_missing", "Il te faut d'abord un CV.");
    }
    const templateId =
      typeof champ(corps, "template_id") === "string"
        ? (champ(corps, "template_id") as string)
        : etat.selection?.template_id;
    if (templateId === undefined || MODELES[templateId] === undefined)
      return erreur(404, "template_not_found", "Aucun modèle choisi.");
    if (MODELES[templateId].premium && !etat.possedes.has(templateId)) {
      return erreur(403, "template_locked", "Ce modèle Premium n'est pas à toi.", {
        template_id: templateId,
      });
    }
    const dossierId =
      typeof champ(corps, "dossier_id") === "string"
        ? (champ(corps, "dossier_id") as string)
        : null;
    const { pages } = htmlDuCv(cv as CvRecu, templateId, false);
    const exporte = nouvelExport(
      "cv",
      templateId,
      dossierId,
      null,
      champ(corps, "ats_safe") === true,
      scoreAts(cv as CvRecu, motsClesDe(dossierId)),
      pages,
      maintenant,
    );
    etat.exports.set(exporte.id, exporte);
    return json(201, exporte);
  }

  if (route === "POST /documents/letters/export") {
    const letter = champ(corps, "letter");
    if (!letter || typeof letter === "string")
      return erreur(422, "letter_invalid", "Une lettre est attendue.");
    const templateId =
      typeof champ(corps, "template_id") === "string"
        ? (champ(corps, "template_id") as string)
        : etat.selection?.template_id;
    if (templateId === undefined || MODELES[templateId] === undefined)
      return erreur(404, "template_not_found", "Aucun modèle choisi.");
    if (MODELES[templateId].premium && !etat.possedes.has(templateId)) {
      return erreur(403, "template_locked", "Ce modèle Premium n'est pas à toi.", {
        template_id: templateId,
      });
    }
    const dossierId =
      typeof champ(corps, "dossier_id") === "string"
        ? (champ(corps, "dossier_id") as string)
        : null;
    const entreprise = (letter as LettreRecue).recipient?.company ?? null;
    const exporte = nouvelExport(
      "letter",
      templateId,
      dossierId,
      entreprise,
      false,
      { explanation: null, explanation_status: "unavailable" },
      1,
      maintenant,
    );
    etat.exports.set(exporte.id, exporte);
    return json(201, exporte);
  }

  const unEnvoi = /^\/documents\/exports\/([^/]+)\/send$/.exec(cheminSeul);
  if (
    route === "POST /documents/exports/send" ||
    (unEnvoi !== null && methode === "POST")
  ) {
    const ids = unEnvoi !== null ? [unEnvoi[1]] : champ(corps, "generated_ids");
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 4) {
      return erreur(422, "documents_count_invalid", "Entre 1 et 4 documents.");
    }
    for (const id of ids) {
      if (
        typeof id !== "string" ||
        (!etat.exports.has(id) && !exportsSimulesDesDossiers().some((e) => e.id === id))
      )
        return erreur(404, "generated_cv_not_found", "Export inconnu.");
    }
    const to = champ(corps, "to");
    if (
      to !== null &&
      to !== undefined &&
      (typeof to !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
    ) {
      return erreur(422, "recipient_invalid", "Adresse mal formée.", { field: "to" });
    }
    const adresse = typeof to === "string" ? to : ADRESSE_DU_COMPTE;
    const tiers = adresse !== ADRESSE_DU_COMPTE;
    const aujourdHui = jourUtc(new Date(maintenant).toISOString());
    const duJour = [...etat.envois.values()].filter(
      (e) => jourUtc(e.created_at) === aujourdHui,
    );
    const secondesAvantMinuit = 86_400 - (Math.floor(maintenant / 1000) % 86_400);
    if (duJour.length >= ENVOIS_PAR_JOUR) {
      return erreur(429, "send_quota_exceeded", "Cinq envois par jour.", {
        scope: "account",
        retry_after: secondesAvantMinuit,
      });
    }
    if (tiers && duJour.filter((e) => e.to === adresse).length >= ENVOIS_PAR_TIERS) {
      return erreur(
        429,
        "send_quota_exceeded",
        "Deux envois par jour vers une adresse tierce.",
        { scope: "recipient", retry_after: secondesAvantMinuit },
      );
    }
    const envoi: EnvoiSimule = {
      id: identifiant("snd"),
      status: "queued",
      to: adresse,
      generated_ids: [...new Set(ids as string[])],
      created_at: new Date(maintenant).toISOString(),
      sent_at: null,
      tiers,
    };
    etat.envois.set(envoi.id, envoi);
    const { tiers: _, ...reponse } = envoi;
    return json(202, reponse);
  }

  const envoi = /^\/documents\/sends\/([^/]+)$/.exec(cheminSeul);
  if (envoi !== null && methode === "GET") {
    const e = etat.envois.get(envoi[1]);
    if (e === undefined) return erreur(404, "send_not_found", "Envoi inconnu.");
    // La remise est un travail de file : « envoyé » à la relecture.
    if (e.status === "queued") {
      e.status = "sent";
      e.sent_at = new Date(maintenant).toISOString();
    }
    const { tiers: _, ...reponse } = e;
    return json(200, reponse);
  }

  return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
}

/** Les mots-clés d'une offre, pour le score simulé : on ne lit pas le faux
 *  serveur des dossiers (il est à un autre contrat) ; quelques mots de
 *  commerce suffisent à exercer « Mots-clés de l'offre ». */
function motsClesDe(dossierId: string | null): string[] {
  return dossierId === null
    ? []
    : ["vente", "relation client", "caisse", "merchandising"];
}

const CV_EXEMPLE: CvRecu = {
  summary:
    "Conseillère de vente depuis trois ans, j'aime le contact client et le travail en équipe.",
  identity: { first_name: "Awa", last_name: "Diallo", headline: "Conseillère de vente" },
  contact: {
    email: "awa.diallo@gmail.com",
    phone: "06 12 34 56 78",
    city: "Montreuil",
    links: [{ label: "LinkedIn", url: "https://linkedin.com/in/awa-diallo" }],
  },
  experiences: [
    {
      position: "Vendeuse",
      company: "Zara",
      location: "Paris",
      start_date: "2022-09",
      end_date: null,
      is_current: true,
      missions: [
        "Accueillir et conseiller les clients",
        "Tenir la caisse",
        "Ranger la réserve",
      ],
    },
    {
      position: "Hôtesse de caisse",
      company: "Carrefour",
      location: "Montreuil",
      start_date: "2021-06",
      end_date: "2022-08",
      is_current: false,
      missions: ["Encaisser", "Accueillir les clients"],
    },
  ],
  educations: [
    {
      degree: "BTS Management commercial opérationnel",
      school: "Lycée Jean Jaurès",
      location: "Montreuil",
      start_date: "2019-09",
      end_date: "2021-06",
      is_in_progress: false,
    },
  ],
  skills: [{ name: "Vente" }, { name: "Encaissement" }, { name: "Travail en équipe" }],
  languages: [{ language: "Anglais" }, { language: "Espagnol" }],
  interests: [{ name: "Danse" }, { name: "Bénévolat" }],
};

semer(Date.now());
