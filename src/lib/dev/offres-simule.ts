/**
 * Le faux serveur des offres, de Karria et de la recherche — le contrat
 * du module `offers` de `karria_api_v2`, en exécutable.
 *
 * ═══ Ce qu'il fige ═══
 *
 * La forme exacte de `GET /job-matches/me` (page, `mode`,
 * `criteria_summary`), des offres (identifiants **UUID**, `excerpt`,
 * `location_label`, `remote`, `schedule`, `experience`, salaires
 * normalisés, `source`, `is_new`), des options de filtre **avec leurs
 * effectifs**, de `POST /job-matches/me/seen`, de l'interaction, de la
 * conversation (`status`, `suggestions`, `criteria`, `results_count`,
 * `intent`) et des critères (`/search/criteria`). Ce que le vrai serveur
 * sert déjà, en production : ici on ne fait que le reproduire pour
 * concevoir hors ligne et éprouver les écrans.
 *
 * ═══ Ce qu'il n'est pas ═══
 *
 * Karria ne comprend rien ici : quelques mots-clés (un métier, une ville,
 * un contrat) suffisent à produire les trois issues du contrat — une
 * recherche lancée, une question, une simple réponse — et les
 * suggestions d'élargissement (« +N offres en élargissant à 50 km »). La
 * pertinence est une ressemblance de mots. Assez pour voir l'expérience,
 * jamais pour la juger.
 */

// ─────────────────────────────────────────────────────────────────────
// Les formes
// ─────────────────────────────────────────────────────────────────────

type Contrat =
  | "cdi"
  | "cdd"
  | "interim"
  | "alternance"
  | "stage"
  | "freelance"
  | "saisonnier"
  | "autre";
type Teletravail = "sur_site" | "hybride" | "teletravail";
type Horaires = "temps_plein" | "temps_partiel";
type Experience = "debutant" | "junior" | "confirme" | "senior";

const CONTRATS: Record<Contrat, string> = {
  cdi: "CDI",
  cdd: "CDD",
  interim: "Intérim",
  alternance: "Alternance",
  stage: "Stage",
  freelance: "Freelance",
  saisonnier: "Saisonnier",
  autre: "Autre",
};

interface OffreSimulee {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  city: string;
  postal_code: string;
  department_code: string;
  latitude: number;
  longitude: number;
  contract: Contrat;
  remote: Teletravail | null;
  schedule: Horaires | null;
  experience: Experience | null;
  salary_raw: string | null;
  salary_min_monthly: number | null;
  salary_max_monthly: number | null;
  /** Publiée il y a tant d'heures : les dates restent relatives. */
  heures: number;
  is_alternance: boolean;
  source: "france_travail" | "indeed" | "hellowork";
  description: string;
}

interface Criteres {
  query: string;
  job_titles: string[];
  keywords: string[];
  location: {
    label: string;
    latitude: number | null;
    longitude: number | null;
    radius_km: number;
    department_codes: string[];
  } | null;
  whole_france: boolean;
  contract_types: Contrat[];
  remote: Teletravail[];
  schedule: Horaires | null;
  max_experience: Experience | null;
  salary_min_monthly: number | null;
  alerts_enabled: boolean;
  updated_at: string;
}

interface EtatOffre {
  seen: boolean;
  opened: boolean;
  saved: boolean;
  applied: boolean;
  dismissed: boolean;
}

const EXCERPT = 280;
const NOUVELLE_HEURES = 48;
const LIMITE_MAX = 50;

// ─────────────────────────────────────────────────────────────────────
// Le corpus
// ─────────────────────────────────────────────────────────────────────

const uuid = (n: number) => `0f1e2d3c-0000-4000-8000-${String(n).padStart(12, "0")}`;

const DESCRIPTION = (poste: string, entreprise: string) =>
  `**Le poste**\n\nNous recherchons un·e ${poste} pour rejoindre ${entreprise}. Vous participerez aux projets de l'équipe au quotidien, avec un accompagnement dès l'arrivée.\n\n**Vos missions**\n\n- Contribuer aux projets en cours\n- Travailler en équipe avec les autres métiers\n- Proposer des améliorations\n\n**Profil**\n\n- Motivation et envie d'apprendre\n- Bon relationnel\n\n**Conditions**\n\nPoste basé sur site, mutuelle et tickets restaurant.`;

