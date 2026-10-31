/**
 * La dictée : ce qui se passe entre « j'appuie sur le micro » et « le texte
 * est dans le champ, à relire ».
 *
 * ═══ Pourquoi une machine d'états pure ═══
 *
 * La dictée mêle trois sources d'événements qui ne s'attendent pas : les
 * gestes de l'utilisateur (terminer, annuler), la reconnaissance du système
 * (résultats partiels, fin, erreurs) et, en repli, le serveur de Karria. Les
 * écrire au fil des `if` dans un hook donnait le micro de la V1 : un état
 * qu'on ne sait plus relire, et des mots perdus quand deux événements se
 * croisent. Ici, un état, un événement, une transition — et des tests qui
 * les rejouent sans micro.
 *
 * ═══ Deux modes ═══
 *
 * - **appareil** : la reconnaissance vocale du téléphone, en direct. Le
 *   texte s'écrit pendant qu'on parle (`partiel`), et chaque segment
 *   confirmé s'ajoute à `confirme`. Rien ne quitte le téléphone.
 * - **serveur** : quand le téléphone ne sait pas reconnaître sur place, on
 *   enregistre, et Karria transcrit à la fin (`POST /voice/transcribe`). Pas
 *   de texte en direct ; c'est le repli, pas la règle.
 *
 * ═══ Rien ne part tout seul ═══
 *
 * La machine ne rend jamais un message « envoyé » : elle rend un **texte**,
 * que l'appelant pose dans son champ. L'utilisateur relit, corrige, et c'est
 * lui qui envoie. Une fin imprévue (silence, interruption, erreur) garde ce
 * qui a déjà été entendu plutôt que de le jeter.
 */

export type ModeDictee = "appareil" | "serveur";

export type EtatDictee =
  | { nom: "repos" }
  /** Permissions demandées, micro en train de s'ouvrir. */
  | { nom: "demarrage"; mode: ModeDictee }
  | { nom: "ecoute"; mode: ModeDictee; confirme: string; partiel: string }
  /** Mode appareil : l'utilisateur a terminé, on attend le dernier mot du système. */
  | { nom: "cloture"; confirme: string; partiel: string }
  /** Mode serveur : la voix est partie, on attend le texte. */
  | { nom: "transcription" };

export type EvenementDictee =
  | { type: "demarrer"; mode: ModeDictee }
  /** Le micro est ouvert, la reconnaissance a commencé. */
  | { type: "pret" }
  | { type: "resultat"; texte: string; final: boolean }
  /** L'utilisateur valide : on garde le texte. */
  | { type: "terminer" }
  /** L'utilisateur renonce : on ne garde rien. */
  | { type: "annuler" }
  /** Le système a coupé de lui-même (silence, fin de tâche, interruption). */
  | { type: "fin" }
  | { type: "texte-serveur"; texte: string }
  | { type: "echec"; message: string }
  /** Après l'accord sur l'IA : la transcription du fichier repart. */
  | { type: "transcrire-encore" };

export type SortieDictee =
  | { type: "texte"; texte: string }
  | { type: "probleme"; message: string }
  /** Fini sans un mot : l'appelant peut dire « je n'ai rien entendu ». */
  | { type: "rien" };

export interface Transition {
  etat: EtatDictee;
  sortie: SortieDictee | null;
}

export const REPOS: EtatDictee = { nom: "repos" };

/** Au-delà, on termine pour l'utilisateur : la relecture d'un texte plus
 *  long qu'une page devient une corvée, et la reconnaissance se dégrade. */
export const LIMITE_MS = 120_000;
/** Les dernières secondes : la minuterie change de couleur. */
export const AVERTISSEMENT_MS = 15_000;

export const RIEN_ENTENDU = "Je n'ai rien entendu. Réessaie, ou écris-moi.";

/** Deux morceaux de texte, séparés d'un espace, sans doublon d'espaces. */
export function joindre(a: string, b: string): string {
  const gauche = a.trim();
  const droite = b.trim();
  if (gauche === "") return droite;
  if (droite === "") return gauche;
  return `${gauche} ${droite}`;
}

/**
 * Un segment final rejoint le texte confirmé. iOS rend la transcription
 * **entière** à chaque fois (le final répète tout) ; Android rend segment
 * par segment. Si le nouveau texte commence par l'ancien, il le remplace ;
 * sinon il s'y ajoute.
 */
export function fusionner(confirme: string, texte: string): string {
  const ancien = confirme.trim();
  const nouveau = texte.trim();
  if (ancien === "" || nouveau.startsWith(ancien)) return nouveau;
  return joindre(ancien, nouveau);
}

/** Le texte tel qu'on le montre pendant l'écoute : confirmé puis partiel. */
export function texteDicte(etat: EtatDictee): string {
  if (etat.nom === "ecoute" || etat.nom === "cloture") {
    return joindre(etat.confirme, etat.partiel);
  }
  return "";
}

function rendre(etat: EtatDictee, confirme: string, partiel: string): Transition {
  const texte = joindre(confirme, partiel);
  return {
    etat,
    sortie: texte === "" ? { type: "rien" } : { type: "texte", texte },
  };
}

