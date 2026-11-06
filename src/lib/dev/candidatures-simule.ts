/**
 * Le faux serveur des dossiers de candidature — le contrat
 * `docs/contrat-api-candidatures.md` (module `applications`), en exécutable.
 *
 * ═══ Ce qu'il fige ═══
 *
 * La forme exacte du `Dossier` et de la `DossierCard`, les codes d'erreur
 * (`cv_missing`, `offer_not_found`, `adaptation_in_progress`,
 * `adaptation_not_failed`, `proposition_path_invalid`, `letter_missing`,
 * `paragraph_not_found`, `cv_invalid`, `letter_invalid`), la porte du
 * consentement à l'IA sur les quatre routes qui confient des données à un
 * modèle, et le va-et-vient avec le fil (« j'ai candidaté » marque l'offre
 * `applied`).
 *
 * ═══ Synchrone, puis différé — reproduit ═══
 *
 * Le vrai serveur adapte le CV dans la requête pendant dix secondes au
 * plus, puis continue en arrière-plan. Ici, un dossier ouvert arrive
 * `adaptation: en_cours` et devient `faite` quelques secondes plus tard,
 * **à la relecture** : c'est ce qui exerce la relecture toutes les 2 s de
 * l'app, et l'état « Karria adapte ton CV… » de la liste.
 *
 * ═══ Karria n'est pas ici ═══
 *
 * Les propositions et la lettre sont fabriquées par quelques règles de
 * texte (l'intitulé de l'offre, ses mots-clés, le nom de l'entreprise) :
 * assez pour concevoir l'atelier et l'espace Candidatures, jamais pour
 * juger ce que Gemini écrirait.
 *
 * ═══ Trois dossiers d'avance ═══
 *
 * Sans CV ni dossier, l'espace serait vide à chaque rechargement et l'on
 * ne verrait jamais la liste. Trois dossiers sont donc posés au départ sur
 * un CV d'exemple : un candidaté, un prêt avec sa lettre, un en cours
 * d'adaptation. `POST /applications`, lui, copie le vrai CV de base du
 * faux serveur CV (`409 cv_missing` s'il n'existe pas), comme le contrat.
 */

import { consentementIaAccorde, refusIa } from "./consentement-simule";
import { cvSimule } from "./cv-simule";
import { trouverModele } from "./modeles-simule";
import { marquerPostuleeSimulee, offreSimulee } from "./offres-simule";

// ─────────────────────────────────────────────────────────────────────
// Les formes
// ─────────────────────────────────────────────────────────────────────

type Statut = "brouillon" | "pret" | "candidate";
type Adaptation = "en_cours" | "faite" | "echouee";
type EtatProposition = "proposee" | "acceptee" | "refusee";
type Sorte =
  "interet_entreprise" | "interet_poste" | "competences" | "pourquoi_moi" | "libre";

interface OffreFigee {
  offer_id: string;
  title: string;
  company: string | null;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  contract: string | null;
  contract_label: string | null;
  source_url: string | null;
  excerpt: string;
  description: string;
  keywords: string[];
  published_at: string;
}

interface Proposition {
  id: string;
  path: string;
  before: unknown;
  after: unknown;
  reason: string;
  state: EtatProposition;
}

interface Paragraphe {
  kind: Sorte;
  text: string;
}

interface Lettre {
  recipient: string;
  subject: string;
  paragraphs: Paragraphe[];
  closing: string;
}

