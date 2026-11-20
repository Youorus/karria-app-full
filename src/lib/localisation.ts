/**
 * Ce que l'appareil dit de sa langue, de sa région et de son fuseau.
 *
 * ═══ Pourquoi ce fichier est dans `lib/` ═══
 *
 * Deux domaines s'en servent : `notifications` range ces valeurs dans la
 * fiche de l'appareil, et `auth` joint la région et le fuseau à la requête
 * qui crée le compte — c'est ainsi que Karria sait d'où viennent ses
 * inscrits sans le leur demander (ADR-0042 de l'API). Une seule lecture,
 * pour que les deux disent la même chose.
 *
 * ═══ D'où viennent les valeurs ═══
 *
 * D'`Intl`, que Hermes fournit sur les deux plateformes : aucune
 * permission, aucun module natif. La région est celle de la langue résolue
 * (« fr-BE » → « BE ») : sur iOS elle suit le réglage « Région », sur
 * Android la région de la langue préférée. `expo-localization` la lirait
 * plus directement, avec une dépendance de plus ; le jour où il faut la
 * liste des langues préférées, on l'ajoutera — et on la demandera d'abord.
 *
 * ═══ Ce que ce n'est pas ═══
 *
 * Ni une position, ni une adresse IP : un réglage du téléphone. Quelqu'un
 * à Lyon dont l'appareil est réglé sur « Sénégal » annonce « SN ».
 */

export interface Localisation {
  langue: string | null;
  fuseauHoraire: string | null;
}

/** L'origine telle que le serveur l'accepte à la connexion : la forme
 *  exacte, ou la clé absente. */
export interface OrigineAppareil {
  region?: string;
  timezone?: string;
}

/** Longueur maximale d'un nom de fuseau acceptée par le serveur. */
const FUSEAU_MAX = 64;
/** Un nom IANA : « Europe/Brussels », « America/Argentina/Buenos_Aires », « UTC ». */
const FUSEAU = /^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+){0,2}$/;
/** « ZZ » est la « région inconnue » d'Unicode : l'envoyer compterait un pays. */
const REGION_INCONNUE = "ZZ";

/** « fr-FR » → « FR », « fr » → `null`. */
export function regionDepuisLangue(langue: string | null): string | null {
  if (langue === null) return null;
  const m = /^[a-z]{2,3}(?:-[A-Za-z]{4})?[-_]([A-Za-z]{2})\b/.exec(langue);
  return m === null ? null : m[1].toUpperCase();
}

/** Ce que le moteur sait de la langue et du fuseau de l'appareil. */
export function lireLocalisation(): Localisation {
  try {
    const options = Intl.DateTimeFormat().resolvedOptions();
    return {
      langue: options.locale || null,
      fuseauHoraire: options.timeZone || null,
    };
  } catch (cause) {
    // `Intl` incomplet sur un moteur exotique : on envoie « inconnu »
    // plutôt que de renoncer à enregistrer l'appareil ou à connecter.
    console.warn("[karria] localisation illisible", cause);
    return { langue: null, fuseauHoraire: null };
  }
}

/**
 * La région et le fuseau à joindre aux requêtes qui créent un compte.
 *
 * Le serveur ignore une valeur hors forme sans refuser la connexion ; on
 * ne lui envoie quand même que la forme exacte — deux lettres majuscules,
 * un nom de fuseau borné — et rien du tout quand on ne sait pas : une clé
 * absente dit « inconnu », une valeur approximative dirait un pays faux.
 */
export function origineAppareil(
  localisation: Localisation = lireLocalisation(),
): OrigineAppareil {
  const origine: OrigineAppareil = {};
  const region = regionDepuisLangue(localisation.langue);
  if (region !== null && /^[A-Z]{2}$/.test(region) && region !== REGION_INCONNUE) {
    origine.region = region;
  }
  const fuseau = localisation.fuseauHoraire;
  if (fuseau !== null && fuseau.length <= FUSEAU_MAX && FUSEAU.test(fuseau)) {
    origine.timezone = fuseau;
  }
  return origine;
}
