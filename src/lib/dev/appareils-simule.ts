/**
 * Le faux serveur des appareils : le contrat `PUT/DELETE /devices/{id}`,
 * en exécutable.
 *
 * ═══ Ce que le contrat fige ═══
 *
 * - `PUT /devices/{installation_id}` **remplace** la fiche de l'appareil :
 *   l'application envoie tout ce qu'elle sait à chaque fois, et le
 *   serveur n'a rien à fusionner. Réponse `200 { installation_id,
 *   push_enabled }` — `push_enabled` est la **décision du serveur** : vrai
 *   seulement si la permission est accordée **et** qu'un jeton existe.
 *   L'application l'affiche, elle ne le recalcule pas.
 * - `DELETE /devices/{installation_id}` répond `204`, même pour un
 *   appareil inconnu : la déconnexion ne doit jamais échouer parce que le
 *   serveur n'a pas connu l'appareil.
 * - Un corps mal formé répond `422` avec le champ fautif, comme partout.
 *
 * ═══ Ce qu'il ne simule pas ═══
 *
 * L'envoi d'une notification. Il n'y a pas de faux « push » : l'écran
 * d'activation, l'enregistrement et la navigation depuis une notification
 * s'éprouvent avec l'outil de notifications locales d'Expo ou un vrai
 * appareil.
 */

const PLATEFORMES = ["ios", "android"] as const;
const PERMISSIONS = ["granted", "denied", "undetermined"] as const;

/** Les fiches d'appareil, par identifiant d'installation. */
const etat = { appareils: new Map<string, Record<string, unknown>>() };

export function estUneRouteAppareil(chemin: string): boolean {
  return chemin.split("?")[0].startsWith("/devices/");
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

/** Le premier champ invalide du corps, ou `null` s'il est conforme. */
function champInvalide(corps: unknown): string | null {
  if (typeof corps !== "object" || corps === null) return "body";
  const plateforme = champ(corps, "platform");
  if (!PLATEFORMES.some((p) => p === plateforme)) return "platform";
  const permission = champ(corps, "push_permission");
  if (!PERMISSIONS.some((p) => p === permission)) return "push_permission";
  const jeton = champ(corps, "push_token");
  if (jeton !== null && typeof jeton !== "string") return "push_token";
  if (typeof champ(corps, "is_physical_device") !== "boolean")
    return "is_physical_device";
  if (typeof champ(corps, "app_version") !== "string") return "app_version";
  if (typeof champ(corps, "os_name") !== "string") return "os_name";
  if (typeof champ(corps, "os_version") !== "string") return "os_version";
  return null;
}

export function repondreAppareils(
  methode: string,
  chemin: string,
  corps: unknown,
): Response {
  const m = /^\/devices\/([A-Za-z0-9-]+)$/.exec(chemin.split("?")[0]);
  if (m === null) {
    return erreur(
      404,
      "simulation_route_inconnue",
      `Route non simulée : ${methode} ${chemin}.`,
    );
  }
  const installationId = m[1];

  if (methode === "PUT") {
    const fautif = champInvalide(corps);
    if (fautif !== null) {
      return erreur(422, "VALIDATION_ERROR", "Fiche d'appareil invalide.", {
        field: fautif,
      });
    }
    const fiche = corps as Record<string, unknown>;
    etat.appareils.set(installationId, fiche);
    return json(200, {
      installation_id: installationId,
      push_enabled:
        fiche.push_permission === "granted" && typeof fiche.push_token === "string",
    });
  }

  if (methode === "DELETE") {
    etat.appareils.delete(installationId);
    return json(204, undefined);
  }

  return erreur(
    404,
    "simulation_route_inconnue",
    `Route non simulée : ${methode} ${chemin}.`,
  );
}

/** Pour les tests : la fiche telle que le serveur l'a retenue. */
export function appareilSimule(installationId: string): Record<string, unknown> | null {
  return etat.appareils.get(installationId) ?? null;
}