interface DossierSimule {
  id: string;
  offer: OffreFigee;
  template_id: string | null;
  /** La couleur principale posée par la personne (`#RRGGBB`), ou `null` (ADR-0034). */
  primary_color: string | null;
  /** Le style de lettre retenu (`template` | `plain`), ou `null` : par défaut (ADR-0036). */
  letter_style: "template" | "plain" | null;
  cv: Record<string, unknown>;
  cv_base_hash: string;
  base_changed: boolean;
  propositions: Proposition[];
  letter: Lettre | null;
  adaptation: Adaptation;
  adaptation_error: string | null;
  /** L'instant où l'adaptation « en cours » aboutit, relue ensuite. */
  adaptation_prete_a: number | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ExportSimule {
  id: string;
  kind: "cv" | "letter";
  dossier_id: string;
  company_name: string | null;
  template: { id: string; label: string; version: number };
  created_at: string;
  pdf_url: string;
  docx_url: string | null;
}

const SORTES: readonly Sorte[] = [
  "interet_entreprise",
  "interet_poste",
  "competences",
  "pourquoi_moi",
  "libre",
];

/** Le délai de l'adaptation différée, en millisecondes. */
export const DELAI_ADAPTATION_MS = 6_000;

const PARAGRAPHES_MAX = 6;
const PARAGRAPHE_MAX = 1_200;
const COURT_MAX = 200;
const FORMULE_MAX = 300;
const INSTRUCTION_MAX = 300;

// ─────────────────────────────────────────────────────────────────────
// L'outillage
// ─────────────────────────────────────────────────────────────────────

const CODES: Record<number, string> = {
  403: "forbidden",
  404: "not_found",
  409: "rule_violation",
  422: "invalid_input",
  503: "dependency_failure",
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

function ilYa(heures: number, maintenant: number): string {
  return new Date(maintenant - heures * 3_600_000).toISOString();
}

function sansAccents(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Une empreinte courte et stable d'un objet JSON. */
function empreinte(valeur: unknown): string {
  const texte = JSON.stringify(valeur);
  let h = 0;
  for (let i = 0; i < texte.length; i += 1) h = (h * 31 + texte.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

function copie<T>(valeur: T): T {
  return JSON.parse(JSON.stringify(valeur)) as T;
}

// ─────────────────────────────────────────────────────────────────────
// Le CV d'exemple des dossiers d'avance
// ─────────────────────────────────────────────────────────────────────

const CV_EXEMPLE: Record<string, unknown> = {
  summary:
    "Conseillère de vente depuis trois ans, j'aime le contact client et le travail en équipe. Je cherche un poste où apprendre et évoluer.",
  identity: { first_name: "Awa", last_name: "Diallo", headline: "Vendeuse" },
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
      missions: ["Accueillir les clients", "Tenir la caisse", "Ranger la réserve"],
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
  skills: [
    { name: "Vente", level: "Avancé" },
    { name: "Encaissement", level: "Avancé" },
    { name: "Travail en équipe", level: "Intermédiaire" },
  ],
  languages: [
    { language: "Anglais", level: "B2" },
    { language: "Espagnol", level: "A2" },
  ],
  interests: [
    { name: "Danse", category: "Sport" },
    { name: "Bénévolat aux Restos du cœur", category: "Associatif" },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// Ce que « Karria » fabrique
// ─────────────────────────────────────────────────────────────────────

/** Les mots-clés de l'offre : des mots du titre et des têtes de phrase du
 *  texte, sans accents, les plus courts écartés. */
function motsCles(titre: string, description: string): string[] {
  const texte = sansAccents(`${titre} ${description}`).replace(/[*\n]/g, " ");
  const mots = texte.split(/[^a-z0-9]+/).filter((m) => m.length > 4);
  const uniques = [...new Set(mots)];
  const sansBruit = uniques.filter(
    (m) =>
      ![
        "rejoindre",
        "equipe",
        "participerez",
        "projets",
        "quotidien",
        "accompagnement",
        "arrivee",
        "contribuer",
        "travailler",
        "autres",
        "metiers",
        "proposer",
        "ameliorations",
        "profil",
        "motivation",
        "envie",
        "apprendre",
        "relationnel",
        "conditions",
        "poste",
        "mutuelle",
        "tickets",
        "restaurant",
        "recherchons",
        "missions",
      ].includes(m),
  );
  return [
    sansAccents(titre)
      .replace(/[^a-z0-9 ]/g, " ")
      .trim(),
    ...sansBruit,
  ].slice(0, 8);
}

function figer(offre: NonNullable<ReturnType<typeof offreSimulee>>): OffreFigee {
  return {
    offer_id: offre.id,
    title: offre.title,
    company: offre.company?.name ?? null,
    logo_url: offre.company?.logo ?? null,
    website: offre.company?.website ?? null,
    city: offre.location_label ?? offre.city?.name ?? null,
    contract: offre.contract_type?.code ?? null,
    contract_label: offre.contract_type?.label ?? null,
    source_url: offre.apply_url ?? offre.origin_url ?? null,
    excerpt: offre.excerpt,
    description: offre.description ?? offre.excerpt,
    keywords: motsCles(offre.title, offre.description ?? ""),
    published_at: offre.published_at,
  };
}

/** Les mots-clés de l'offre qui se lisent dans le CV adapté — la règle
 *  sans modèle de langage du contrat. */
function couverture(offre: OffreFigee, cv: Record<string, unknown>) {
  const texte = sansAccents(JSON.stringify(cv));
  const present = offre.keywords.filter((m) =>
    m.split(" ").every((mot) => texte.includes(mot)),
  );
  const missing = offre.keywords.filter((m) => !present.includes(m));
  return {
    present,
    missing,
    ratio: offre.keywords.length === 0 ? 0 : present.length / offre.keywords.length,
  };
}

/** Lit ou écrit un emplacement du CV (`identity.headline`,
 *  `experiences.0.missions.1`, `skills`…). */
function lireChemin(cv: Record<string, unknown>, chemin: string): unknown {
  let courant: unknown = cv;
  for (const morceau of chemin.split(".")) {
    if (typeof courant !== "object" || courant === null) return undefined;
    courant = (courant as Record<string, unknown>)[morceau];
  }
  return courant;
}

function ecrireChemin(
  cv: Record<string, unknown>,
  chemin: string,
  valeur: unknown,
): boolean {
  const morceaux = chemin.split(".");
  const dernier = morceaux.pop();
  if (dernier === undefined) return false;
  let courant: unknown = cv;
  for (const morceau of morceaux) {
    if (typeof courant !== "object" || courant === null) return false;
    courant = (courant as Record<string, unknown>)[morceau];
  }
  if (typeof courant !== "object" || courant === null) return false;
  const parent = courant as Record<string, unknown>;
  if (!(dernier in parent)) return false;
  parent[dernier] = copie(valeur);
  return true;
}

/** Les propositions de « Karria » pour cette offre, et les deux qu'elle
 *  applique d'office (intitulé, à-propos), `before` conservé. */
function adapter(dossier: DossierSimule): void {
  const cv = dossier.cv;
  const offre = dossier.offer;
  const propositions: Proposition[] = [];
  const identity = cv.identity as Record<string, unknown> | null;
  const entreprise = offre.company ?? "votre entreprise";

  if (identity !== null && typeof identity === "object") {
    const avant = identity.headline ?? null;
    const apres = offre.title.replace(/\s*\(h\/f\)\s*$/i, "").trim();
    if (avant !== apres) {
      propositions.push({
        id: identifiant("prop"),
        path: "identity.headline",
        before: avant,
        after: apres,
        reason: "L'offre nomme le poste ainsi.",
        state: "acceptee",
      });
      identity.headline = apres;
    }
  }

  const resume = cv.summary;
  if (typeof resume === "string" && resume.trim() !== "") {
    const apres = `${resume.replace(/\.\s*$/, "")}. Je souhaite rejoindre ${entreprise} comme ${offre.title.toLowerCase()}.`;
    propositions.push({
      id: identifiant("prop"),
      path: "summary",
      before: resume,
      after: apres,
      reason: "Ton à-propos dit maintenant pourquoi cette offre.",
      state: "acceptee",
    });
    cv.summary = apres;
  }

  const experiences = cv.experiences;
  if (Array.isArray(experiences) && experiences.length > 0) {
    const premiere = experiences[0] as Record<string, unknown>;
    const missions = premiere.missions;
    if (Array.isArray(missions) && typeof missions[0] === "string") {
      const avant = missions[0] as string;
      propositions.push({
        id: identifiant("prop"),
        path: "experiences.0.missions.0",
        before: avant,
        after: `${avant}, en lien avec les attentes de ${entreprise}`,
        reason: "L'offre insiste sur ce point.",
        state: "proposee",
      });
    }
  }

  const skills = cv.skills;
  if (Array.isArray(skills) && skills.length > 1) {
    const reordonnees = [...skills].reverse();
    propositions.push({
      id: identifiant("prop"),
      path: "skills",
      before: copie(skills),
      after: reordonnees,
      reason: "Les compétences que l'offre cite en premier.",
      state: "proposee",
    });
  }

  dossier.propositions = propositions;
  dossier.adaptation = "faite";
  dossier.adaptation_error = null;
  dossier.adaptation_prete_a = null;
}

function ebaucher(dossier: DossierSimule): Lettre {
  const offre = dossier.offer;
  const entreprise = offre.company ?? "votre entreprise";
  const identity = (dossier.cv.identity ?? {}) as Record<string, unknown>;
  const poste = typeof identity.headline === "string" ? identity.headline : offre.title;
  const skills = (dossier.cv.skills ?? []) as { name: string }[];
  const competences = skills
    .slice(0, 3)
    .map((s) => s.name.toLowerCase())
    .join(", ");
  return {
    recipient: "Madame, Monsieur,",
    subject: `Candidature au poste de ${offre.title}`,
    paragraphs: [
      {
        kind: "interet_entreprise",
        text: `${entreprise} m'attire par ce qu'elle construit et par la place qu'elle donne à ses équipes${offre.city ? `, à ${offre.city}` : ""}.`,
      },
      {
        kind: "interet_poste",
        text: `Le poste de ${offre.title.toLowerCase()} correspond à ce que je cherche aujourd'hui : un rôle où ${poste.toLowerCase()} rime avec responsabilité et apprentissage.`,
      },
      {
        kind: "competences",
        text:
          competences === ""
            ? "Mon parcours m'a donné le sens du service et le goût du travail bien fait."
            : `Mon parcours m'a donné ${competences} — des atouts que je mettrai au service de vos objectifs dès le premier jour.`,
      },
      {
        kind: "pourquoi_moi",
        text: "Je serais heureuse d'échanger avec vous sur ce que je peux apporter à votre équipe.",
      },
    ],
    closing: "Je vous prie d'agréer, Madame, Monsieur, mes salutations distinguées.",
  };
}

function reecrire(texte: string, instruction: string | null): string {
  const base = texte.replace(/\s*\(réécrit.*\)\s*$/, "");
  if (instruction !== null && /court/i.test(instruction)) {
    const phrases = base.split(/(?<=[.!?])\s+/);
    return phrases[0] ?? base;
  }
  return `${base} (réécrit${instruction ? ` : ${instruction}` : ""})`;
}

// ─────────────────────────────────────────────────────────────────────
// L'état, et les projections
// ─────────────────────────────────────────────────────────────────────

const etat = {
  dossiers: new Map<string, DossierSimule>(),
  exports: [] as ExportSimule[],
};

function statutDe(d: DossierSimule): Statut {
  if (d.applied_at !== null) return "candidate";
  if (d.adaptation !== "faite") return "brouillon";
  return d.propositions.some((p) => p.state === "proposee") ? "brouillon" : "pret";
}

/** L'adaptation différée aboutit à la relecture, passé son délai. */
function rattraper(d: DossierSimule, maintenant: number): void {
  if (
    d.adaptation === "en_cours" &&
    d.adaptation_prete_a !== null &&
    maintenant >= d.adaptation_prete_a
  ) {
    adapter(d);
    d.updated_at = new Date(maintenant).toISOString();
  }
}

function versDossier(d: DossierSimule) {
  return {
    id: d.id,
    offer: d.offer,
    template_id: d.template_id,
    primary_color: d.primary_color,
    letter_style: d.letter_style,
    cv: d.cv,
    cv_base_hash: d.cv_base_hash,
    base_changed: d.base_changed,
    propositions: d.propositions,
    letter: d.letter,
    coverage: couverture(d.offer, d.cv),
    status: statutDe(d),
    adaptation: d.adaptation,
    adaptation_error: d.adaptation_error,
    applied_at: d.applied_at,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

function versCarte(d: DossierSimule) {
  const { offer_id, title, company, logo_url, city, contract_label, source_url } =
    d.offer;
  return {
    id: d.id,
    offer: { offer_id, title, company, logo_url, city, contract_label, source_url },
    template_id: d.template_id,
    primary_color: d.primary_color,
    letter_style: d.letter_style,
    status: statutDe(d),
    adaptation: d.adaptation,
    coverage_ratio: couverture(d.offer, d.cv).ratio,
    pending_propositions: d.propositions.filter((p) => p.state === "proposee").length,
    has_letter: d.letter !== null,
    applied_at: d.applied_at,
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

function nouveauDossier(
  offre: OffreFigee,
  cv: Record<string, unknown>,
  maintenant: number,
  template: string | null,
): DossierSimule {
  const quand = new Date(maintenant).toISOString();
  return {
    id: identifiant("dos"),
    offer: offre,
    template_id: template,
    primary_color: null,
    letter_style: null,
    cv: copie(cv),
    cv_base_hash: empreinte(cv),
    base_changed: false,
    propositions: [],
    letter: null,
    adaptation: "en_cours",
    adaptation_error: null,
    adaptation_prete_a: maintenant + DELAI_ADAPTATION_MS,
    applied_at: null,
    created_at: quand,
    updated_at: quand,
  };
}

/** Les trois dossiers d'avance (voir l'en-tête). */
function semer(maintenant: number): void {
  const paris = offreSimulee("0f1e2d3c-0000-4000-8000-000000000006"); // Maison Kayser
  const lyon = offreSimulee("0f1e2d3c-0000-4000-8000-000000000005"); // Alan
  const marseille = offreSimulee("0f1e2d3c-0000-4000-8000-000000000007"); // Big Mamma
  if (paris === null || lyon === null || marseille === null) return;

  const candidate = nouveauDossier(
    figer(paris),
    CV_EXEMPLE,
    maintenant - 4 * 86_400_000,
    null,
  );
  adapter(candidate);
  for (const p of candidate.propositions)
    if (p.state === "proposee") p.state = "acceptee";
  candidate.letter = ebaucher(candidate);
  candidate.applied_at = ilYa(3 * 24, maintenant);
  candidate.updated_at = candidate.applied_at;
  marquerPostuleeSimulee(paris.id, true);
  etat.dossiers.set(candidate.id, candidate);
  etat.exports.push(
    {
      id: identifiant("exp"),
      kind: "cv",
      dossier_id: candidate.id,
      company_name: null,
      template: { id: "tpl_meridian", label: "Meridian", version: 1 },
      created_at: ilYa(3 * 24 + 1, maintenant),
      pdf_url: "https://storage.karria.fr/simule/cv-awa-diallo.pdf",
      docx_url: "https://storage.karria.fr/simule/cv-awa-diallo.docx",
    },
    {
      id: identifiant("exp"),
      kind: "letter",
      dossier_id: candidate.id,
      company_name: paris.company?.name ?? null,
      template: { id: "tpl_meridian", label: "Meridian", version: 1 },
      created_at: ilYa(3 * 24 + 1, maintenant),
      pdf_url: "https://storage.karria.fr/simule/lettre-maison-kayser.pdf",
      docx_url: null,
    },
  );

  const pret = nouveauDossier(figer(lyon), CV_EXEMPLE, maintenant - 26 * 3_600_000, null);
  adapter(pret);
  for (const p of pret.propositions) if (p.state === "proposee") p.state = "refusee";
  pret.letter = ebaucher(pret);
  pret.updated_at = ilYa(20, maintenant);
  etat.dossiers.set(pret.id, pret);

  const enCours = nouveauDossier(figer(marseille), CV_EXEMPLE, maintenant - 30_000, null);
  enCours.adaptation_prete_a = maintenant + DELAI_ADAPTATION_MS;
  etat.dossiers.set(enCours.id, enCours);
}

/** Repart de zéro, dossiers d'avance compris : pour les tests. */
export function reinitialiserCandidatures(maintenant: number = Date.now()): void {
  etat.dossiers.clear();
  etat.exports = [];
  semer(maintenant);
}

semer(Date.now());

// ─────────────────────────────────────────────────────────────────────
// Les validations
// ─────────────────────────────────────────────────────────────────────

function champsDuCv(cv: unknown): { field: string; message: string }[] {
  const fautes: { field: string; message: string }[] = [];
  if (typeof cv !== "object" || cv === null)
    return [{ field: "cv", message: "Un CV est attendu." }];
  const c = cv as Record<string, unknown>;
  const identity = c.identity as Record<string, unknown> | null | undefined;
  if (
    identity &&
    typeof identity === "object" &&
    !String(identity.first_name ?? "").trim()
  ) {
    fautes.push({ field: "identity.first_name", message: "Le prénom est requis." });
  }
  for (const liste of ["experiences", "educations", "skills", "languages", "interests"]) {
    if (!Array.isArray(c[liste]))
      fautes.push({ field: liste, message: "Une liste est attendue." });
  }
  return fautes;
}

function champsDeLaLettre(lettre: unknown): { field: string; message: string }[] {
  const fautes: { field: string; message: string }[] = [];
  if (typeof lettre !== "object" || lettre === null) {
    return [{ field: "letter", message: "Une lettre est attendue." }];
  }
  const l = lettre as Record<string, unknown>;
  for (const [cle, max] of [
    ["recipient", COURT_MAX],
    ["subject", COURT_MAX],
    ["closing", FORMULE_MAX],
  ] as const) {
    const v = l[cle];
    if (typeof v !== "string" || v.trim() === "")
      fautes.push({ field: cle, message: "Requis." });
    else if (v.length > max)
      fautes.push({ field: cle, message: `${max} caractères au plus.` });
  }
  const paragraphes = l.paragraphs;
  if (
    !Array.isArray(paragraphes) ||
    paragraphes.length === 0 ||
    paragraphes.length > PARAGRAPHES_MAX
  ) {
    fautes.push({
      field: "paragraphs",
      message: `Entre 1 et ${PARAGRAPHES_MAX} paragraphes.`,
    });
  } else {
    paragraphes.forEach((p: unknown, i) => {
      const kind = champ(p, "kind");
      const text = champ(p, "text");
      if (typeof kind !== "string" || !SORTES.includes(kind as Sorte)) {
        fautes.push({ field: `paragraphs.${i}.kind`, message: "Sorte inconnue." });
      }
      if (typeof text !== "string" || text.trim() === "") {
        fautes.push({ field: `paragraphs.${i}.text`, message: "Requis." });
      } else if (text.length > PARAGRAPHE_MAX) {
        fautes.push({
          field: `paragraphs.${i}.text`,
          message: `${PARAGRAPHE_MAX} caractères au plus.`,
        });
      }
    });
  }
  return fautes;
}

// ─────────────────────────────────────────────────────────────────────
// Le routage
// ─────────────────────────────────────────────────────────────────────

export function estUneRouteCandidature(chemin: string): boolean {
  return chemin.startsWith("/applications");
}

/** Les exports des dossiers d'avance, pour le faux serveur de l'atelier qui
 *  tient `GET /cv/me/generated-cvs` (une seule liste, dossiers et CV libres). */
export function exportsSimulesDesDossiers(): readonly ExportSimule[] {
  return etat.exports;
}

/** `DELETE /cv/me/generated-cvs/{id}` sur un export de dossier — vrai s'il existait. */
export function supprimerExportSimuleDeDossier(id: string): boolean {
  const avant = etat.exports.length;
  etat.exports = etat.exports.filter((e) => e.id !== id);
  return etat.exports.length < avant;
}

function porteIa(): Response {
  const refus = refusIa();
  return erreur(refus.statut, refus.raison, refus.message, refus.details);
}

function toucher(d: DossierSimule, maintenant: number): void {
  d.updated_at = new Date(maintenant).toISOString();
}

export function repondreCandidatures(
  methode: string,
  chemin: string,
  corps: unknown,
  maintenant: number = Date.now(),
): Response {
  const [cheminSeul, requete = ""] = chemin.split("?");
  const route = `${methode} ${cheminSeul}`;
  const params = new URLSearchParams(requete);

  if (route === "POST /applications") {
    if (!consentementIaAccorde()) return porteIa();
    const offerId = champ(corps, "offer_id");
    const template = champ(corps, "template_id");
    if (typeof offerId !== "string") {
      return erreur(422, "invalid_input", "`offer_id` est requis.", {
        field: "offer_id",
      });
    }
    const existant = [...etat.dossiers.values()].find(
      (d) => d.offer.offer_id === offerId,
    );
    if (existant !== undefined) {
      rattraper(existant, maintenant);
      return json(200, versDossier(existant));
    }
    const offre = offreSimulee(offerId);
    if (offre === null)
      return erreur(404, "offer_not_found", "Cette offre n'est plus disponible.");
    const cv = cvSimule();
    if (cv === null) {
      return erreur(409, "cv_missing", "Crée ou importe ton CV avant d'adapter.");
    }
    delete cv.id;
    delete cv.image_url;
    delete cv.updated_at;
    const dossier = nouveauDossier(
      figer(offre),
      cv,
      maintenant,
      typeof template === "string" ? template : null,
    );
    etat.dossiers.set(dossier.id, dossier);
    return json(201, versDossier(dossier));
  }

  if (route === "GET /applications") {
    const applied = params.get("applied") === "true";
    const liste = [...etat.dossiers.values()];
    for (const d of liste) rattraper(d, maintenant);
    const items = liste
      .filter((d) => !applied || d.applied_at !== null)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(versCarte);
    return json(200, { items });
  }

  const m = /^\/applications\/([^/]+)(?:\/(.+))?$/.exec(cheminSeul);
  if (m === null) {
    return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
  }
  const dossier = etat.dossiers.get(m[1]);
  if (dossier === undefined) {
    return erreur(
      404,
      "dossier_not_found",
      "Ce dossier n'existe pas, ou n'est pas à toi.",
    );
  }
  rattraper(dossier, maintenant);
  const reste = m[2] ?? "";

  if (reste === "" && methode === "GET") return json(200, versDossier(dossier));

  if (reste === "" && methode === "DELETE") {
    etat.dossiers.delete(dossier.id);
    return json(204, undefined);
  }

  if (reste === "adapt" && methode === "POST") {
    if (!consentementIaAccorde()) return porteIa();
    if (dossier.adaptation !== "echouee") {
      return erreur(
        409,
        "adaptation_not_failed",
        "L'adaptation n'a pas échoué : rien à relancer.",
      );
    }
    dossier.propositions = [];
    dossier.adaptation = "en_cours";
    dossier.adaptation_prete_a = maintenant + DELAI_ADAPTATION_MS;
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  if (reste === "template" && methode === "PUT") {
    if (!("template_id" in ((corps ?? {}) as Record<string, unknown>))) {
      return erreur(422, "invalid_input", "`template_id` est requis (ou null).", {
        field: "template_id",
      });
    }
    const template = champ(corps, "template_id");
    if (template !== null && typeof template !== "string") {
      return erreur(422, "invalid_input", "`template_id` doit être un identifiant.", {
        field: "template_id",
      });
    }
    if (typeof template === "string") {
      const modele = trouverModele(template);
      if (modele !== undefined && modele.is_premium && !modele.possede) {
        return erreur(403, "template_locked", "Ce modèle Premium n'est pas à toi.", {
          template_id: template,
        });
      }
    }
    // Idempotent : le même modèle redemandé ne touche pas `updated_at`.
    if (dossier.template_id !== template) {
      dossier.template_id = template;
      toucher(dossier, maintenant);
    }
    return json(200, versDossier(dossier));
  }

  if (reste === "color" && methode === "PUT") {
    // La couleur principale du dossier (ADR-0034) : `#RRGGBB`, `null` = celle
    // du modèle ; elle survit au changement de modèle. Idempotent.
    if (!("primary_color" in ((corps ?? {}) as Record<string, unknown>))) {
      return erreur(422, "invalid_input", "`primary_color` est requis (ou null).", {
        field: "primary_color",
      });
    }
    const brut = champ(corps, "primary_color");
    let couleur: string | null = null;
    if (brut !== null) {
      const m =
        typeof brut === "string"
          ? /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.exec(brut.trim())
          : null;
      if (m === null) {
        return erreur(422, "invalid_input", "Un code couleur s'écrit #rrggbb.", {
          field: "primary_color",
        });
      }
      const d = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
      couleur = `#${d.toUpperCase()}`;
    }
    if (dossier.primary_color !== couleur) {
      dossier.primary_color = couleur;
      toucher(dossier, maintenant);
    }
    return json(200, versDossier(dossier));
  }

  if (reste === "letter-style" && methode === "PUT") {
    // Le style de lettre du dossier (ADR-0036) : `template` | `plain` | null.
    // Retenu tel quel ; c'est le rendu qui dit le style servi. Idempotent.
    if (!("letter_style" in ((corps ?? {}) as Record<string, unknown>))) {
      return erreur(422, "invalid_input", "`letter_style` est requis (ou null).", {
        field: "letter_style",
      });
    }
    const style = champ(corps, "letter_style");
    if (style !== null && style !== "template" && style !== "plain") {
      return erreur(422, "invalid_input", "`letter_style` vaut template ou plain.", {
        field: "letter_style",
      });
    }
    if (dossier.letter_style !== style) {
      dossier.letter_style = style;
      toucher(dossier, maintenant);
    }
    return json(200, versDossier(dossier));
  }

  if (reste === "cv" && methode === "PUT") {
    if (dossier.adaptation === "en_cours") {
      return erreur(
        409,
        "adaptation_in_progress",
        "Karria travaille encore : réessaie dans un instant.",
      );
    }
    const cv = champ(corps, "cv");
    const fautes = champsDuCv(cv);
    if (fautes.length > 0) {
      return erreur(422, "cv_invalid", "Le CV est invalide.", { fields: fautes });
    }
    dossier.cv = copie(cv as Record<string, unknown>);
    delete dossier.cv.id;
    delete dossier.cv.image_url;
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  const proposition = /^propositions\/([^/]+)$/.exec(reste);
  if (proposition !== null && methode === "POST") {
    const p = dossier.propositions.find((x) => x.id === proposition[1]);
    if (p === undefined)
      return erreur(404, "proposition_not_found", "Proposition inconnue.");
    const decision = champ(corps, "decision");
    if (decision !== "accepter" && decision !== "refuser" && decision !== "revenir") {
      return erreur(422, "invalid_input", "Décision inconnue.", { field: "decision" });
    }
    if (lireChemin(dossier.cv, p.path) === undefined) {
      return erreur(
        409,
        "proposition_path_invalid",
        "L'élément visé n'existe plus dans le CV.",
      );
    }
    ecrireChemin(dossier.cv, p.path, decision === "accepter" ? p.after : p.before);
    p.state =
      decision === "accepter"
        ? "acceptee"
        : decision === "refuser"
          ? "refusee"
          : "proposee";
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  if (reste === "letter" && methode === "POST") {
    if (!consentementIaAccorde()) return porteIa();
    if (dossier.adaptation === "en_cours") {
      return erreur(
        409,
        "adaptation_in_progress",
        "Karria travaille encore : réessaie dans un instant.",
      );
    }
    dossier.letter = ebaucher(dossier);
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  if (reste === "letter" && methode === "PUT") {
    const fautes = champsDeLaLettre(corps);
    if (fautes.length > 0) {
      return erreur(422, "letter_invalid", "La lettre est invalide.", { fields: fautes });
    }
    dossier.letter = copie(corps as Lettre);
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  const regenerer = /^letter\/paragraphs\/(\d+)\/regenerate$/.exec(reste);
  if (regenerer !== null && methode === "POST") {
    if (!consentementIaAccorde()) return porteIa();
    if (dossier.letter === null)
      return erreur(404, "letter_missing", "Pas encore de lettre.");
    const index = Number(regenerer[1]);
    const paragraphe = dossier.letter.paragraphs[index];
    if (paragraphe === undefined)
      return erreur(404, "paragraph_not_found", "Paragraphe inconnu.");
    const instruction = champ(corps, "instruction");
    if (
      instruction !== null &&
      instruction !== undefined &&
      typeof instruction !== "string"
    ) {
      return erreur(422, "invalid_input", "L'instruction doit être un texte.", {
        field: "instruction",
      });
    }
    if (typeof instruction === "string" && instruction.length > INSTRUCTION_MAX) {
      return erreur(422, "invalid_input", `${INSTRUCTION_MAX} caractères au plus.`, {
        field: "instruction",
      });
    }
    paragraphe.text = reecrire(
      paragraphe.text,
      typeof instruction === "string" ? instruction : null,
    );
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  if (reste === "applied" && methode === "POST") {
    dossier.applied_at ??= new Date(maintenant).toISOString();
    marquerPostuleeSimulee(dossier.offer.offer_id, true);
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  if (reste === "applied" && methode === "DELETE") {
    dossier.applied_at = null;
    marquerPostuleeSimulee(dossier.offer.offer_id, false);
    toucher(dossier, maintenant);
    return json(200, versDossier(dossier));
  }

  return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
}
