/**
 * Les règles de la publicité dans les listes : où, combien, avec quel bloc.
 *
 * ═══ Pourquoi la publicité, et pourquoi si peu ═══
 *
 * Karria est gratuite ; les annonces la financent. Mais une liste où l'on
 * cherche un emploi n'est pas un présentoir : une annonce **jamais en
 * tête** (la première carte est toujours une offre), puis une toutes les
 * `intervalle` offres, et un plafond par liste (`plafond`) — au-delà, le
 * revenu marginal ne vaut pas l'agacement. Aucune annonce dans la
 * conversation avec Karria ni dans la création du CV : ce sont des
 * moments de confiance, pas d'audience.
 *
 * ═══ Les blocs d'annonces ═══
 *
 * En développement (ou `EXPO_PUBLIC_ADMOB_TEST_MODE=true`), les blocs de
 * test de Google : cliquer dessus ne coûte rien à personne et ne risque
 * pas la suspension du compte AdMob. En production, les blocs réels lus
 * dans l'environnement ; s'ils manquent, **pas** de publicité plutôt que
 * des annonces de test servies à de vrais utilisateurs.
 */

export interface RegleDeListe {
  /** Une annonce après chaque groupe de `intervalle` offres. */
  intervalle: number;
  /** Au plus `plafond` annonces dans une même liste. */
  plafond: number;
}

/** Bornes de l'intervalle réglable par l'environnement. */
const INTERVALLE_MIN = 4;
const INTERVALLE_MAX = 20;
const INTERVALLE_PAR_DEFAUT = 7;

/** Lit l'intervalle réglé (`EXPO_PUBLIC_ADMOB_FEED_INTERVAL`), borné. */
export function intervalleDepuis(valeur: string | undefined): number {
  const n = Number(valeur);
  if (!Number.isInteger(n)) return INTERVALLE_PAR_DEFAUT;
  return Math.min(INTERVALLE_MAX, Math.max(INTERVALLE_MIN, n));
}

export const REGLE_DU_FIL: RegleDeListe = {
  intervalle: intervalleDepuis(process.env.EXPO_PUBLIC_ADMOB_FEED_INTERVAL),
  plafond: 8,
};

/**
 * Les emplacements que `nombre` offres peuvent accueillir : 0, 1, 2…
 * L'emplacement `e` se pose après l'offre de rang `(e + 1) × intervalle − 1`,
 * et seulement si cette offre existe — jamais d'annonce en fin de liste
 * vide ni en tête.
 */
export function emplacementsPour(nombre: number, regle: RegleDeListe): number[] {
  const possibles = Math.floor(Math.max(0, nombre) / regle.intervalle);
  return Array.from({ length: Math.min(possibles, regle.plafond) }, (_, e) => e);
}

/**
 * Entrelace les annonces **chargées** dans la liste. Un emplacement sans
 * annonce (pas encore chargée, pas d'annonce disponible) n'existe tout
 * simplement pas : aucun trou, aucune cellule vide.
 */
export function entrelacer<T>(
  elements: readonly T[],
  annonces: ReadonlyMap<number, T>,
  regle: RegleDeListe,
): T[] {
  const resultat: T[] = [];
  elements.forEach((element, rang) => {
    resultat.push(element);
    if ((rang + 1) % regle.intervalle !== 0) return;
    const emplacement = (rang + 1) / regle.intervalle - 1;
    if (emplacement >= regle.plafond) return;
    const annonce = annonces.get(emplacement);
    if (annonce !== undefined) resultat.push(annonce);
  });
  return resultat;
}

export type BlocAnnonce =
  { mode: "test" } | { mode: "reel"; id: string } | { mode: "coupe" };

/** Le bloc d'annonces natives à demander, selon l'environnement. */
export function blocNatif(env: {
  developpement: boolean;
  modeTest: string | undefined;
  plateforme: "ios" | "android";
  idIos: string | undefined;
  idAndroid: string | undefined;
}): BlocAnnonce {
  if (env.developpement || env.modeTest === "true") return { mode: "test" };
  const id = (env.plateforme === "ios" ? env.idIos : env.idAndroid)?.trim();
  return id !== undefined && /^ca-app-pub-\d+\/\d+$/.test(id)
    ? { mode: "reel", id }
    : { mode: "coupe" };
}
