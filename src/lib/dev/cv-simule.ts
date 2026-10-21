/**
 * Le faux serveur du CV : `docs/contrat-api-cv.md`, en exécutable.
 *
 * ═══ Pourquoi il sert même en mode réel ═══
 *
 * La V1 n'a ni brouillon ni interprétation : ces routes n'existent que
 * dans le contrat de la nouvelle API. En développement, `lib/http.ts` les
 * lui confie donc quel que soit le mode (`enAvanceSurLeBackend`), et tout
 * le domaine CV avec elles, pour que le CV créé soit celui qu'on relit.
 * Le jour où le backend les sert, on retire le préfixe de la liste.
 *
 * ═══ L'interprète n'est pas Karria ═══
 *
 * Il tire un premier jet de la réponse par quelques motifs simples
 * (« chez … », « comme … », « 2 ans »…). Assez pour concevoir et
 * éprouver le parcours — jet, relance, correction, réponse hors sujet —,
 * jamais pour juger la qualité : c'est Gemini, côté serveur, qui
 * interprète vraiment.
 */

const PREFIXES_EN_AVANCE = ["/cv/", "/voice/transcribe"];

export function estUneRouteCv(chemin: string): boolean {
  return PREFIXES_EN_AVANCE.some((p) => chemin.startsWith(p));
}

const ORDRE = [
  "identity",
  "contact",
  "summary",
  "experiences",
  "educations",
  "skills",
  "interests",
  "photo",
] as const;
type Chapitre = (typeof ORDRE)[number];
const BOUCLES: readonly Chapitre[] = ["experiences", "educations"];

interface ChapitreSimule {
  status: "pending" | "in_progress" | "validated" | "skipped";
  data?: unknown;
  items?: unknown[];
}

interface Etat {
  brouillon: {
    id: string;
    current_chapter: Chapitre;
    chapters: Partial<Record<Chapitre, ChapitreSimule>>;
    updated_at: string;
  } | null;
  cv: Record<string, unknown> | null;
}

const etat: Etat = { brouillon: null, cv: null };

/** Les photos reçues, par identifiant : comme le vrai serveur, le
 *  brouillon ne retient que `image_id` et recalcule l'adresse. */
const photos = new Map<string, string>();

/** La forme d'erreur du socle : le code général d'après le statut, la
 *  raison fine dans `details.reason`. */
const CODES: Record<number, string> = {
  404: "not_found",
  409: "rule_violation",
  422: "invalid_input",
  503: "dependency_failure",
};

