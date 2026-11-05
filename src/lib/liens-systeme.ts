/**
 * Les liens que le système remet à l'app (universels, schéma `karria://`),
 * avant qu'expo-router ne les route — la règle pure derrière
 * `app/+native-intent.ts`.
 *
 * Le lecteur de documents (`/lecture-document`) ne s'ouvre que depuis
 * l'app, sur un export qu'elle a elle-même lu : un lien externe vers cette
 * route est renvoyé vers l'onglet CV. Tout le reste passe tel quel — une
 * offre partagée (`https://karria.fr/offre/<id>`) mène à `/offre/<id>`.
 */

const ROUTES_INTERNES = [/^\/lecture-document(\/|\?|#|$)/i];

export function cheminSystemeRedirige(path: string): string {
  const chemin = path
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^karria:\/\/+/i, "/")
    .replace(/^\/+/, "/");
  return ROUTES_INTERNES.some((r) => r.test(chemin)) ? "/cv" : path;
}
