/**
 * Le faux serveur des modèles de CV : les routes `/templates/` et
 * `/user-templates/` de la V1, que `karria_api_v2` ne sert pas encore.
 *
 * ═══ Pourquoi ce fichier existe ═══
 *
 * Avec la cible `v2`, tout ce que la v2 ne sert pas part au faux serveur
 * (`enAvanceSurLeBackend`). Les modèles en faisaient partie **sans
 * qu'aucune route ne les simule** : l'onglet Modèles affichait « Les
 * modèles n'ont pas pu être chargés » sur un 404 `simulation_route_inconnue`.
 * Ce fichier est la forme exacte que l'application attend du futur module
 * — `features/modeles/types/modeles.types.ts` la décrit du côté de l'app.
 *
 * ═══ Ce qu'il ne simule pas ═══
 *
 * Les images. Les URL de miniatures sont **signées** et viennent du stockage
 * de la V1 ; ici elles valent `null`, et la carte montre le symbole Karria.
 * L'achat d'un modèle Pro passe par l'achat intégré, hors de ce contrat :
 * `POST /user-templates/me` ne sert que les modèles gratuits.
 */

interface ModeleSimule {
  id: number;
  name: string;
  label: string;
  category: string | null;
  description: string | null;
  is_premium: boolean;
  price: string | null;
  tags: string[];
  signed_thumbnail_url: string | null;
  signed_preview_url: string | null;
  signed_full_url: string | null;
  views_count: number;
  uses_count: number;
  rating_avg: number;
  rating_count: number;
  primary_color: string | null;
  font_family: string | null;
  has_photo: boolean;
  cover_letters: {
    id: number;
    label: string;
    signed_thumbnail_url: null;
    signed_preview_url: null;
    signed_full_url: null;
  }[];
}

const SANS_IMAGE = {
  signed_thumbnail_url: null,
  signed_preview_url: null,
  signed_full_url: null,
} as const;

function modele(
  id: number,
  champs: Pick<
    ModeleSimule,
    "name" | "label" | "category" | "description" | "is_premium"
  > &
    Partial<ModeleSimule>,
): ModeleSimule {
  return {
    price: champs.is_premium ? "4.99" : null,
    tags: [],
    ...SANS_IMAGE,
    views_count: 0,
    uses_count: 0,
    rating_avg: 0,
    rating_count: 0,
    primary_color: null,
    font_family: null,
    has_photo: false,
    cover_letters: [],
    id,
    ...champs,
  };
}

const MODELES: ModeleSimule[] = [
  modele(1, {
    name: "classique",
    label: "Classique",
    category: "professionnel",
    description:
      "Sobre et lisible : le modèle qui passe partout, du cabinet à l'atelier.",
    is_premium: false,
    tags: ["sobre", "ATS"],
    views_count: 12_480,
    uses_count: 3_215,
    rating_avg: 4.6,
    rating_count: 418,
    primary_color: "#1f2937",
    font_family: "Inter",
  }),
  modele(2, {
    name: "moderne",
    label: "Moderne",
    category: "créatif",
    description:
      "Une colonne de couleur, une photo : pour les métiers où l'on se montre.",
    is_premium: false,
    tags: ["photo", "couleur"],
    views_count: 9_870,
    uses_count: 2_104,
    rating_avg: 4.4,
    rating_count: 265,
    primary_color: "#2563eb",
    font_family: "Manrope",
    has_photo: true,
    cover_letters: [{ id: 21, label: "Lettre moderne", ...SANS_IMAGE }],
  }),
  modele(3, {
    name: "elegant",
    label: "Élégant",
    category: "professionnel",
    description: "Serif et marges larges : cadres, juristes, finance.",
    is_premium: true,
    tags: ["serif", "cadre"],
    views_count: 6_320,
    uses_count: 980,
    rating_avg: 4.8,
    rating_count: 142,
    primary_color: "#7c2d12",
    font_family: "Playfair Display",
    cover_letters: [{ id: 31, label: "Lettre élégante", ...SANS_IMAGE }],
  }),
  modele(4, {
    name: "compact",
    label: "Compact",
    category: "technique",
    description:
      "Tout tient sur une page, compétences en tête : développeurs, techniciens.",
    is_premium: false,
    tags: ["une page", "compétences"],
    views_count: 7_750,
    uses_count: 1_640,
    rating_avg: 4.3,
    rating_count: 201,
    primary_color: "#0f766e",
    font_family: "IBM Plex Sans",
  }),
  modele(5, {
    name: "audacieux",
    label: "Audacieux",
    category: "créatif",
    description: "Grands titres, aplats francs : design, communication, événementiel.",
    is_premium: true,
    tags: ["design", "photo"],
    views_count: 4_110,
    uses_count: 512,
    rating_avg: 4.5,
    rating_count: 88,
    primary_color: "#db2777",
    font_family: "Space Grotesk",
    has_photo: true,
  }),
  modele(6, {
    name: "etudiant",
    label: "Premier emploi",
    category: "étudiant",
    description:
      "Formation d'abord, stages et projets ensuite : quand l'expérience commence.",
    is_premium: false,
    tags: ["étudiant", "alternance"],
    views_count: 15_030,
    uses_count: 4_870,
    rating_avg: 4.2,
    rating_count: 530,
    primary_color: "#4f46e5",
    font_family: "Inter",
  }),
];

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

/** Les modèles acquis par la personne : le « Classique » dès le départ,
 *  comme la V1 l'offrait à l'inscription. */
const etat = { possedes: new Set<number>([1]) };

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

function possession(id: number) {
  return { id: 1_000 + id, template: { id }, is_active: true };
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
    const id = Number(champ(corps, "template_id"));
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

  const detail = /^(GET|POST) \/templates\/(\d+)(\/reviews|\/view)?$/.exec(route);
  if (detail !== null) {
    const id = Number(detail[2]);
    const trouve = MODELES.find((m) => m.id === id);
    if (trouve === undefined) {
      return erreur(404, "template_not_found", "Modèle introuvable.", {
        template_id: id,
      });
    }
    if (detail[1] === "GET" && detail[3] === undefined) return json(200, trouve);
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
  etat.possedes = new Set([1]);
}
