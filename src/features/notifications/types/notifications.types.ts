/**
 * Le contrat des notifications push, version 1, tel que l'API l'envoie.
 *
 * ═══ Pourquoi un type par destination, et non une URL ═══
 *
 * Une URL dit **où** aller, pas **quoi** : l'application ne peut ni
 * compter les ouvertures par sorte de notification, ni choisir un canal
 * Android, ni reconstruire une pile cohérente (le détail d'une offre
 * au-dessus du fil). Le `type` le dit ; l'`url` reste dans la charge pour
 * les versions de l'application qui ne lisent qu'elle.
 *
 * Toutes les valeurs sont des chaînes : c'est ce qu'Android transmet
 * intact (`data` FCM), et c'est la règle de l'API. Le contrat en prose
 * fait foi : `docs/contrat-notifications.md`.
 */

/** La version du contrat comprise par cette application. */
export const VERSION_CONTRAT_NOTIFICATIONS = 1;

export const TYPES_NOTIFICATION = [
  "offer",
  "offers_feed",
  "search_results",
  "cv_ready",
  "cv_export",
  "assistant",
  "template",
  "templates",
  "account",
] as const;

export type TypeNotification = (typeof TYPES_NOTIFICATION)[number];

/** Une notification lue et validée, dans les termes de l'application. */
export interface NotificationKarria {
  type: TypeNotification;
  /** L'offre, le modèle ou l'export visé ; `null` quand le type n'en a pas. */
  id: string | null;
  /** Combien d'offres la notification annonce, si elle le dit. */
  nombre: number | null;
  /** L'étiquette de campagne, pour la mesure (`v1-retour-2026`, `test`). */
  campagne: string | null;
}

/** Les canaux Android et catégories iOS, un par famille de notifications. */
export type CanalNotification = "offres" | "documents" | "compte";

/**
 * Où mène une notification : la pile d'écrans à reconstruire, du bas vers
 * le haut. `["/offres", "/offre/42"]` : le détail par-dessus le fil, pour
 * que « retour » ramène au fil.
 */
export interface DestinationNotification {
  pile: readonly string[];
  /** Le type compris, `null` si la charge ne suivait pas le contrat. */
  type: TypeNotification | null;
  /** `contrat` : type v1 compris ; `lien` : seule l'`url` a servi ;
   *  `repli` : rien d'exploitable, on ouvre le fil. */
  origine: "contrat" | "lien" | "repli";
  campagne: string | null;
}
