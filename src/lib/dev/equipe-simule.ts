/**
 * Le faux serveur de « Parler à l'équipe » : les routes `/support/` de
 * `docs/contrat-api-equipe.md`, et un flux en direct en mémoire.
 *
 * ═══ Ce qu'il imite ═══
 *
 * La forme exacte des messages, le non-lu, les refus du contrat
 * (`support_message_empty`, `support_media_unsupported`,
 * `support_voice_too_long`) et — surtout — le **direct** : quelques
 * secondes après chaque message de la personne, « l'équipe » répond. Si le
 * flux est ouvert, la réponse y arrive comme sur le vrai WebSocket ; sinon
 * elle attend, et le non-lu s'allume (le point du bouton flottant).
 *
 * Comme le vrai serveur, le flux renvoie aussi les messages de la personne
 * elle-même : l'écran doit dédoublonner par identifiant.
 */

/** Le délai de la réponse simulée : assez long pour voir l'attente. */
const DELAI_REPONSE_MS = 3_500;
const TEXTE_MAX = 4_000;
const VOCAL_MAX_MS = 5 * 60 * 1000;

const TYPES_IMAGE = new Set(["image/jpeg", "image/png", "image/webp"]);
const TYPES_SON = new Set([
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/mpeg",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
]);

const REPONSES = [
  "Merci pour ton message ! On le lit avec attention et on revient vers toi ici même.",
  "Bien reçu. On regarde ça de près et on te tient au courant dans ce fil.",
  "Merci de prendre le temps de nous écrire — ça nous aide vraiment à améliorer Karria.",
];

export interface MessageSimule {
  id: string;
  author: "user" | "team";
  kind: "text" | "voice" | "image";
  body: string | null;
  attachment: {
    url: string;
    content_type: string;
    size_bytes: number;
    duration_ms: number | null;
  } | null;
  created_at: string;
}

interface Abonne {
  surMessage: (message: MessageSimule) => void;
}

const etat = {
  messages: [] as MessageSimule[],
  luLe: null as string | null,
  abonnes: new Set<Abonne>(),
  reponses: 0,
  minuteries: new Set<ReturnType<typeof setTimeout>>(),
};

/** Repart d'un fil vide (tests). */
export function reinitialiserEquipe(): void {
  for (const minuterie of etat.minuteries) clearTimeout(minuterie);
  etat.minuteries.clear();
  etat.messages = [];
  etat.luLe = null;
  etat.abonnes.clear();
  etat.reponses = 0;
}

export function estUneRouteEquipe(chemin: string): boolean {
  return chemin.split("?")[0].startsWith("/support/");
}

function json(statut: number, corps: unknown): Response {
  return new Response(corps === undefined ? null : JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json" },
  });
}

function erreur(statut: number, code: string, message: string, champ?: string): Response {
  return json(statut, {
    error: {
      code,
      message,
      details: { reason: code, ...(champ ? { field: champ } : {}) },
    },
  });
}

/** Un instant strictement croissant : deux messages ne partagent jamais le curseur. */
let dernierInstant = 0;
function maintenant(): string {
  dernierInstant = Math.max(Date.now(), dernierInstant + 1);
  return new Date(dernierInstant).toISOString();
}

function nonLu(): boolean {
  const equipe = etat.messages.filter((m) => m.author === "team");
  const derniere = equipe[equipe.length - 1];
  if (derniere === undefined) return false;
  return etat.luLe === null || derniere.created_at > etat.luLe;
}

function publier(message: MessageSimule): void {
  etat.messages.push(message);
  for (const abonne of etat.abonnes) abonne.surMessage(message);
}

function planifierReponse(): void {
  const minuterie = setTimeout(() => {
    etat.minuteries.delete(minuterie);
    const texte = REPONSES[etat.reponses % REPONSES.length];
    etat.reponses += 1;
    publier({
      id: `equipe_${etat.messages.length + 1}`,
      author: "team",
      kind: "text",
      body: texte,
      attachment: null,
      created_at: maintenant(),
    });
  }, DELAI_REPONSE_MS);
  etat.minuteries.add(minuterie);
}

function ecrire(message: Omit<MessageSimule, "id" | "author" | "created_at">) {
  const complet: MessageSimule = {
    ...message,
    id: `moi_${etat.messages.length + 1}`,
    author: "user",
    created_at: maintenant(),
  };
  publier(complet);
  planifierReponse();
  return complet;
}

