/**
 * Le faux serveur de la porte de mise à jour : `GET /app/release`
 * (`docs/contrat-api-version.md`).
 *
 * ═══ « ok » par défaut, le reste sur demande ═══
 *
 * Une build de développement porte le numéro 1 : si le faux serveur
 * répondait selon le numéro, l'écran bloquant s'afficherait à chaque
 * lancement du simulateur. Il répond donc `ok`, sauf si
 * `EXPO_PUBLIC_SIMULATION_VERSION` vaut `requise` ou `disponible` — pour
 * exercer l'écran bloquant et la bande sans toucher au code. Le fichier
 * `.env` se lit à la compilation : `npx expo start --clear` après l'avoir
 * changé (voir `lib/config.ts`).
 */

const DERNIERE_BUILD = 12;
const DERNIERE_VERSION = "1.1.0";
const MAGASINS = {
  ios: "https://apps.apple.com/fr/app/karria/id0000000000",
  android: "https://play.google.com/store/apps/details?id=com.karria.app",
};

export function estUneRouteVersion(chemin: string): boolean {
  return chemin.split("?")[0] === "/app/release";
}

function json(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(statut: number, code: string, message: string, field?: string): Response {
  return json(statut, {
    error: { code, message, details: { reason: code, ...(field ? { field } : {}) } },
  });
}

export function repondreVersion(
  methode: string,
  chemin: string,
  force: string | undefined = process.env.EXPO_PUBLIC_SIMULATION_VERSION,
): Response {
  if (methode !== "GET") return erreur(405, "method_not_allowed", "Méthode refusée.");
  const parametres = new URLSearchParams(chemin.split("?")[1] ?? "");
  const plateforme = parametres.get("platform");
  const build = Number(parametres.get("build"));
  if (plateforme !== "ios" && plateforme !== "android") {
    return erreur(422, "platform_invalid", "Plateforme inconnue.", "platform");
  }
  if (!Number.isInteger(build) || build < 0) {
    return erreur(422, "build_invalid", "Numéro de build invalide.", "build");
  }

  const status =
    force === "requise"
      ? "update_required"
      : force === "disponible"
        ? "update_available"
        : "ok";
  return json(200, {
    status,
    latest_build: DERNIERE_BUILD,
    latest_version: DERNIERE_VERSION,
    minimum_build: status === "update_required" ? build + 1 : 1,
    store_url: MAGASINS[plateforme],
  });
}