const OFFRES: OffreSimulee[] = [
  {
    id: uuid(1),
    title: "Data Engineer en alternance",
    company: "BNP Paribas",
    logo: null,
    city: "Paris",
    postal_code: "75009",
    department_code: "75",
    latitude: 48.8738,
    longitude: 2.3319,
    contract: "alternance",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "debutant",
    salary_raw: "1 450 € par mois",
    salary_min_monthly: 1450,
    salary_max_monthly: 1450,
    heures: 2,
    is_alternance: true,
    source: "france_travail",
    description: DESCRIPTION("Data Engineer en alternance", "BNP Paribas"),
  },
  {
    id: uuid(2),
    title: "Alternant·e Machine Learning Engineer",
    company: "Doctolib",
    logo: null,
    city: "Levallois-Perret",
    postal_code: "92300",
    department_code: "92",
    latitude: 48.8976,
    longitude: 2.2874,
    contract: "alternance",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "debutant",
    salary_raw: "1 600 € par mois",
    salary_min_monthly: 1600,
    salary_max_monthly: 1600,
    heures: 26,
    is_alternance: true,
    source: "hellowork",
    description: DESCRIPTION("Machine Learning Engineer en alternance", "Doctolib"),
  },
  {
    id: uuid(3),
    title: "Data Analyst junior",
    company: "Back Market",
    logo: null,
    city: "Paris",
    postal_code: "75010",
    department_code: "75",
    latitude: 48.876,
    longitude: 2.3571,
    contract: "cdi",
    remote: "teletravail",
    schedule: "temps_plein",
    experience: "junior",
    salary_raw: null,
    salary_min_monthly: null,
    salary_max_monthly: null,
    heures: 72,
    is_alternance: false,
    source: "indeed",
    description: DESCRIPTION("Data Analyst", "Back Market"),
  },
  {
    id: uuid(4),
    title: "Ingénieur·e IA générative",
    company: "Mistral AI",
    logo: null,
    city: "Paris",
    postal_code: "75015",
    department_code: "75",
    latitude: 48.8412,
    longitude: 2.2976,
    contract: "cdd",
    remote: "sur_site",
    schedule: "temps_plein",
    experience: "confirme",
    salary_raw: "48 000 – 55 000 € par an",
    salary_min_monthly: 4000,
    salary_max_monthly: 4583,
    heures: 200,
    is_alternance: false,
    source: "hellowork",
    description: DESCRIPTION("Ingénieur·e IA générative", "Mistral AI"),
  },
  {
    id: uuid(5),
    title: "Développeur·se web full stack",
    company: "Alan",
    logo: null,
    city: "Lyon",
    postal_code: "69003",
    department_code: "69",
    latitude: 45.7597,
    longitude: 4.8422,
    contract: "cdi",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "junior",
    salary_raw: "Annuel de 38000.00 Euros à 45000.00 Euros",
    salary_min_monthly: 3167,
    salary_max_monthly: 3750,
    heures: 5,
    is_alternance: false,
    source: "france_travail",
    description: DESCRIPTION("Développeur·se web full stack", "Alan"),
  },
  {
    id: uuid(6),
    title: "Vendeur·se en boulangerie",
    company: "Maison Kayser",
    logo: null,
    city: "Lyon",
    postal_code: "69002",
    department_code: "69",
    latitude: 45.7578,
    longitude: 4.832,
    contract: "cdd",
    remote: "sur_site",
    schedule: "temps_partiel",
    experience: "debutant",
    salary_raw: "Mensuel de 1801.00 Euros sur 12 mois",
    salary_min_monthly: 1801,
    salary_max_monthly: 1801,
    heures: 9,
    is_alternance: false,
    source: "france_travail",
    description: DESCRIPTION("Vendeur·se en boulangerie", "Maison Kayser"),
  },
  {
    id: uuid(7),
    title: "Serveur·se de restaurant",
    company: "Big Mamma",
    logo: null,
    city: "Marseille",
    postal_code: "13001",
    department_code: "13",
    latitude: 43.2965,
    longitude: 5.3698,
    contract: "saisonnier",
    remote: "sur_site",
    schedule: "temps_plein",
    experience: null,
    salary_raw: "Horaire de 12.50 Euros",
    salary_min_monthly: 1895,
    salary_max_monthly: 1895,
    heures: 14,
    is_alternance: false,
    source: "indeed",
    description: DESCRIPTION("Serveur·se", "Big Mamma"),
  },
  {
    id: uuid(8),
    title: "Comptable général·e",
    company: "Decathlon",
    logo: null,
    city: "Villeneuve-d'Ascq",
    postal_code: "59650",
    department_code: "59",
    latitude: 50.6233,
    longitude: 3.1447,
    contract: "cdi",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "confirme",
    salary_raw: "Mensuel de 2800.00 Euros à 3200.00 Euros",
    salary_min_monthly: 2800,
    salary_max_monthly: 3200,
    heures: 40,
    is_alternance: false,
    source: "hellowork",
    description: DESCRIPTION("Comptable général·e", "Decathlon"),
  },
  {
    id: uuid(9),
    title: "Infirmier·e de nuit",
    company: "AP-HP",
    logo: null,
    city: "Paris",
    postal_code: "75013",
    department_code: "75",
    latitude: 48.8322,
    longitude: 2.3561,
    contract: "cdd",
    remote: "sur_site",
    schedule: "temps_plein",
    experience: "junior",
    salary_raw: "Mensuel de 2300.00 Euros",
    salary_min_monthly: 2300,
    salary_max_monthly: 2300,
    heures: 30,
    is_alternance: false,
    source: "france_travail",
    description: DESCRIPTION("Infirmier·e", "AP-HP"),
  },
  {
    id: uuid(10),
    title: "Data Engineer (H/F)",
    company: "Veepee",
    logo: null,
    city: "Saint-Denis",
    postal_code: "93200",
    department_code: "93",
    latitude: 48.9362,
    longitude: 2.3574,
    contract: "cdi",
    remote: "teletravail",
    schedule: "temps_plein",
    experience: "senior",
    salary_raw: "55 000 – 65 000 € par an",
    salary_min_monthly: 4583,
    salary_max_monthly: 5417,
    heures: 50,
    is_alternance: false,
    source: "indeed",
    description: DESCRIPTION("Data Engineer", "Veepee"),
  },
  {
    id: uuid(11),
    title: "Développeur·se mobile React Native",
    company: "Qonto",
    logo: null,
    city: "Bordeaux",
    postal_code: "33000",
    department_code: "33",
    latitude: 44.8378,
    longitude: -0.5792,
    contract: "freelance",
    remote: "teletravail",
    schedule: "temps_plein",
    experience: "confirme",
    salary_raw: "500 € par jour",
    salary_min_monthly: null,
    salary_max_monthly: null,
    heures: 120,
    is_alternance: false,
    source: "hellowork",
    description: DESCRIPTION("Développeur·se mobile", "Qonto"),
  },
  {
    id: uuid(12),
    title: "Stage — Data Scientist",
    company: "Ubisoft",
    logo: null,
    city: "Montreuil",
    postal_code: "93100",
    department_code: "93",
    latitude: 48.8638,
    longitude: 2.4485,
    contract: "stage",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "debutant",
    salary_raw: "1 200 € par mois",
    salary_min_monthly: 1200,
    salary_max_monthly: 1200,
    heures: 300,
    is_alternance: false,
    source: "indeed",
    description: DESCRIPTION("Data Scientist stagiaire", "Ubisoft"),
  },
  // Trois offres hors de Paris et de sa petite couronne : ce sont elles
  // qui donnent un sens aux élargissements (50 km, toute la France, CDD).
  {
    id: uuid(13),
    title: "Data Engineer junior",
    company: "Safran",
    logo: null,
    city: "Mantes-la-Jolie",
    postal_code: "78200",
    department_code: "78",
    latitude: 48.9908,
    longitude: 1.7165,
    contract: "cdi",
    remote: "sur_site",
    schedule: "temps_plein",
    experience: "junior",
    salary_raw: "Mensuel de 2900.00 Euros",
    salary_min_monthly: 2900,
    salary_max_monthly: 2900,
    heures: 18,
    is_alternance: false,
    source: "france_travail",
    description: DESCRIPTION("Data Engineer junior", "Safran"),
  },
  {
    id: uuid(14),
    title: "Data Engineer confirmé·e",
    company: "OL Groupe",
    logo: null,
    city: "Lyon",
    postal_code: "69007",
    department_code: "69",
    latitude: 45.7332,
    longitude: 4.8319,
    contract: "cdi",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "confirme",
    salary_raw: "45 000 – 52 000 € par an",
    salary_min_monthly: 3750,
    salary_max_monthly: 4333,
    heures: 60,
    is_alternance: false,
    source: "hellowork",
    description: DESCRIPTION("Data Engineer confirmé·e", "OL Groupe"),
  },
  {
    id: uuid(15),
    title: "Data Engineer (CDD 12 mois)",
    company: "Matmut",
    logo: null,
    city: "Rouen",
    postal_code: "76000",
    department_code: "76",
    latitude: 49.4432,
    longitude: 1.0999,
    contract: "cdd",
    remote: "hybride",
    schedule: "temps_plein",
    experience: "junior",
    salary_raw: "Mensuel de 2600.00 Euros",
    salary_min_monthly: 2600,
    salary_max_monthly: 2600,
    heures: 36,
    is_alternance: false,
    source: "indeed",
    description: DESCRIPTION("Data Engineer", "Matmut"),
  },
];