type Partie = { fieldName: string; uri?: string; type?: string; string?: string };

function deposer(corps: unknown): Response {
  const parties = (corps as { getParts?: () => Partie[] }).getParts?.() ?? [];
  const fichier = parties.find((p) => p.fieldName === "file");
  if (fichier?.uri === undefined) {
    return erreur(422, "invalid_input", "Fichier manquant.", "file");
  }
  const type = (fichier.type ?? "").toLowerCase();
  const duree = parties.find((p) => p.fieldName === "duration_ms")?.string;
  const dureeMs = duree === undefined ? null : Number(duree);
  if (TYPES_SON.has(type)) {
    if (dureeMs !== null && dureeMs > VOCAL_MAX_MS) {
      return erreur(
        422,
        "support_voice_too_long",
        "Un message vocal dure cinq minutes au plus.",
        "duration_ms",
      );
    }
  } else if (!TYPES_IMAGE.has(type)) {
    return erreur(
      422,
      "support_media_unsupported",
      "Seules les images (JPEG, PNG, WebP) et les messages vocaux sont acceptés.",
      "file",
    );
  }
  const vocal = TYPES_SON.has(type);
  return json(
    201,
    ecrire({
      kind: vocal ? "voice" : "image",
      body: null,
      // L'URL « signée » est le fichier local : la simulation le relit tel quel.
      attachment: {
        url: fichier.uri,
        content_type: type,
        size_bytes: 0,
        duration_ms: vocal ? dureeMs : null,
      },
    }),
  );
}

export function repondreEquipe(
  methode: string,
  chemin: string,
  corps: unknown,
): Response {
  const route = `${methode} ${chemin.split("?")[0]}`;
  switch (route) {
    case "GET /support/me":
      return json(200, {
        id: "fil_simule",
        has_unread: nonLu(),
        last_team_message_at:
          etat.messages.filter((m) => m.author === "team").at(-1)?.created_at ?? null,
        messages: etat.messages.slice(-200),
      });
    case "GET /support/me/unread":
      return json(200, { has_unread: nonLu() });
    case "POST /support/me/read":
      etat.luLe = maintenant();
      return json(204, undefined);
    case "POST /support/me/messages": {
      const texte =
        typeof corps === "object" && corps !== null
          ? (corps as { body?: unknown }).body
          : undefined;
      if (typeof texte !== "string" || texte.trim() === "") {
        return erreur(
          422,
          "support_message_empty",
          "Écris quelques mots d'abord.",
          "body",
        );
      }
      if (texte.length > TEXTE_MAX) {
        return erreur(422, "invalid_input", "4 000 caractères au plus.", "body");
      }
      return json(201, ecrire({ kind: "text", body: texte.trim(), attachment: null }));
    }
    case "POST /support/me/messages/media":
      return deposer(corps);
    default:
      return erreur(404, "not_found", `Route simulée inconnue : ${route}`);
  }
}

/**
 * Le flux en direct, en mémoire : rattrape ce qui suit `depuis`, puis livre
 * chaque nouveau message tant qu'il est ouvert. « J'ai vu » pose la lecture.
 */
export function ouvrirFluxSimule(ecoute: {
  depuis: string | null;
  surMessage: (message: MessageSimule) => void;
  surOuvert: () => void;
}): Promise<{ signalerLu: () => void; fermer: () => void }> {
  const abonne: Abonne = { surMessage: ecoute.surMessage };
  etat.abonnes.add(abonne);
  // Asynchrone comme un vrai réseau : l'appelant a fini de s'installer.
  void Promise.resolve().then(() => {
    if (!etat.abonnes.has(abonne)) return;
    ecoute.surOuvert();
    for (const message of etat.messages) {
      // Sans `depuis`, comme le vrai serveur : pas d'historique, la suite seulement.
      if (ecoute.depuis !== null && message.created_at > ecoute.depuis) {
        ecoute.surMessage(message);
      }
    }
  });
  return Promise.resolve({
    signalerLu: () => {
      etat.luLe = maintenant();
    },
    fermer: () => {
      etat.abonnes.delete(abonne);
    },
  });
}
