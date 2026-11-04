/**
 * Les règles de la porte de mise à jour : quand demander, quoi en faire.
 *
 * ═══ Ce que le serveur décide, ce que l'application décide ═══
 *
 * Le serveur compare le numéro de build natif de l'application à ce qu'il
 * connaît et répond `ok`, `update_available` ou `update_required`
 * (`docs/contrat-api-version.md`). L'application ne recalcule rien : elle
 * traduit, et décide seulement **comment** le montrer — un écran qui
 * bloque pour `requise`, une bande fermable au plus une fois par jour et
 * un badge sur le profil pour `disponible`, rien pour `ok`.
 *
 * ═══ Ne jamais bloquer sur un doute ═══
 *
 * Un numéro de build illisible, une route injoignable, un `requise` sans
 * adresse de magasin : dans chacun de ces cas on laisse entrer. Bloquer
 * quelqu'un derrière un bouton qui n'ouvre rien, ou sur une panne de
 * réseau, serait pire qu'une vieille version.
 */

export type EtatDeVersion = "ok" | "disponible" | "requise";

export interface Version {
  etat: EtatDeVersion;
  derniereBuild: number;
  buildMinimale: number;
  /** La fiche de l'application sur le magasin de la plateforme. */
  urlStore: string | null;
}

/** On redemande au serveur au retour au premier plan, passé ce délai. */
export const REVERIFICATION_MS = 6 * 60 * 60 * 1000;

/** La bande « nouvelle version » ne se montre pas plus d'une fois par jour. */
export const UN_JOUR_MS = 24 * 60 * 60 * 1000;

/**
 * Le numéro de build natif, lu dans `expo-application` (`nativeBuildVersion`),
 * en entier. Sur Android c'est le `versionCode` ; sur iOS le `CFBundleVersion`,
 * qu'EAS incrémente en entier (`autoIncrement`). Toute autre forme —
 * `null` sur un appareil exotique, « 1.0.3 » posé à la main — rend `null`,
 * et la porte ne demande rien plutôt que de comparer n'importe quoi.
 */
export function numeroDeBuild(brut: string | null | undefined): number | null {
  if (brut === null || brut === undefined || !/^\d+$/.test(brut)) return null;
  const n = Number(brut);
  return Number.isSafeInteger(n) ? n : null;
}

/** Faut-il redemander ? Jamais avant `REVERIFICATION_MS` après la dernière réponse. */
export function fautIlReverifier(derniere: number | null, maintenant: number): boolean {
  return derniere === null || maintenant - derniere >= REVERIFICATION_MS;
}

/** La bande peut-elle se montrer ? Au plus une fois par tranche de 24 h. */
export function bandeMontrable(
  derniereBande: number | null,
  maintenant: number,
): boolean {
  return derniereBande === null || maintenant - derniereBande >= UN_JOUR_MS;
}

/**
 * Un `requise` sans adresse de magasin se traite comme `disponible` : on
 * ne bloque pas quelqu'un derrière un bouton qui n'ouvre rien.
 */
export function rendreOuvrable(version: Version): Version {
  if (version.etat === "requise" && version.urlStore === null) {
    return { ...version, etat: "disponible" };
  }
  return version;
}