export function reduire(etat: EtatDictee, evenement: EvenementDictee): Transition {
  const inchange: Transition = { etat, sortie: null };

  switch (etat.nom) {
    case "repos":
      if (evenement.type === "demarrer") {
        return { etat: { nom: "demarrage", mode: evenement.mode }, sortie: null };
      }
      if (evenement.type === "transcrire-encore") {
        return { etat: { nom: "transcription" }, sortie: null };
      }
      return inchange;

    case "demarrage":
      switch (evenement.type) {
        case "pret":
          return {
            etat: { nom: "ecoute", mode: etat.mode, confirme: "", partiel: "" },
            sortie: null,
          };
        // Un résultat avant « prêt » : le micro est forcément ouvert.
        case "resultat":
          return reduire(
            { nom: "ecoute", mode: etat.mode, confirme: "", partiel: "" },
            evenement,
          );
        case "annuler":
          return { etat: REPOS, sortie: null };
        case "echec":
          return {
            etat: REPOS,
            sortie: { type: "probleme", message: evenement.message },
          };
        case "fin":
          return { etat: REPOS, sortie: { type: "rien" } };
        default:
          return inchange;
      }

    case "ecoute":
      switch (evenement.type) {
        case "resultat":
          return evenement.final
            ? {
                etat: {
                  ...etat,
                  confirme: fusionner(etat.confirme, evenement.texte),
                  partiel: "",
                },
                sortie: null,
              }
            : { etat: { ...etat, partiel: evenement.texte }, sortie: null };
        case "terminer":
          return etat.mode === "appareil"
            ? {
                etat: { nom: "cloture", confirme: etat.confirme, partiel: etat.partiel },
                sortie: null,
              }
            : { etat: { nom: "transcription" }, sortie: null };
        case "annuler":
          return { etat: REPOS, sortie: null };
        case "fin":
          return rendre(REPOS, etat.confirme, etat.partiel);
        case "echec": {
          // Ce qui a déjà été entendu vaut mieux qu'un message d'erreur.
          if (joindre(etat.confirme, etat.partiel) !== "") {
            return rendre(REPOS, etat.confirme, etat.partiel);
          }
          return {
            etat: REPOS,
            sortie: { type: "probleme", message: evenement.message },
          };
        }
        default:
          return inchange;
      }

    case "cloture":
      switch (evenement.type) {
        case "resultat":
          return evenement.final
            ? {
                etat: {
                  ...etat,
                  confirme: fusionner(etat.confirme, evenement.texte),
                  partiel: "",
                },
                sortie: null,
              }
            : { etat: { ...etat, partiel: evenement.texte }, sortie: null };
        // Une erreur à la fermeture (« no-speech » après le dernier mot) n'en
        // est pas une : on rend ce qu'on a.
        case "fin":
        case "echec":
          return rendre(REPOS, etat.confirme, etat.partiel);
        case "annuler":
          return { etat: REPOS, sortie: null };
        default:
          return inchange;
      }

    case "transcription":
      switch (evenement.type) {
        case "texte-serveur":
          return rendre(REPOS, evenement.texte, "");
        case "echec":
          return {
            etat: REPOS,
            sortie: { type: "probleme", message: evenement.message },
          };
        case "annuler":
          return { etat: REPOS, sortie: null };
        default:
          return inchange;
      }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Ce que le système nous dit, traduit
// ─────────────────────────────────────────────────────────────────────

/** Ce qu'on fait d'une erreur de la reconnaissance du téléphone. */
export type SuiteErreur =
  /** Provoquée par nous (annulation) : rien à faire. */
  | { type: "ignorer" }
  /** Le système s'est arrêté : on garde ce qu'on a. */
  | { type: "fin" }
  /** Le téléphone ne sait pas reconnaître cette langue sur place : le serveur prend le relais. */
  | { type: "repli" }
  | { type: "probleme"; message: string };

export const MESSAGE_REFUS =
  "Autorise le micro et la dictée dans les Réglages pour me parler. En attendant, écris-moi !";

export function interpreterErreur(code: string): SuiteErreur {
  switch (code) {
    case "aborted":
      return { type: "ignorer" };
    case "no-speech":
    case "speech-timeout":
    case "interrupted":
      return { type: "fin" };
    case "language-not-supported":
    case "service-not-allowed":
      return { type: "repli" };
    case "not-allowed":
      return { type: "probleme", message: MESSAGE_REFUS };
    case "busy":
      return {
        type: "probleme",
        message: "Le micro est déjà occupé. Réessaie dans un instant.",
      };
    default:
      return {
        type: "probleme",
        message: "La dictée s'est interrompue. Réessaie, ou écris-moi.",
      };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Ce qu'on montre
// ─────────────────────────────────────────────────────────────────────

/**
 * Le niveau de la voix, de 0 à 1, depuis la mesure du système : une valeur
 * de −2 (silence) à 10 (saturation), linéaire sur −60…0 dB. Le bruit d'une
 * pièce monte à 1 environ, une voix normale entre 5 et 8 : on étale cette
 * plage pour que l'orbe réagisse à la voix, pas au frigo.
 */
export function niveauDepuisVolume(volume: number): number {
  return borner((volume - 1.5) / 6);
}

/** Le niveau depuis les décibels du compteur d'enregistrement (repli). */
export function niveauDepuisDecibels(db: number): number {
  const silence = -55;
  return borner((db - silence) / -silence);
}

function borner(valeur: number): number {
  if (Number.isNaN(valeur)) return 0;
  return Math.min(1, Math.max(0, valeur));
}

/** `0:07`, `1:42` — la minuterie discrète de l'écoute. */
export function formaterDuree(ms: number): string {
  const secondes = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return `${minutes}:${reste.toString().padStart(2, "0")}`;
}

/** Vrai dans les dernières secondes avant la limite. */
export function presqueFini(ms: number): boolean {
  return ms >= LIMITE_MS - AVERTISSEMENT_MS;
}