// ─────────────────────────────────────────────────────────────────────
// L'état
// ─────────────────────────────────────────────────────────────────────

const etat = {
  criteres: null as Criteres | null,
  offres: new Map<string, EtatOffre>(),
  conversations: new Map<string, number>(),
};

function etatDe(id: string): EtatOffre {
  let e = etat.offres.get(id);
  if (e === undefined) {
    e = { seen: false, opened: false, saved: false, applied: false, dismissed: false };
    etat.offres.set(id, e);
  }
  return e;
}

/** Repart de zéro : pour les tests, et pour « oublier la recherche ». */
export function reinitialiserOffres(): void {
  etat.criteres = null;
  etat.offres.clear();
  etat.conversations.clear();
}

// ─────────────────────────────────────────────────────────────────────
// Les projections
// ─────────────────────────────────────────────────────────────────────

function json(statut: number, corps: unknown): Response {
  return new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

const CODES: Record<number, string> = {
  404: "not_found",
  422: "invalid_input",
  429: "rate_limited",
  503: "dependency_failure",
};

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

function ilYa(heures: number): string {
  return new Date(Date.now() - heures * 3_600_000).toISOString();
}

function sansAccents(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function extrait(description: string): string {
  const plat = description.replace(/\*\*/g, "").split(/\s+/).join(" ").trim();
  if (plat.length <= EXCERPT) return plat;
  return plat.slice(0, EXCERPT).replace(/\s+\S*$/, "") + "…";
}

function etiquetteLieu(o: OffreSimulee): string {
  if (o.department_code === "75") {
    const arr = Number(o.postal_code.slice(3));
    return `Paris ${arr}${arr === 1 ? "er" : "e"}`;
  }
  return `${o.city} (${o.department_code})`;
}

function versOffre(o: OffreSimulee, detail: boolean) {
  return {
    id: o.id,
    title: o.title,
    summary: null,
    excerpt: extrait(o.description),
    description: detail ? o.description : null,
    company: { name: o.company, logo: o.logo, website: null },
    city: { name: o.city, postal_code: o.postal_code },
    location_label: etiquetteLieu(o),
    department_code: o.department_code,
    latitude: o.latitude,
    longitude: o.longitude,
    contract_type: { code: o.contract, label: CONTRATS[o.contract] },
    remote: o.remote,
    schedule: o.schedule,
    experience: o.experience,
    salary_raw: o.salary_raw,
    salary_min_monthly: o.salary_min_monthly,
    salary_max_monthly: o.salary_max_monthly,
    published_at: ilYa(o.heures),
    is_alternance: o.is_alternance,
    apply_url: `https://karria.fr/offres/${o.id}`,
    origin_url: null,
    source: o.source,
    is_active: true,
  };
}

/** La ressemblance entre l'offre et la recherche : des mots en commun. */
function score(o: OffreSimulee, c: Criteres): number {
  const texte = sansAccents(`${o.title} ${o.description}`);
  const mots = [...c.job_titles, ...c.keywords]
    .flatMap((m) => sansAccents(m).split(/\s+/))
    .filter((m) => m.length > 2);
  if (mots.length === 0) return 0;
  const titre = sansAccents(o.title);
  const dansTitre = mots.filter((m) => titre.includes(m)).length;
  const dansTexte = mots.filter((m) => texte.includes(m)).length;
  return Math.min(1, (dansTitre * 2 + dansTexte) / (mots.length * 3) + 0.15);
}

function dansLaZone(o: OffreSimulee, c: Criteres): boolean {
  if (c.whole_france) return true;
  if (c.remote.includes("teletravail") && o.remote === "teletravail") return true;
  const lieu = c.location;
  if (lieu === null) return true;
  if (lieu.department_codes.includes(o.department_code)) return true;
  if (lieu.latitude !== null && lieu.longitude !== null) {
    const km =
      Math.hypot(
        (o.latitude - lieu.latitude) * 111,
        (o.longitude - lieu.longitude) * 111 * Math.cos((lieu.latitude * Math.PI) / 180),
      ) || 0;
    return km <= lieu.radius_km;
  }
  return sansAccents(lieu.label).includes(sansAccents(o.city));
}

/** Les offres que la recherche retient, par pertinence. */
function retenues(c: Criteres): { offre: OffreSimulee; score: number }[] {
  return OFFRES.map((offre) => ({ offre, score: score(offre, c) }))
    .filter(
      ({ offre, score: s }) =>
        s >= 0.4 &&
        dansLaZone(offre, c) &&
        (c.contract_types.length === 0 || c.contract_types.includes(offre.contract)) &&
        (c.remote.length === 0 ||
          (offre.remote !== null && c.remote.includes(offre.remote))) &&
        (c.schedule === null || offre.schedule === c.schedule) &&
        (c.salary_min_monthly === null ||
          (offre.salary_max_monthly ?? Infinity) >= c.salary_min_monthly),
    )
    .sort((a, b) => b.score - a.score);
}

function raisons(o: OffreSimulee, c: Criteres): string[] {
  const r: string[] = [];
  if (c.contract_types.includes(o.contract)) r.push(CONTRATS[o.contract]);
  if (c.location !== null && !c.whole_france) r.push(o.city);
  if (c.remote.length > 0 && o.remote === "teletravail") r.push("Télétravail");
  return r;
}

function versMatch(o: OffreSimulee, s: number | null, detail = false) {
  const e = etatDe(o.id);
  const c = etat.criteres;
  return {
    id: o.id,
    job_offer_id: o.id,
    score_normalized: s,
    match_quality: s === null ? null : s >= 0.8 ? "high" : s >= 0.55 ? "medium" : "low",
    reasons: c !== null && s !== null ? raisons(o, c) : [],
    origin: s === null ? null : "search",
    is_new: o.heures < NOUVELLE_HEURES && !e.seen,
    feed_seen: e.seen,
    detail_opened: e.opened,
    saved: e.saved,
    applied: e.applied,
    dismissed: e.dismissed,
    job_offer: versOffre(o, detail),
  };
}

function resumeDesCriteres(c: Criteres): string {
  const parts = [c.job_titles.slice(0, 2).join(" ou ")];
  if (c.whole_france) parts.push("Toute la France");
  else if (c.location !== null)
    parts.push(`${c.location.label} (${c.location.radius_km} km)`);
  if (c.contract_types.length > 0)
    parts.push(c.contract_types.map((t) => CONTRATS[t]).join(", "));
  if (c.remote.includes("teletravail")) parts.push("Télétravail");
  return parts.join(" · ");
}

function versCriteres(c: Criteres) {
  return { ...c, summary: resumeDesCriteres(c) };
}

// ─────────────────────────────────────────────────────────────────────
// Le fil
// ─────────────────────────────────────────────────────────────────────

/** La base du fil : toutes les offres, ou celles de la recherche — sans
 *  les écartées. */
function baseDuFil(
  parRecherche = etat.criteres !== null,
): { offre: OffreSimulee; score: number | null }[] {
  const c = etat.criteres;
  const liste =
    c === null || !parRecherche
      ? [...OFFRES]
          .sort((a, b) => a.heures - b.heures)
          .map((offre) => ({ offre, score: null as number | null }))
      : retenues(c).map(({ offre, score: s }) => ({ offre, score: s as number | null }));
  return liste.filter(({ offre }) => !etatDe(offre.id).dismissed);
}

function filDesMatchs(chemin: string): Response {
  const p = new URLSearchParams(chemin.split("?")[1] ?? "");
  const limit = Number(p.get("limit") ?? 20);
  const offset = Number(p.get("offset") ?? 0);
  if (!(limit >= 1 && limit <= LIMITE_MAX) || offset < 0) {
    return erreur(422, "invalid_input", "Pagination invalide.");
  }
  const demande = p.get("mode");
  if (demande !== null && demande !== "all_offers" && demande !== "search") {
    return erreur(422, "invalid_input", "Mode inconnu.");
  }
  // `all_offers` montre tout en gardant les critères (et leurs alertes) ;
  // `search` sans critères retombe sur `all_offers`, comme le contrat.
  const parRecherche = etat.criteres !== null && demande !== "all_offers";
  const contrats = p.get("contract_types")?.split(",").filter(Boolean) ?? [];
  const villes = p.get("cities")?.split(",").filter(Boolean) ?? [];
  // `published_within` prime sur `published_after`, comme le contrat le dit.
  const FENETRES: Record<string, number> = { "24h": 24, "3d": 72, "7d": 168, "30d": 720 };
  const fenetre = p.get("published_within");
  const depuis =
    fenetre !== null && FENETRES[fenetre] !== undefined
      ? ilYa(FENETRES[fenetre]!)
      : p.get("published_after");
  let liste = baseDuFil(parRecherche).filter(({ offre }) => {
    const e = etatDe(offre.id);
    return (
      (p.get("saved_only") !== "true" || e.saved) &&
      (p.get("unseen_only") !== "true" || !e.seen) &&
      (p.get("unapplied_only") !== "true" || !e.applied) &&
      (contrats.length === 0 || contrats.includes(offre.contract)) &&
      (villes.length === 0 || villes.includes(offre.city)) &&
      (depuis === null || ilYa(offre.heures) >= depuis)
    );
  });
  if (p.get("sort") === "fresh" || !parRecherche) {
    liste = [...liste].sort((a, b) => a.offre.heures - b.offre.heures);
  }
  const page = liste.slice(offset, offset + limit);
  return json(200, {
    items: page.map(({ offre, score: s }) => versMatch(offre, s)),
    count: liste.length,
    limit,
    offset,
    has_next: offset + page.length < liste.length,
    mode: parRecherche ? "search" : "all_offers",
    criteria_summary: etat.criteres === null ? null : resumeDesCriteres(etat.criteres),
  });
}

function optionsDeFiltre(): Response {
  const base = baseDuFil().map(({ offre }) => offre);
  const compter = (cle: (o: OffreSimulee) => string) => {
    const comptes = new Map<string, number>();
    for (const o of base) comptes.set(cle(o), (comptes.get(cle(o)) ?? 0) + 1);
    return [...comptes.entries()].sort((a, b) => b[1] - a[1]);
  };
  return json(200, {
    contract_types: compter((o) => o.contract).map(([value, count]) => ({
      value,
      label: CONTRATS[value as Contrat],
      count,
    })),
    cities: compter((o) => o.city).map(([value, count]) => ({
      value,
      label: value,
      count,
    })),
  });
}

function marquerVues(corps: unknown): Response {
  const ids = champ(corps, "offer_ids");
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
    return erreur(422, "invalid_input", "Entre 1 et 100 identifiants.", {
      field: "offer_ids",
    });
  }
  let updated = 0;
  for (const id of ids) {
    if (typeof id !== "string" || !OFFRES.some((o) => o.id === id)) continue;
    const e = etatDe(id);
    if (!e.seen) {
      e.seen = true;
      updated += 1;
    }
  }
  return json(200, { updated });
}

function routeDeMatch(methode: string, chemin: string, corps: unknown): Response | null {
  const m = /^\/job-matches\/([0-9a-f-]{36})(\/interaction)?$/.exec(chemin);
  if (m === null) return null;
  const offre = OFFRES.find((o) => o.id === m[1]);
  if (offre === undefined) {
    return erreur(404, "offer_not_found", "Cette offre n'est plus disponible.");
  }
  const s = etat.criteres === null ? null : score(offre, etat.criteres);
  if (methode === "GET" && m[2] === undefined)
    return json(200, versMatch(offre, s, true));
  if (methode === "PATCH" && m[2] === "/interaction") {
    const e = etatDe(offre.id);
    let change = false;
    for (const cle of ["saved", "applied", "dismissed"] as const) {
      const v = champ(corps, cle);
      if (typeof v === "boolean") {
        e[cle] = v;
        change = true;
      }
    }
    if (champ(corps, "detail_opened") === true) {
      e.opened = true;
      change = true;
    }
    if (champ(corps, "link_clicked") === true) change = true;
    if (!change) return erreur(422, "interaction_empty", "Aucun changement.");
    return json(200, versMatch(offre, s));
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────
// La recherche
// ─────────────────────────────────────────────────────────────────────

const VILLES: Record<string, [number, number, string]> = {
  paris: [48.8566, 2.3522, "75"],
  lyon: [45.764, 4.8357, "69"],
  marseille: [43.2965, 5.3698, "13"],
  lille: [50.6292, 3.0573, "59"],
  bordeaux: [44.8378, -0.5792, "33"],
  toulouse: [43.6047, 1.4442, "31"],
  nantes: [47.2184, -1.5536, "44"],
};

function geocoder(label: string) {
  const cle = Object.keys(VILLES).find((v) => sansAccents(label).includes(v));
  if (cle === undefined) return { latitude: null, longitude: null, department_codes: [] };
  const [latitude, longitude, dep] = VILLES[cle]!;
  return { latitude, longitude, department_codes: [dep] };
}

function appliquerCriteres(c: Omit<Criteres, "alerts_enabled" | "updated_at">): Criteres {
  const stockes: Criteres = {
    ...c,
    alerts_enabled: etat.criteres?.alerts_enabled ?? true,
    updated_at: new Date().toISOString(),
  };
  etat.criteres = stockes;
  return stockes;
}

function mettreLesCriteres(corps: unknown): Response {
  const titres = champ(corps, "job_titles");
  const lieu = champ(corps, "location") as Criteres["location"] | null | undefined;
  const toute = champ(corps, "whole_france") === true;
  const remote = (champ(corps, "remote") as Teletravail[] | undefined) ?? [];
  const manquants: string[] = [];
  if (!Array.isArray(titres) || titres.length === 0) manquants.push("job_titles");
  if (!lieu && !toute && !remote.includes("teletravail")) manquants.push("location");
  if (manquants.length > 0) {
    return erreur(422, "criteria_incomplete", "Les critères sont incomplets.", {
      missing: manquants,
    });
  }
  const location =
    lieu && typeof lieu === "object"
      ? {
          label: lieu.label,
          radius_km: lieu.radius_km ?? 30,
          ...(lieu.latitude !== null && lieu.latitude !== undefined
            ? {
                latitude: lieu.latitude,
                longitude: lieu.longitude ?? null,
                department_codes: lieu.department_codes ?? [],
              }
            : geocoder(lieu.label)),
        }
      : null;
  const stockes = appliquerCriteres({
    query: (titres as string[]).slice(0, 2).join(" ou "),
    job_titles: titres as string[],
    keywords: (champ(corps, "keywords") as string[] | undefined) ?? [],
    location,
    whole_france: toute,
    contract_types: (champ(corps, "contract_types") as Contrat[] | undefined) ?? [],
    remote,
    schedule: (champ(corps, "schedule") as Horaires | null | undefined) ?? null,
    max_experience:
      (champ(corps, "max_experience") as Experience | null | undefined) ?? null,
    salary_min_monthly:
      (champ(corps, "salary_min_monthly") as number | null | undefined) ?? null,
  });
  return json(200, {
    criteria: versCriteres(stockes),
    results_count: baseDuFil().length,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Karria
// ─────────────────────────────────────────────────────────────────────

const METIERS = [
  "data engineer",
  "data analyst",
  "data scientist",
  "machine learning",
  "developpeur",
  "developpeuse",
  "data",
  "vendeur",
  "vendeuse",
  "serveur",
  "serveuse",
  "comptable",
  "infirmier",
  "infirmiere",
  "ingenieur",
  "ia",
];

const CONTRATS_DITS: [RegExp, Contrat][] = [
  [/\bcdi\b/, "cdi"],
  [/\bcdd\b/, "cdd"],
  [/alternance|apprentissage/, "alternance"],
  [/\bstage\b/, "stage"],
  [/freelance|independant/, "freelance"],
  [/interim/, "interim"],
];

function uuidAleatoire(): string {
  const hex = () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-8${hex().slice(1)}-${hex()}${hex()}${hex()}`;
}

interface Elargissement {
  id: string;
  kind: string;
  label: string;
  gain: number;
  message: string;
}

/** Les élargissements, avec un gain **compté** sur le corpus — jamais
 *  inventé : c'est le principe du contrat. */
function elargissements(c: Criteres): Elargissement[] {
  const liste: Elargissement[] = [];
  const actuel = baseDuFil().length;
  if (c.location !== null && !c.whole_france && c.location.radius_km < 50) {
    const gain =
      retenues({ ...c, location: { ...c.location, radius_km: 50 } }).length - actuel;
    if (gain > 0) {
      liste.push({
        id: "radius-50",
        kind: "radius",
        label: `Élargir à 50 km autour de ${c.location.label}`,
        gain,
        message: `Élargir à 50 km : +${gain} offres`,
      });
    }
  }
  if (!c.whole_france) {
    const gain = retenues({ ...c, whole_france: true }).length - actuel;
    if (gain > 0) {
      liste.push({
        id: "whole-france",
        kind: "whole_france",
        label: "Chercher dans toute la France",
        gain,
        message: `Toute la France : +${gain} offres`,
      });
    }
  }
  if (c.contract_types.length > 0 && !c.contract_types.includes("cdd")) {
    const gain =
      retenues({ ...c, contract_types: [...c.contract_types, "cdd"] }).length - actuel;
    if (gain > 0) {
      liste.push({
        id: "contract-cdd",
        kind: "contract_types",
        label: "Accepter aussi les CDD",
        gain,
        message: `Aussi en CDD : +${gain}`,
      });
    }
  }
  return liste.slice(0, 3);
}

function suggestions(c: Criteres, e: Elargissement[]): string[] {
  const s = e.map((x) => x.message);
  if (c.contract_types.length === 0) s.push("Uniquement en CDI");
  if (!c.remote.includes("teletravail")) s.push("Télétravail possible");
  return s.slice(0, 4);
}

/** Un message qui est le `message` d'un élargissement proposé : le serveur
 *  l'applique sans repasser par le modèle. */
function elargissementAccepte(c: Criteres, contenu: string): Criteres | null {
  const choisi = elargissements(c).find((e) => e.message === contenu);
  if (choisi === undefined) return null;
  switch (choisi.id) {
    case "radius-50":
      return {
        ...c,
        location: c.location === null ? null : { ...c.location, radius_km: 50 },
      };
    case "whole-france":
      return { ...c, whole_france: true };
    default:
      return { ...c, contract_types: [...c.contract_types, "cdd"] };
  }
}

function repondre(contenu: string, conversation: string) {
  const texte = sansAccents(contenu);
  const message = (content: string) => ({
    id: uuidAleatoire(),
    role: "assistant" as const,
    content,
    created_at: new Date().toISOString(),
  });
  const base = (
    status: "search" | "clarify" | "chat",
    intent: string,
    content: string,
  ) => ({
    conversation_id: conversation,
    message: message(content),
    status,
    results_count: null as number | null,
    criteria: etat.criteres === null ? null : versCriteres(etat.criteres),
    suggestions: [] as string[],
    widenings: [] as Elargissement[],
    intent,
  });

  // Un élargissement proposé puis touché, ou une réponse rapide : la
  // recherche s'ajuste sans « réfléchir ».
  const courants = etat.criteres;
  const ajustes =
    courants === null
      ? null
      : (elargissementAccepte(courants, contenu) ??
        (/^uniquement en cdi$/.test(texte)
          ? { ...courants, contract_types: ["cdi" as Contrat] }
          : /^teletravail possible$/.test(texte)
            ? {
                ...courants,
                remote: ["hybride" as Teletravail, "teletravail" as Teletravail],
              }
            : null));
  if (ajustes !== null) {
    const stockes = appliquerCriteres(ajustes);
    const n = baseDuFil().length;
    const e = elargissements(stockes);
    return {
      ...base(
        "search",
        "refine",
        `C'est fait : ${n} offre${n > 1 ? "s" : ""} maintenant, les plus pertinentes d'abord.`,
      ),
      results_count: n,
      criteria: versCriteres(stockes),
      suggestions: suggestions(stockes, e),
      widenings: e,
    };
  }

  const metier =
    METIERS.find((m) => texte.includes(m)) ?? courants?.job_titles[0] ?? null;
  const ville = Object.keys(VILLES).find((v) => texte.includes(v)) ?? null;
  const toute = /toute la france|partout|n'importe ou/.test(texte);
  const contrats = CONTRATS_DITS.filter(([re]) => re.test(texte)).map(([, c]) => c);
  const remote: Teletravail[] = /teletravail|a distance|remote/.test(texte)
    ? ["teletravail"]
    : [];

  if (/^(bonjour|salut|hello|coucou|merci)/.test(texte)) {
    return {
      ...base(
        "chat",
        "small_talk",
        "Bonjour ! Dis-moi le métier que tu vises et la ville, et je te montre ce qui existe.",
      ),
      suggestions: ["Une alternance en data à Paris", "Un CDI de développeur à Lyon"],
    };
  }

  if (metier === null) {
    return {
      ...base(
        "clarify",
        "search",
        "Je t'écoute. Quel métier tu cherches ? Dis-le simplement, comme à un ami.",
      ),
      suggestions: ["Développeur", "Vendeur", "Comptable", "Infirmier"],
    };
  }

  const sansLieu =
    courants === null || (courants.location === null && !courants.whole_france);
  if (ville === null && !toute && remote.length === 0 && sansLieu) {
    return {
      ...base(
        "clarify",
        "search",
        `D'accord pour ${metier}. Dans quelle ville, ou tu cherches partout ?`,
      ),
      suggestions: ["Paris", "Lyon", "Marseille", "Toute la France"],
    };
  }

  const [latitude, longitude, dep] = ville === null ? [null, null, null] : VILLES[ville]!;
  const libelle = ville === null ? null : ville[0]!.toUpperCase() + ville.slice(1);
  const stockes = appliquerCriteres({
    query: contenu,
    job_titles: [metier[0]!.toUpperCase() + metier.slice(1)],
    keywords: [],
    location:
      libelle === null
        ? (courants?.location ?? null)
        : {
            label: libelle,
            latitude,
            longitude,
            radius_km: 30,
            department_codes: [dep!],
          },
    whole_france: toute,
    contract_types: contrats.length > 0 ? contrats : (courants?.contract_types ?? []),
    remote: remote.length > 0 ? remote : (courants?.remote ?? []),
    schedule: courants?.schedule ?? null,
    max_experience: courants?.max_experience ?? null,
    salary_min_monthly: courants?.salary_min_monthly ?? null,
  });
  const n = baseDuFil().length;
  const e = elargissements(stockes);
  const proposition =
    e.length === 0
      ? ""
      : ` Je peux élargir : ${e.map((x) => `${x.label.toLowerCase()} (+${x.gain})`).join(", ")}. Je le fais ?`;
  return {
    ...base(
      "search",
      courants === null ? "search" : "refine",
      n === 0
        ? `Je n'ai rien trouvé pour « ${resumeDesCriteres(stockes)} ».${proposition}`
        : `J'ai trouvé ${n} offre${n > 1 ? "s" : ""} pour « ${resumeDesCriteres(stockes)} ». Elles sont dans ton fil, les plus pertinentes d'abord.${proposition}`,
    ),
    results_count: n,
    criteria: versCriteres(stockes),
    suggestions: suggestions(stockes, e),
    widenings: e,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Le routage
// ─────────────────────────────────────────────────────────────────────

export function estUneRouteOffres(chemin: string): boolean {
  return ["/job-matches/", "/assistant/", "/search/"].some((p) => chemin.startsWith(p));
}

export function repondreOffres(
  methode: string,
  chemin: string,
  corps: unknown,
): Response {
  const sansRequete = chemin.split("?")[0] ?? chemin;
  const route = `${methode} ${sansRequete}`;

  if (route === "GET /job-matches/me") return filDesMatchs(chemin);
  if (route === "GET /job-matches/me/filter-options") return optionsDeFiltre();
  if (route === "POST /job-matches/me/seen") return marquerVues(corps);
  const match = routeDeMatch(methode, sansRequete, corps);
  if (match !== null) return match;

  if (route === "POST /assistant/messages") {
    const contenu = champ(corps, "content");
    if (typeof contenu !== "string" || contenu.trim() === "") {
      return erreur(422, "assistant_message_empty", "Le message est vide.", {
        field: "content",
      });
    }
    const fournie = champ(corps, "conversation_id");
    if (typeof fournie === "string" && !etat.conversations.has(fournie)) {
      return erreur(404, "conversation_not_found", "Conversation introuvable.");
    }
    const conversation = typeof fournie === "string" ? fournie : uuidAleatoire();
    etat.conversations.set(conversation, (etat.conversations.get(conversation) ?? 0) + 1);
    return json(200, repondre(contenu.trim(), conversation));
  }
  if (route === "GET /assistant/memory") {
    return json(200, {
      target_jobs: etat.criteres?.job_titles ?? [],
      locations: etat.criteres?.location === null ? [] : [etat.criteres?.location?.label],
      constraints: [],
      preferences: [],
      situation: [],
      summary: "",
      updated_at: etat.criteres?.updated_at ?? null,
    });
  }
  if (route === "DELETE /assistant/memory") return json(204, undefined);

  if (route === "GET /search/criteria") {
    return json(200, {
      criteria: etat.criteres === null ? null : versCriteres(etat.criteres),
    });
  }
  if (route === "PUT /search/criteria") return mettreLesCriteres(corps);
  if (route === "DELETE /search/criteria") {
    etat.criteres = null;
    return json(204, undefined);
  }
  if (route === "PUT /search/criteria/alerts") {
    if (etat.criteres === null) {
      return erreur(404, "criteria_not_found", "Aucune recherche en cours.");
    }
    etat.criteres.alerts_enabled = champ(corps, "enabled") === true;
    return json(200, { enabled: etat.criteres.alerts_enabled });
  }

  console.warn(`[karria] simulation : aucune route pour « ${route} »`);
  return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
}
