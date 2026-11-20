/**
 * Les recherches enregistrées — `GET /search/saved` et ses deux gestes
 * (`docs/contrat-api-recherche.md`, ADR-0041 de l'API).
 *
 * Chaque recherche que Karria applique est retenue par le serveur et
 * continue de surveiller les nouvelles offres. `…Brute` décrit ce que le
 * serveur envoie ; le reste, ce que l'écran « Mes recherches » manipule.
 * La traduction se fait dans `api/recherches-enregistrees.api.ts`.
 */

export interface RechercheEnregistree {
  id: string;
  /** La recherche en une ligne (« Serveur · Paris (30 km) · CDI »). */
  resume: string;
  /** Ce que la personne a demandé, dans ses mots. */
  demande: string;
  metiers: string[];
  /** Le lieu nommé ; `null` : France entière. */
  lieu: string | null;
  touteLaFrance: boolean;
  contrats: string[];
  /** Karria surveille cette recherche et prévient quand une offre correspond. */
  alertes: boolean;
  /** C'est la recherche en cours : elle fait le fil. */
  enCours: boolean;
  creeeLe: string;
  utiliseeLe: string;
  derniereAlerteLe: string | null;
}

export interface RecherchesEnregistrees {
  /** La plus récemment utilisée d'abord : l'ordre du serveur, gardé tel quel. */
  recherches: RechercheEnregistree[];
  /** Recherches gardées au plus ; au-delà, la plus ancienne est remplacée. */
  maximum: number;
}

// ─────────────────────────────────────────────────────────────────────
// La forme réseau
// ─────────────────────────────────────────────────────────────────────

export interface RechercheEnregistreeBrute {
  id: string;
  summary: string;
  query: string;
  job_titles: string[];
  location_label: string | null;
  whole_france: boolean;
  contract_types: string[];
  alerts_enabled: boolean;
  is_current: boolean;
  created_at: string;
  last_used_at: string;
  last_alert_at: string | null;
}

export interface RecherchesEnregistreesBrutes {
  items: RechercheEnregistreeBrute[];
  max: number;
}
