/**
 * D'une charge de notification à la pile d'écrans qu'elle ouvre.
 *
 * ═══ Le seul endroit où une notification devient une route ═══
 *
 * Le serveur dit `{ v: "1", type: "offer", id: "…" }` ; ce fichier dit
 * « le fil, puis le détail de cette offre ». Un nouveau type = une ligne
 * dans `PILES`, et le compilateur refuse d'oublier un type.
 *
 * ═══ Ce qui n'est pas compris retombe sur le fil, jamais dans le vide ═══
 *
 * Dans l'ordre :
 *
 * 1. une charge v1 valide → sa pile ;
 * 2. sinon (version future, type inconnu, ancienne charge sans `v`), une
 *    `url` à nous (`cheminDepuisUrl`) → son chemin, avec le fil dessous
 *    quand c'est un détail ;
 * 3. sinon → le fil.
 *
 * Un identifiant n'entre dans un chemin que s'il a la forme d'un
 * identifiant (lettres, chiffres, tirets) : une charge forgée ne peut pas
 * glisser `../parametres` ou une requête dans la route.
 */

import { cheminDepuisUrl } from "./liens";
import {
  TYPES_NOTIFICATION,
  VERSION_CONTRAT_NOTIFICATIONS,
  type CanalNotification,
  type DestinationNotification,
  type NotificationKarria,
  type TypeNotification,
} from "../types/notifications.types";

export const PILE_DU_FIL: readonly string[] = ["/offres"];

const FORME_ID = /^[A-Za-z0-9-]{1,64}$/;
const FORME_NOMBRE = /^\d{1,6}$/;
const FORME_CAMPAGNE = /^[A-Za-z0-9_-]{1,64}$/;

/** Les types qui exigent un `id`, et ceux qui peuvent en porter un. */
const ID_OBLIGATOIRE: ReadonlySet<TypeNotification> = new Set(["offer", "template"]);
const ID_PERMIS: ReadonlySet<TypeNotification> = new Set([
  "offer",
  "template",
  "cv_export",
]);

const PILES: Record<TypeNotification, (id: string | null) => readonly string[]> = {
  offer: (id) => ["/offres", `/offre/${id}`],
  offers_feed: () => PILE_DU_FIL,
  search_results: () => PILE_DU_FIL,
  // Karria vit dans le rideau du fil : le paramètre l'ouvre.
  assistant: () => ["/offres?karria=1"],
  cv_ready: () => ["/cv"],
  // L'export se retrouve depuis l'onglet CV ; pas d'écran par export.
  cv_export: () => ["/cv"],
  template: (id) => ["/modeles", `/modele/${id}`],
  templates: () => ["/modeles"],
  account: () => ["/profil", "/parametres"],
};

const CANAUX: Record<TypeNotification, CanalNotification> = {
  offer: "offres",
  offers_feed: "offres",
  search_results: "offres",
  assistant: "offres",
  cv_ready: "documents",
  cv_export: "documents",
  template: "documents",
  templates: "documents",
  account: "compte",
};

export function canalDe(type: TypeNotification): CanalNotification {
  return CANAUX[type];
}

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === "object" && valeur !== null && !Array.isArray(valeur);
}

function estType(valeur: unknown): valeur is TypeNotification {
  return (
    typeof valeur === "string" &&
    (TYPES_NOTIFICATION as readonly string[]).includes(valeur)
  );
}

/** `"1"` comme le serveur l'envoie ; `1` toléré, si un relais l'a converti. */
function version(valeur: unknown): number | null {
  if (typeof valeur === "number" && Number.isInteger(valeur)) return valeur;
  if (typeof valeur === "string" && /^\d{1,3}$/.test(valeur)) return Number(valeur);
  return null;
}

function chaineDeForme(valeur: unknown, forme: RegExp): string | null {
  return typeof valeur === "string" && forme.test(valeur) ? valeur : null;
}

/**
 * Lit une charge selon le contrat v1. `null` si elle ne le suit pas — y
 * compris une version plus récente, que cette application ne sait pas
 * lire et qu'elle ne doit pas deviner.
 */
export function lireNotification(donnees: unknown): NotificationKarria | null {
  if (!estObjet(donnees)) return null;
  if (version(donnees.v) !== VERSION_CONTRAT_NOTIFICATIONS) return null;
  if (!estType(donnees.type)) return null;
  const type = donnees.type;

  const idBrut = donnees.id;
  const id = chaineDeForme(idBrut, FORME_ID);
  if (ID_OBLIGATOIRE.has(type) && id === null) return null;
  if (!ID_PERMIS.has(type) && idBrut !== undefined) return null;
  if (idBrut !== undefined && id === null) return null;

  const nombre = chaineDeForme(donnees.count, FORME_NOMBRE);
  return {
    type,
    id,
    nombre: nombre === null ? null : Number(nombre),
    campagne: chaineDeForme(donnees.campaign, FORME_CAMPAGNE),
  };
}

/** Un détail ouvert par un simple lien garde son écran parent dessous. */
function pileDepuisChemin(chemin: string): readonly string[] {
  // Sans paramètres ni ancre : un lien ne porte qu'un écran et un identifiant.
  const propre = chemin.split(/[?#]/, 1)[0] ?? chemin;
  const detail = /^\/(offre|modele)\/([^/]+)$/.exec(propre);
  if (detail !== null) {
    const [, ecran, id] = detail;
    // Même règle que pour `id` du contrat : une forme inattendue n'ouvre rien d'autre que le fil.
    if (!FORME_ID.test(id)) return PILE_DU_FIL;
    return ecran === "offre"
      ? ["/offres", `/offre/${id}`]
      : ["/modeles", `/modele/${id}`];
  }
  return [propre];
}

export function destinationDe(donnees: unknown): DestinationNotification {
  const notification = lireNotification(donnees);
  if (notification !== null) {
    return {
      pile: PILES[notification.type](notification.id),
      type: notification.type,
      origine: "contrat",
      campagne: notification.campagne,
    };
  }
  const chemin = estObjet(donnees) ? cheminDepuisUrl(donnees.url) : null;
  if (chemin !== null) {
    return {
      pile: pileDepuisChemin(chemin),
      type: null,
      origine: "lien",
      campagne: null,
    };
  }
  return { pile: PILE_DU_FIL, type: null, origine: "repli", campagne: null };
}

/**
 * Les écrans d'entrée : tant qu'on y est, la navigation n'est pas encore
 * « dans l'application ». L'aiguillage (`/`) va rediriger, l'accueil et
 * la connexion attendent une session, la question des notifications
 * attend une réponse. Pousser une offre par-dessus l'un d'eux la ferait
 * effacer par la redirection qui suit.
 */
const ECRANS_D_ENTREE: ReadonlySet<string> = new Set([
  "/",
  "/bienvenue",
  "/email",
  "/code",
  "/notifications",
]);

/** Peut-on ouvrir une destination maintenant, ou faut-il la garder ? */
export function peutNaviguer(etat: {
  connecte: boolean;
  navigationPrete: boolean;
  chemin: string;
}): boolean {
  return etat.connecte && etat.navigationPrete && !ECRANS_D_ENTREE.has(etat.chemin);
}