function json(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(statut: number, raison: string, message: string, details = {}): Response {
  return json(statut, {
    error: {
      code: CODES[statut] ?? "invalid_input",
      message,
      details: { reason: raison, ...details },
    },
  });
}

function avecAdresse(data: unknown): unknown {
  const id = champ(data, "image_id");
  return {
    image_id: id ?? null,
    image_url: typeof id === "string" ? (photos.get(id) ?? null) : null,
  };
}

function champ(corps: unknown, nom: string): unknown {
  return typeof corps === "object" && corps !== null
    ? (corps as Record<string, unknown>)[nom]
    : undefined;
}

function cvVide() {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    summary: null,
    image_url: null,
    identity: null,
    contact: null,
    experiences: [],
    educations: [],
    projects: [],
    skills: [],
    languages: [],
    interests: [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// L'interprète
// ─────────────────────────────────────────────────────────────────────

const majuscule = (t: string) => (t === "" ? t : t[0].toUpperCase() + t.slice(1));

/** « vendre, conseiller et encaisser » → trois éléments. */
function liste(texte: string): string[] {
  return texte
    .split(/,|;|\bet\b|\n|\./)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .map(majuscule);
}

function apres(texte: string, motifs: RegExp): string | null {
  const m = texte.match(motifs);
  return m?.[1]?.trim().replace(/[.,;]$/, "") ?? null;
}

/** « depuis 2022 », « en 2019 », « 2 ans » → dates `YYYY-MM`. */
function periode(texte: string): {
  debut: string | null;
  fin: string | null;
  enCours: boolean;
} {
  const annees = [...texte.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => m[0]);
  const enCours = /depuis|actuellement|en ce moment|toujours|aujourd'hui/i.test(texte);
  const duree = texte.match(/(\d+)\s*ans?\b/i);
  const maintenant = new Date().getFullYear();
  if (annees.length >= 2) {
    return { debut: `${annees[0]}-09`, fin: `${annees[1]}-06`, enCours: false };
  }
  if (annees.length === 1) {
    return { debut: `${annees[0]}-01`, fin: enCours ? null : null, enCours };
  }
  if (duree !== null) {
    return {
      debut: `${maintenant - Number(duree[1])}-01`,
      fin: enCours ? null : `${maintenant}-01`,
      enCours,
    };
  }
  return { debut: null, fin: null, enCours };
}

const LANGUES = [
  "anglais",
  "espagnol",
  "allemand",
  "italien",
  "portugais",
  "arabe",
  "chinois",
  "lingala",
  "wolof",
];
const CATEGORIES: [RegExp, string][] = [
  [/foot|basket|course|sport|natation|boxe|danse|yoga|vélo/i, "Sport"],
  [/lecture|cinéma|musique|théâtre|musée|histoire/i, "Culture"],
  [/jeu|code|informatique|tech|ia\b|robot/i, "Technologie"],
  [/bénévol|association|aide/i, "Associatif"],
  [/dessin|photo|peinture|écriture|cuisine/i, "Créativité"],
  [/voyage/i, "Voyage"],
];

interface Resultat {
  proposal: unknown;
  missing: string[];
  follow_up: string | null;
  off_topic: boolean;
}

function horsSujet(relance: string): Resultat {
  return { proposal: null, missing: [], follow_up: relance, off_topic: true };
}

function interpreter(chapitre: Chapitre, reponse: string): Resultat {
  const t = reponse.trim();
  if (t.length < 3) {
    return horsSujet("Je n'ai pas bien saisi. Tu peux me le redire en une phrase ?");
  }
  switch (chapitre) {
    case "identity": {
      const nomComplet =
        apres(
          t,
          /(?:je m'appelle|je suis|moi c'est)\s+([A-ZÀ-Ü][\w'-]+(?:\s+[A-ZÀ-Ü][\w'-]+)?)/,
        ) ??
        t.match(/^([A-ZÀ-Ü][\w'-]+\s+[A-ZÀ-Ü][\w'-]+)/)?.[1] ??
        null;
      if (nomComplet === null) {
        return horsSujet("Commençons simplement : quels sont ton prénom et ton nom ?");
      }
      const [prenom, ...reste] = nomComplet.split(/\s+/);
      const titre = apres(
        t,
        /(?:devenir|être|poste de|travailler comme|je cherche (?:un poste de |à être )?)\s+([^.,]+)/i,
      );
      const proposal = {
        first_name: majuscule(prenom),
        last_name: reste.join(" ").toUpperCase(),
        headline: titre === null ? null : majuscule(titre),
      };
      return {
        proposal,
        missing: proposal.last_name === "" ? ["last_name"] : [],
        follow_up: proposal.last_name === "" ? "Et ton nom de famille ?" : null,
        off_topic: false,
      };
    }
    case "contact": {
      const email = t.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? null;
      const tel = t.match(/(?:\+33\s?|0)[1-9](?:[\s.-]?\d{2}){4}/)?.[0] ?? null;
      const ville = apres(
        t,
        /(?:j'habite|je vis|j'habite à|basé à|à)\s+([A-ZÀ-Ü][\wÀ-ü' -]+)/,
      );
      const liens = [
        ...t.matchAll(
          /(?:https?:\/\/)?(?:www\.)?(linkedin\.com\/[\w/-]+|github\.com\/[\w-]+)/gi,
        ),
      ].map((m) => ({
        label: m[1].startsWith("linkedin") ? "LinkedIn" : "GitHub",
        url: `https://${m[1]}`,
      }));
      if (email === null && tel === null && ville === null) {
        return horsSujet(
          "Donne-moi au moins un moyen de te joindre : ton e-mail ou ton téléphone.",
        );
      }
      return {
        proposal: { email, phone: tel, city: ville, links: liens },
        missing: email === null ? ["email"] : [],
        follow_up: email === null ? "Tu as une adresse e-mail à mettre ?" : null,
        off_topic: false,
      };
    }
    case "summary": {
      const phrases = t
        .replace(/\s+/g, " ")
        .split(/(?<=[.!?])\s/)
        .map(majuscule);
      return {
        proposal: { summary: phrases.join(" ").replace(/([^.!?])$/, "$1.") },
        missing: [],
        follow_up: null,
        off_topic: false,
      };
    }
    case "experiences": {
      if (/pas (encore )?d'exp|jamais travaillé|aucune exp/i.test(t)) {
        return horsSujet(
          "Pas de souci, ça viendra ! Passe ce chapitre, on parlera de tes études.",
        );
      }
      const poste = apres(
        t,
        /(?:comme|en tant que|j'étais|poste de|j'ai été)\s+([^,.]+?)(?:\s+chez|\s+à|,|\.|$)/i,
      );
      const entreprise = apres(
        t,
        /chez\s+([A-ZÀ-Ü0-9][\wÀ-ü&' -]*?)(?:\s+(?:à|pendant|depuis|en|comme|où)\b|,|\.|$)/,
      );
      const lieu = apres(t, /\bà\s+([A-ZÀ-Ü][\wÀ-ü' -]+?)(?:\s|,|\.|$)/);
      const missions = apres(
        t,
        /(?:je|j')\s*(?:m'occupais|gérais|faisais|devais|ai)\s+(?:de\s+)?([^.]+)/i,
      );
      const p = periode(t);
      if (poste === null && entreprise === null) {
        return horsSujet(
          "Dis-moi où tu as travaillé et ce que tu faisais, par exemple : « vendeuse chez Zara pendant 2 ans ».",
        );
      }
      const proposal = {
        position: majuscule(poste ?? "Poste à préciser"),
        company: entreprise ?? "",
        location: lieu,
        start_date: p.debut,
        end_date: p.fin,
        is_current: p.enCours,
        missions: missions === null ? [] : liste(missions),
      };
      const manquants = [
        ...(entreprise === null ? ["company"] : []),
        ...(p.debut === null ? ["start_date"] : []),
      ];
      return {
        proposal,
        missing: manquants,
        follow_up:
          entreprise === null
            ? "C'était dans quelle entreprise ?"
            : p.debut === null
              ? "Tu as commencé quand, à peu près ?"
              : missions === null
                ? "Qu'est-ce que tu y faisais au quotidien ?"
                : null,
        off_topic: false,
      };
    }
    case "educations": {
      const diplome =
        t.match(
          /\b(bac(?:calauréat)?(?:\s+\w+)?|licence[^,.]*|master[^,.]*|bts[^,.]*|but[^,.]*|cap[^,.]*|dut[^,.]*|doctorat[^,.]*|brevet)/i,
        )?.[1] ?? null;
      const ecole = apres(
        t,
        /(?:à l'|à la|au|à|chez)\s+((?:université|lycée|école|iut|ens|ecole|epitech|[A-ZÀ-Ü])[\wÀ-ü' -]*?)(?:\s+(?:en|depuis|de)\b|,|\.|$)/i,
      );
      const p = periode(t);
      if (diplome === null) {
        return horsSujet(
          "Quel diplôme, et dans quelle école ? Par exemple : « un BTS commerce au lycée Jean Jaurès en 2021 ».",
        );
      }
      return {
        proposal: {
          degree: majuscule(diplome.trim()),
          school: ecole === null ? "" : majuscule(ecole),
          location: null,
          start_date: p.debut,
          end_date: p.fin,
          is_in_progress: p.enCours || /en cours|actuellement/i.test(t),
        },
        missing: ecole === null ? ["school"] : [],
        follow_up: ecole === null ? "Dans quelle école ?" : null,
        off_topic: false,
      };
    }
    case "skills": {
      const morceaux = liste(t);
      const langues = morceaux
        .filter((m) => LANGUES.some((l) => m.toLowerCase().includes(l)))
        .map((m) => {
          const langue = LANGUES.find((l) => m.toLowerCase().includes(l)) ?? m;
          const niveau = /natif|maternelle/i.test(m)
            ? "Natif"
            : /courant|bilingue/i.test(m)
              ? "C1"
              : /scolaire|notions|débutant/i.test(m)
                ? "A2"
                : "B2";
          return { language: majuscule(langue), level: niveau };
        });
      const competences = morceaux
        .filter((m) => !LANGUES.some((l) => m.toLowerCase().includes(l)))
        .map((m) => ({
          name: m
            .replace(/^(je sais |je connais |je maîtrise |bon en |bonne en )/i, "")
            .trim(),
          level: /expert|très bien|maîtrise/i.test(m) ? "Avancé" : "Intermédiaire",
        }))
        .map((c) => ({ ...c, name: majuscule(c.name) }));
      if (competences.length === 0 && langues.length === 0) {
        return horsSujet("Cite-moi deux ou trois choses que tu sais bien faire.");
      }
      return {
        proposal: { skills: competences, languages: langues },
        missing: [],
        follow_up: langues.length === 0 ? "Tu parles d'autres langues ?" : null,
        off_topic: false,
      };
    }
    case "interests": {
      const interets = liste(
        t.replace(/^(j'aime|j'adore|je fais|ma passion c'est)\s*/i, ""),
      ).map((nom) => ({
        name: nom,
        category: CATEGORIES.find(([motif]) => motif.test(nom))?.[1] ?? "Autre",
      }));
      return interets.length === 0
        ? horsSujet("Qu'est-ce que tu aimes faire quand tu ne travailles pas ?")
        : {
            proposal: { interests: interets },
            missing: [],
            follow_up: null,
            off_topic: false,
          };
    }
    case "photo":
      return horsSujet("La photo se choisit avec les boutons, pas besoin de l'écrire.");
  }
}

/** Les réponses « entendues » par la fausse transcription : une par
 *  chapitre, pour éprouver la voix sans micro ni serveur. */
const ENTENDU: Record<Chapitre, string> = {
  identity: "Je m'appelle Awa Diallo et je voudrais devenir conseillère de vente",
  contact: "awa.diallo@gmail.com, 06 12 34 56 78, j'habite à Montreuil",
  summary:
    "j'adore le contact avec les clients et je suis quelqu'un de souriant et organisé. je cherche un poste où je peux apprendre et évoluer",
  experiences:
    "j'ai travaillé comme vendeuse chez Zara à Paris pendant 2 ans, je m'occupais de conseiller les clients, ranger la réserve et tenir la caisse",
  educations: "j'ai eu un BTS commerce au lycée Jean Jaurès en 2021",
  skills:
    "la vente, l'encaissement, le travail en équipe, anglais courant et espagnol scolaire",
  interests: "j'aime la danse, la cuisine et le bénévolat aux Restos du cœur",
  photo: "",
};

// ─────────────────────────────────────────────────────────────────────
// Le routage
// ─────────────────────────────────────────────────────────────────────

function brouillonNeuf() {
  return {
    id: `brl_${Math.random().toString(36).slice(2, 10)}`,
    current_chapter: "identity" as Chapitre,
    chapters: { identity: { status: "in_progress" as const } },
    updated_at: new Date().toISOString(),
  };
}

export function repondreCv(methode: string, chemin: string, corps: unknown): Response {
  const route = `${methode} ${chemin.split("?")[0]}`;

  if (route === "GET /cv/me") return json(200, etat.cv ?? cvVide());

  if (route === "GET /cv/draft") {
    return etat.brouillon === null
      ? erreur(404, "draft_not_found", "Aucun brouillon.")
      : json(200, etat.brouillon);
  }

  if (route === "POST /cv/draft") {
    etat.brouillon ??= brouillonNeuf();
    return json(201, etat.brouillon);
  }

  if (route === "POST /voice/transcribe") {
    return json(200, { text: ENTENDU[etat.brouillon?.current_chapter ?? "identity"] });
  }

  if (route === "POST /cv/photo") {
    // Le `FormData` de React Native expose ses parties : on y lit l'image
    // choisie, que la simulation renvoie telle quelle.
    const parties =
      (
        corps as {
          getParts?: () => { fieldName: string; uri?: string; string?: string }[];
        }
      ).getParts?.() ?? [];
    const image = parties.find((p) => p.fieldName === "image")?.uri ?? null;
    if (image === null) {
      return erreur(422, "chapter_invalid", "Image manquante.", { field: "image" });
    }
    if (parties.find((p) => p.fieldName === "enhance")?.string === "true") {
      return erreur(
        503,
        "photo_enhance_unavailable",
        "L'amélioration de photo arrive avec la nouvelle API.",
      );
    }
    const id = `img_${photos.size + 1}`;
    photos.set(id, image);
    return json(201, { image_id: id, image_url: image, enhanced: false });
  }

  if (route === "POST /cv/draft/interpret") {
    const chapitre = champ(corps, "chapter") as Chapitre;
    const reponse = champ(corps, "answer");
    if (!ORDRE.includes(chapitre) || typeof reponse !== "string") {
      return erreur(422, "chapter_invalid", "Chapitre ou réponse invalide.");
    }
    return json(200, interpreter(chapitre, reponse));
  }

  const validation = route.match(/^PUT \/cv\/draft\/chapters\/(\w+)$/);
  if (validation !== null) {
    const chapitre = validation[1] as Chapitre;
    const brouillon = etat.brouillon;
    if (brouillon === null) return erreur(404, "draft_not_found", "Aucun brouillon.");
    if (!ORDRE.includes(chapitre))
      return erreur(422, "chapter_invalid", "Chapitre inconnu.");
    const items = champ(corps, "items");
    const data = champ(corps, "data");
    brouillon.chapters[chapitre] =
      champ(corps, "skipped") === true
        ? { status: "skipped" }
        : BOUCLES.includes(chapitre)
          ? { status: "validated", items: Array.isArray(items) ? items : [] }
          : {
              status: "validated",
              data: chapitre === "photo" ? avecAdresse(data) : data,
            };
    const suivant = ORDRE.find(
      (c) =>
        !["validated", "skipped"].includes(brouillon.chapters[c]?.status ?? "pending"),
    );
    if (suivant !== undefined) {
      brouillon.current_chapter = suivant;
      brouillon.chapters[suivant] ??= { status: "in_progress" };
    }
    brouillon.updated_at = new Date().toISOString();
    return json(200, brouillon);
  }

  if (route === "POST /cv/draft/finalize") {
    const brouillon = etat.brouillon;
    if (brouillon === null) return erreur(404, "draft_not_found", "Aucun brouillon.");
    const restants = ORDRE.filter(
      (c) =>
        !["validated", "skipped"].includes(brouillon.chapters[c]?.status ?? "pending"),
    );
    if (restants.length > 0) {
      return erreur(409, "draft_incomplete", "Des chapitres restent à faire.", {
        chapters: restants,
      });
    }
    const donnee = (c: Chapitre) =>
      brouillon.chapters[c]?.data as Record<string, unknown> | undefined;
    const elements = (c: Chapitre) => brouillon.chapters[c]?.items ?? [];
    etat.cv = {
      ...cvVide(),
      identity: donnee("identity") ?? null,
      contact: donnee("contact") ?? null,
      summary: donnee("summary")?.summary ?? null,
      image_url: donnee("photo")?.image_url ?? null,
      experiences: elements("experiences"),
      educations: elements("educations"),
      skills: donnee("skills")?.skills ?? [],
      languages: donnee("skills")?.languages ?? [],
      interests: donnee("interests")?.interests ?? [],
    };
    etat.brouillon = null;
    return json(201, etat.cv);
  }

  return erreur(404, "simulation_route_inconnue", `Route CV non simulée : ${route}.`);
}
