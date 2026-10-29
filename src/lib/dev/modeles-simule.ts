/**
 * Le faux serveur des modèles de CV : les routes `/templates/` et
 * `/user-templates/` de `docs/contrat-api-modeles.md`, que `karria_api_v2`
 * ne sert pas encore (vérifié le 2026-10-24 : 404 en production).
 *
 * ═══ Pourquoi ce fichier existe ═══
 *
 * Avec la cible `v2`, tout ce que la v2 ne sert pas part au faux serveur
 * (`enAvanceSurLeBackend`). Ce fichier est la forme exacte que l'application
 * attend du futur module : identifiants UUID, `is_premium`, `pages` du
 * détail, URL d'aperçus. Le jour où la v2 sert `/templates/`, on ajoute
 * `"/templates/"` et `"/user-templates/"` à `SERVI_PAR_LA_V2`
 * (`serveur-simule.ts`) — rien d'autre ne change.
 *
 * ═══ Les aperçus ═══
 *
 * Les trois modèles du PoC de l'ADR-0020 (Meridian, Marketing,
 * Minimalist), avec leurs vrais rendus : vignette 480 px et page 900 px en
 * WebP, rangés dans `lib/dev/modeles/` — donc **absents du paquet de
 * production** (`metro.config.js` écarte `lib/dev/`). Metro les sert en
 * développement ; `resolveAssetSource` en donne l'URL, une vraie chaîne,
 * comme le serait une URL signée. `thumbnail_blurhash` est un champ
 * **proposé** au contrat : le flou qui précède l'image.
 *
 * L'achat d'un modèle Premium passe par Stripe (`paiements-simule.ts`) :
 * `POST /user-templates/me` ne sert que les modèles gratuits, et le faux
 * paiement remet le modèle par `possederModele`.
 */

import { Image } from "react-native";

/** L'URL d'une image du dépôt, servie par Metro en développement. Sous
 *  Jest, aucune URL n'existe : `null`, comme un modèle sans aperçu. */
function url(module: number): string | null {
  return Image.resolveAssetSource(module)?.uri ?? null;
}

const IMAGES = {
  meridian: {
    vignette: url(require("./modeles/meridian-vignette.webp")),
    page: url(require("./modeles/meridian-page.webp")),
    flou: "dBR{#?~q-;%M-;t7M{j[xuxuIUWCxuxuWBR*xuofWBay",
  },
  marketing: {
    vignette: url(require("./modeles/marketing-vignette.webp")),
    page: url(require("./modeles/marketing-page.webp")),
    flou: "dASY{q-;t7~q-;s;WBWBt7fQWBj[?bWVWBoft7WBWBof",
  },
  minimalist: {
    vignette: url(require("./modeles/minimalist-vignette.webp")),
    page: url(require("./modeles/minimalist-page.webp")),
    flou: "d8S6Pl~qxu?bxut7IUxuIUt7IU%M-;t7Rjxuoft7WBt7",
  },
} as const;

type NomDImage = keyof typeof IMAGES;

/** Les identifiants, des UUID comme ceux de la v2. */
const ID = {
  meridian: "6f1c2b0e-8d4a-4c1e-9a57-0b3f1e2d4c01",
  marketing: "9b2e7c41-3f6d-4a8b-b1c2-5e7f9a0d1b02",
  minimalist: "c4d81a93-7e25-4f0b-8c6d-2a9e4b7f3c03",
} as const;

interface ChampsDuModele {
  label: string;
  category: string;
  description: string;
  is_premium: boolean;
  price?: string;
  tags: string[];
  views_count: number;
  uses_count: number;
  rating_avg: number;
  rating_count: number;
  primary_color: string;
  font_family: string;
  has_photo: boolean;
  columns: number;
  ats: { readiness: "good" | "warning"; warnings: string[] };
}

function modele(nom: NomDImage, champs: ChampsDuModele) {
  const image = IMAGES[nom];
  return {
    id: ID[nom],
    name: nom,
    price: null as string | null,
    signed_thumbnail_url: image.vignette,
    signed_preview_url: image.page,
    signed_full_url: image.page,
    thumbnail_blurhash: image.flou,
    cover_letters: [] as never[],
    version: 1,
    formats: ["pdf", "docx"],
    fields_added: ["headline"],
    ats_safe_available: true,
    ...champs,
  };
}

const MODELES = [
  modele("meridian", {
    label: "Meridian",
    category: "étudiant",
    description:
      "Formation d'abord, une colonne de repères et une frise discrète : quand le parcours commence.",
    is_premium: false,
    tags: ["sobre", "frise", "photo ronde"],
    views_count: 15_030,
    uses_count: 4_870,
    rating_avg: 4.6,
    rating_count: 418,
    primary_color: "#000000",
    font_family: "Raleway",
    has_photo: true,
    columns: 2,
    ats: { readiness: "warning", warnings: ["spaced_titles", "photo"] },
  }),
  modele("marketing", {
    label: "Marketing",
    category: "professionnel",
    description:
      "Deux colonnes séparées de filets fins, un nom en grand : l'expérience se lit d'un coup d'œil.",
    is_premium: false,
    tags: ["épuré", "deux colonnes"],
    views_count: 9_870,
    uses_count: 2_104,
    rating_avg: 4.4,
    rating_count: 265,
    primary_color: "#3f3f46",
    font_family: "Aileron",
    has_photo: false,
    columns: 2,
    ats: { readiness: "good", warnings: [] },
  }),
  modele("minimalist", {
    label: "Minimalist",
    category: "créatif",
    description:
      "Une typographie franche et une photo : pour les profils créatifs et de direction.",
    is_premium: true,
    price: "4.99",
    tags: ["créatif", "photo", "direction"],
    views_count: 6_320,
    uses_count: 980,
    rating_avg: 4.8,
    rating_count: 142,
    primary_color: "#1f1f1f",
    font_family: "Montserrat",
    has_photo: true,
    columns: 2,
    ats: { readiness: "warning", warnings: ["photo", "multi_column"] },
  }),
];

