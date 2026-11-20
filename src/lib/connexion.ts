/**
 * La connexion est-elle bonne, instable, ou absente ? Les règles, seules.
 *
 * ═══ Deux sources, qui ne disent pas la même chose ═══
 *
 * - **L'appareil** (`ecoute-reseau.ts`, `expo-network`) sait s'il a un
 *   réseau. Il ne sait pas si ce réseau mène quelque part : un Wi-Fi d'hôtel,
 *   une barre de 3G dans un train se disent « connectés ».
 * - **Le client HTTP** (`http.ts`) sait, lui, ce qui est réellement arrivé à
 *   nos requêtes : une réponse, ou une panne de transport (délai dépassé,
 *   hôte injoignable). C'est la seule preuve qu'on puisse travailler.
 *
 * D'où trois états : `hors-ligne` quand l'appareil le dit ; `instable` quand
 * il se dit connecté mais que nos requêtes tombent ; `bonne` sinon. Aucun
 * ping en boucle : on ne lit que ce que l'application fait déjà.
 *
 * ═══ L'hystérésis, pour ne pas clignoter ═══
 *
 * Un seul échec ne dit rien — un tunnel, un changement d'antenne. On ne
 * passe à `instable` qu'après `SEUIL_INSTABLE` **salves** d'échecs sans
 * succès entre elles, et l'on revient à `bonne` au premier succès.
 *
 * Une salve, et non un échec : un écran qui charge trois listes voit ses
 * trois requêtes tomber au même instant. C'est un seul incident, compté une
 * fois (`FENETRE_SALVE_MS`, à partir du premier échec de la salve).
 *
 * ═══ Une preuve qui vieillit ═══
 *
 * `instable` repose sur des échecs passés. Si plus rien ne part — la
 * personne lit —, rien ne viendra le démentir : au bout de
 * `OUBLI_INSTABLE_MS` sans nouvel échec, on l'oublie, **sans** annoncer un
 * retour qu'on n'a pas constaté.
 *
 * ═══ Qui croire quand les deux se contredisent ═══
 *
 * Une réponse reçue alors que l'appareil annonçait un réseau « sans
 * Internet » : la réponse a raison, ce drapeau est une estimation du
 * système. Alors qu'il annonçait « aucun réseau » : c'est une réponse
 * partie avant la coupure — on ne change rien, l'appareil sera relu.
 *
 * Fichier pur : ni horloge, ni minuterie, ni abonné. L'état vivant est dans
 * `etat-connexion.ts`.
 */

export type EtatConnexion = "bonne" | "instable" | "hors-ligne";

/** Ce que l'appareil dit de lui-même. `inconnu` : pas (encore) de réponse,
 *  ou une build sans le module natif. */
export type Appareil = "inconnu" | "en-ligne" | "sans-internet" | "sans-reseau";

export interface MemoireConnexion {
  appareil: Appareil;
  /** Les salves d'échecs réseau depuis le dernier succès. */
  echecs: number;
  /** Le début de la salve en cours, en millisecondes. */
  debutSalve: number | null;
}

export const MEMOIRE_INITIALE: MemoireConnexion = {
  appareil: "inconnu",
  echecs: 0,
  debutSalve: null,
};

/** Deux incidents distincts, pas un. */
export const SEUIL_INSTABLE = 2;
/** Des échecs plus rapprochés que cela sont le même incident. */
export const FENETRE_SALVE_MS = 1_500;
/** Sans nouvel échec pendant ce temps, « instable » n'est plus une information. */
export const OUBLI_INSTABLE_MS = 30_000;
/** « Connexion rétablie » : le temps de le lire. */
export const DUREE_RETABLIE_MS = 2_000;
/** Deux relances automatiques ne partent jamais plus rapprochées que cela. */
export const ECART_RELANCES_MS = 5_000;

/** Traduit l'état rendu par `expo-network`. */
export function lireAppareil(etat: {
  isConnected?: boolean;
  isInternetReachable?: boolean;
}): Appareil {
  if (etat.isConnected === false) return "sans-reseau";
  if (etat.isInternetReachable === false) return "sans-internet";
  return etat.isConnected === true ? "en-ligne" : "inconnu";
}

const horsLigne = (appareil: Appareil) =>
  appareil === "sans-reseau" || appareil === "sans-internet";

export function etatDe(memoire: MemoireConnexion): EtatConnexion {
  if (horsLigne(memoire.appareil)) return "hors-ligne";
  return memoire.echecs >= SEUIL_INSTABLE ? "instable" : "bonne";
}

/** L'appareil vient de dire où il en est. */
export function apresAppareil(
  memoire: MemoireConnexion,
  appareil: Appareil,
): MemoireConnexion {
  // Le réseau revient : les échecs d'avant la coupure ne disent rien du
  // réseau retrouvé.
  if (horsLigne(memoire.appareil) && !horsLigne(appareil)) {
    return { appareil, echecs: 0, debutSalve: null };
  }
  return { ...memoire, appareil };
}

/** Une requête a reçu une réponse — quelle qu'elle soit, même un refus. */
export function apresSucces(memoire: MemoireConnexion): MemoireConnexion {
  return {
    appareil: memoire.appareil === "sans-internet" ? "en-ligne" : memoire.appareil,
    echecs: 0,
    debutSalve: null,
  };
}

/** Une requête est tombée sans réponse : délai dépassé, hôte injoignable. */
export function apresEchec(
  memoire: MemoireConnexion,
  maintenant: number,
): MemoireConnexion {
  if (memoire.debutSalve !== null && maintenant - memoire.debutSalve < FENETRE_SALVE_MS) {
    return memoire;
  }
  return { ...memoire, echecs: memoire.echecs + 1, debutSalve: maintenant };
}

/** Plus aucun échec depuis `OUBLI_INSTABLE_MS` : on n'en sait plus rien. */
export function apresOubli(memoire: MemoireConnexion): MemoireConnexion {
  return { ...memoire, echecs: 0, debutSalve: null };
}

/**
 * Vrai quand lancer une action réseau ne peut qu'échouer : l'appareil n'a
 * **aucun** réseau. Un réseau « sans Internet » ne suffit pas à refuser —
 * c'est une estimation, et refuser à tort une action est pire que la
 * laisser échouer.
 */
export function actionImpossible(memoire: MemoireConnexion): boolean {
  return memoire.appareil === "sans-reseau";
}

/** La connexion vient-elle de revenir ? */
export function estUnRetour(avant: EtatConnexion, apres: EtatConnexion): boolean {
  return avant !== "bonne" && apres === "bonne";
}

/** Une relance automatique peut-elle partir, vu la précédente ? */
export function relancePermise(derniere: number | null, maintenant: number): boolean {
  return derniere === null || maintenant - derniere >= ECART_RELANCES_MS;
}
