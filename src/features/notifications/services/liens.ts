/**
 * Du lien porté par une notification au chemin de l'application.
 *
 * ═══ Le contrat ═══
 *
 * Le serveur met dans `data.url` un lien au schéma de l'application —
 * `karria://offre/150279` — ou, demain, un lien universel
 * `https://karria.fr/offre/150279`. Les deux désignent la même route :
 * `/offre/150279`. C'est ce chemin qu'on donne au routeur.
 *
 * ═══ Pourquoi ne pas passer par `Linking.openURL` ═══
 *
 * Ouvrir sa propre URL depuis l'intérieur de l'application fait un détour
 * par le système, et sur Android il peut proposer de choisir une
 * application. Pousser le chemin directement est immédiat et déterministe.
 *
 * ═══ Ce qui est refusé ═══
 *
 * Un lien vers un autre domaine, une URL sans chemin, n'importe quoi qui
 * n'est pas une chaîne : une notification forgée ne doit pas pouvoir
 * ouvrir autre chose qu'un écran de Karria. Dans ce cas, `null` — et
 * l'application s'ouvre simplement sur l'écran courant.
 */

const SCHEMAS_PROPRES = ["karria"];
const HOTES_PROPRES = ["karria.fr", "www.karria.fr", "app.karria.fr"];

export function cheminDepuisUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const texte = url.trim();
  if (texte.startsWith("/")) return texte.length > 1 ? texte : null;

  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i.exec(texte);
  if (m === null) return null;
  const [, schema, hote, suite] = m;

  // `karria://offre/1` : l'« hôte » est déjà le début du chemin.
  if (SCHEMAS_PROPRES.includes(schema.toLowerCase())) {
    const chemin = `/${hote}${suite}`.replace(/\/{2,}/g, "/");
    return chemin.length > 1 ? chemin : null;
  }
  if (/^https?$/i.test(schema) && HOTES_PROPRES.includes(hote.toLowerCase())) {
    const chemin = suite.replace(/^\/+/, "/");
    return chemin.length > 1 ? chemin : null;
  }
  return null;
}