/** Les pages du carrousel du détail (`GET /templates/{id}`). */
function pages(m: (typeof MODELES)[number]) {
  return [
    {
      kind: "cv",
      label: "CV",
      signed_thumbnail_url: m.signed_thumbnail_url,
      signed_full_url: m.signed_full_url,
    },
  ];
}

const AVIS = [
  {
    id: 1,
    rating: 5,
    title: "Simple et efficace",
    body: "Rempli en vingt minutes, deux entretiens la semaine suivante.",
    created_at: "2026-09-18T09:12:00Z",
    author_name: "Nadia B.",
    author_initials: "NB",
  },
  {
    id: 2,
    rating: 4,
    title: null,
    body: "Très lisible. J'aurais aimé une variante sans photo.",
    created_at: "2026-10-02T17:40:00Z",
    author_name: "Karim L.",
    author_initials: "KL",
  },
];

/** Les modèles acquis par la personne : Meridian dès le départ, comme la
 *  V1 offrait un modèle à l'inscription. */
const DEPART = [ID.meridian];
const etat = { possedes: new Set<string>(DEPART) };

export function estUneRouteModele(chemin: string): boolean {
  const sansRequete = chemin.split("?")[0];
  return (
    sansRequete.startsWith("/templates/") || sansRequete.startsWith("/user-templates/")
  );
}

function json(statut: number, corps: unknown): Response {
  return new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(statut: number, code: string, message: string, details = {}): Response {
  return json(statut, {
    error: { code, message, details: { reason: code, ...details } },
  });
}

function champ(corps: unknown, nom: string): unknown {
  return typeof corps === "object" && corps !== null
    ? (corps as Record<string, unknown>)[nom]
    : undefined;
}

function possession(id: string) {
  return { id: `possession-${id}`, template: { id }, is_active: true };
}

export function repondreModeles(
  methode: string,
  chemin: string,
  corps: unknown,
): Response {
  const route = `${methode} ${chemin.split("?")[0]}`;

  if (route === "GET /templates/") return json(200, MODELES);

  if (route === "GET /user-templates/me") {
    return json(200, [...etat.possedes].map(possession));
  }

  if (route === "POST /user-templates/me") {
    const id = String(champ(corps, "template_id"));
    const trouve = MODELES.find((m) => m.id === id);
    if (trouve === undefined) {
      return erreur(404, "template_not_found", "Modèle introuvable.", {
        template_id: id,
      });
    }
    if (trouve.is_premium) {
      return erreur(422, "template_not_free", "Ce modèle s'achète.", { template_id: id });
    }
    etat.possedes.add(id);
    return json(201, possession(id));
  }

  const detail = /^(GET|POST) \/templates\/([0-9a-f-]+)(\/reviews|\/view)?$/.exec(route);
  if (detail !== null) {
    const id = detail[2];
    const trouve = MODELES.find((m) => m.id === id);
    if (trouve === undefined) {
      return erreur(404, "template_not_found", "Modèle introuvable.", {
        template_id: id,
      });
    }
    if (detail[1] === "GET" && detail[3] === undefined) {
      return json(200, { ...trouve, pages: pages(trouve) });
    }
    if (detail[1] === "GET" && detail[3] === "/reviews") {
      return json(200, {
        items: trouve.rating_count > 0 ? AVIS : [],
        total: trouve.rating_count,
        rating_avg: trouve.rating_avg,
        rating_count: trouve.rating_count,
      });
    }
    if (detail[1] === "POST" && detail[3] === "/view") return json(204, undefined);
  }

  console.warn(`[karria] simulation : aucune route pour « ${route} »`);
  return erreur(404, "simulation_route_inconnue", `Route non simulée : ${route}.`);
}

/** Pour les tests seulement : repart des possessions de départ. */
export function reinitialiserModeles(): void {
  etat.possedes = new Set(DEPART);
}

/** Un modèle par identifiant (ou par nom), et s'il est déjà à la personne —
 *  pour le faux serveur des paiements, qui vend et remet les Premium. */
export function trouverModele(
  idOuNom: string,
): { id: string; is_premium: boolean; possede: boolean } | undefined {
  const m = MODELES.find((x) => x.id === idOuNom || x.name === idOuNom);
  return m === undefined
    ? undefined
    : { id: m.id, is_premium: m.is_premium, possede: etat.possedes.has(m.id) };
}

/** Ce que ferait le webhook du vrai serveur : le modèle payé est remis. */
export function possederModele(id: string): void {
  etat.possedes.add(id);
}
