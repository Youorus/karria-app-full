/**
 * Les liens que le système remet à l'app (universels `https://karria.fr/…`,
 * schéma `karria://…`), avant qu'expo-router ne les route — la règle pure
 * derrière `app/+native-intent.ts`.
 *
 * ═══ Une liste blanche, pas une liste noire ═══
 *
 * Un lien venu de l'extérieur n'ouvre que les écrans faits pour ça : une
 * offre partagée, les onglets, un dossier, un modèle, l'atelier libre, le
 * retour de paiement. Tout le reste — le lecteur de documents, l'édition
 * du CV, la suppression du compte, un atelier de dossier, un chemin
 * inconnu — mène au fil des offres. Interdire par motif se contourne
 * (`..`, `%2F`, groupes `(app)`, doubles barres) ; autoriser par liste,
 * après normalisation par `URL` (décodage, résolution des `.`/`..`,
 * retrait des segments de groupe), ne laisse rien passer d'inattendu.
 */

const HOTES = ["karria.fr", "www.karria.fr", "app.karria.fr"];
const ACCUEIL = "/offres";

/** Les écrans atteignables de l'extérieur, et s'ils gardent la requête. */
const AUTORISES: { motif: RegExp; requete: boolean }[] = [
  { motif: /^\/offre\/[A-Za-z0-9-]{1,64}$/, requete: false },
  {
    motif:
      /^\/(offres|cv|dossiers|modeles|profil|notifications|equipe|parametres|bienvenue)$/,
    requete: false,
  },
  { motif: /^\/cv\/mes-cv$/, requete: false },
  { motif: /^\/modele\/[A-Za-z0-9-]{1,64}$/, requete: false },
  { motif: /^\/candidatures\/[A-Za-z0-9-]{1,64}$/, requete: false },
  { motif: /^\/atelier\/libre(\/finaliser)?$/, requete: false },
  { motif: /^\/paiement\/retour$/, requete: true },
];

function decoderJusquAuBout(texte: string): string | null {
  let courant = texte;
  for (let i = 0; i < 3; i += 1) {
    let suivant: string;
    try {
      suivant = decodeURIComponent(courant);
    } catch {
      return null;
    }
    if (suivant === courant) return courant;
    courant = suivant;
  }
  return null;
}

/** Le chemin canonique d'un lien système, ou `null` s'il n'est pas à nous. */
export function cheminCanonique(
  path: string,
): { chemin: string; requete: string } | null {
  const brut = path.trim();
  let absolu: string;
  if (/^karria:\/\//i.test(brut))
    absolu = `https://karria.fr/${brut.replace(/^karria:\/\/+/i, "")}`;
  else if (brut.startsWith("/")) absolu = `https://karria.fr${brut}`;
  else if (/^https?:\/\//i.test(brut)) absolu = brut;
  else return null;

  let u: URL;
  try {
    u = new URL(absolu);
  } catch {
    return null;
  }
  if (!HOTES.includes(u.hostname.toLowerCase())) return null;
  const decode = decoderJusquAuBout(u.pathname);
  if (decode === null || /[\\\u0000-\u001f]/.test(decode)) return null;
  // Résout `.` et `..` une fois le chemin décodé, puis ôte les groupes.
  const resolu = new URL(decode.replace(/\/{2,}/g, "/"), "https://karria.fr").pathname;
  const segments = resolu.split("/").filter((s) => s !== "" && !/^\(.*\)$/.test(s));
  return { chemin: `/${segments.join("/")}`, requete: u.search };
}

/** Ce qu'expo-router doit ouvrir pour un lien venu du système. */
export function cheminSystemeRedirige(path: string): string {
  const canon = cheminCanonique(path);
  if (canon === null) return ACCUEIL;
  for (const { motif, requete } of AUTORISES) {
    if (motif.test(canon.chemin))
      return requete ? `${canon.chemin}${canon.requete}` : canon.chemin;
  }
  return ACCUEIL;
}
