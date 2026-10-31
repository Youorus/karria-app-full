/**
 * Les appels de « Parler à l'équipe » — `docs/contrat-api-equipe.md`.
 *
 * ═══ Le flux en direct est un WebSocket, ouvert ici ═══
 *
 * C'est un appel réseau comme un autre (AGENTS §3.4) : il vit dans `api/`,
 * et ne rend au hook que des messages traduits et trois événements
 * (ouvert, message, fin). Le hook décide quand l'ouvrir et quand le rouvrir ;
 * ce fichier ne sait que le faire.
 *
 * ═══ Le jeton du flux ═══
 *
 * Un WebSocket ne passe pas par `lib/http.ts` : pas de renouvellement de
 * session automatique. Avant d'ouvrir, on fait donc une lecture HTTP
 * légère (`/support/me/unread`), qui renouvelle le jeton s'il a expiré ;
 * on lit ensuite le jeton frais. Une requête de plus par ouverture, contre
 * un flux refusé une heure sur deux.
 *
 * ═══ En simulation ═══
 *
 * Pas de serveur WebSocket : le faux serveur expose un flux en mémoire
 * (`ouvrirFluxSimule`) qui livre les réponses simulées de l'équipe, avec
 * la même forme de trames.
 */

import { API_URL, SIMULATION } from "@/lib/config";
import { enAvanceSurLeBackend, ouvrirFluxSimule } from "@/lib/dev/serveur-simule";
import { http } from "@/lib/http";
import { lireJetons } from "@/lib/session";

import type {
  EcouteFlux,
  FichierAEnvoyer,
  FilBrut,
  FilEquipe,
  FluxEquipe,
  MessageBrut,
  MessageEquipe,
  TrameBrute,
} from "../types/equipe.types";

/** La fermeture que le serveur emploie pour un jeton refusé. */
const FERMETURE_REFUS = 4401;

/**
 * Le constructeur du `WebSocket` de React Native, qui accepte des en-têtes
 * en troisième argument (`react-native/src/types/globals.d.ts`). Le typage
 * du DOM, chargé par TypeScript, ne connaît que deux arguments : on
 * déclare la forme native plutôt que de tricher à l'appel.
 */
type WebSocketNatif = new (
  adresse: string,
  protocoles: string | string[] | null,
  options: { headers: Record<string, string> },
) => WebSocket;
const WebSocketAvecEnTetes = WebSocket as unknown as WebSocketNatif;

export function versMessage(brut: MessageBrut): MessageEquipe {
  return {
    id: brut.id,
    auteur: brut.author === "team" ? "equipe" : "moi",
    sorte: brut.kind === "voice" ? "vocal" : brut.kind === "image" ? "image" : "texte",
    texte: brut.body,
    piece:
      brut.attachment === null
        ? null
        : {
            url: brut.attachment.url,
            type: brut.attachment.content_type,
            dureeMs: brut.attachment.duration_ms,
          },
    creeLe: brut.created_at,
  };
}

/** Lit une trame du flux ; `null` pour ce qui n'est pas un message (ping, inconnu). */
export function lireTrame(texte: string): MessageEquipe | null {
  let trame: TrameBrute;
  try {
    trame = JSON.parse(texte) as TrameBrute;
  } catch (cause: unknown) {
    console.warn("[karria] trame illisible du flux de l'équipe", cause);
    return null;
  }
  if (trame.type !== "message" || trame.message == null) return null;
  return versMessage(trame.message);
}

export async function lireFil(): Promise<FilEquipe> {
  const brut = await http.get<FilBrut>("/support/me");
  return { messages: brut.messages.map(versMessage), nonLu: brut.has_unread };
}

export async function lireNonLu(): Promise<boolean> {
  return (await http.get<{ has_unread: boolean }>("/support/me/unread")).has_unread;
}

export async function ecrireTexte(texte: string): Promise<MessageEquipe> {
  return versMessage(
    await http.post<MessageBrut>("/support/me/messages", { body: texte }),
  );
}

export async function envoyerFichier(fichier: FichierAEnvoyer): Promise<MessageEquipe> {
  const brut = await http.postFormulaire<MessageBrut>(
    "/support/me/messages/media",
    () => {
      const formulaire = new FormData();
      // La forme `{ uri, name, type }` est celle que le `FormData` de React
      // Native sait lire depuis un fichier local ; le typage du DOM l'ignore.
      formulaire.append("file", {
        uri: fichier.uri,
        name: fichier.nom,
        type: fichier.type,
      } as unknown as Blob);
      if (fichier.dureeMs !== null) {
        formulaire.append(
          "duration_ms",
          String(Math.max(1, Math.round(fichier.dureeMs))),
        );
      }
      return formulaire;
    },
  );
  return versMessage(brut);
}

export async function marquerLu(): Promise<void> {
  await http.post<void>("/support/me/read");
}

/**
 * Ouvre le flux en direct. Rend de quoi le fermer ; `surFin` n'est appelé
 * que pour une fin **subie** (refus, coupure), jamais après `fermer()`.
 */
export async function ouvrirFlux(ecoute: EcouteFlux): Promise<FluxEquipe> {
  if (SIMULATION || (__DEV__ && enAvanceSurLeBackend("/support/me/stream"))) {
    return ouvrirFluxSimule({
      depuis: ecoute.depuis,
      surMessage: (brut) => ecoute.surMessage(versMessage(brut as MessageBrut)),
      surOuvert: ecoute.surOuvert,
    });
  }

  // Renouvelle la session si besoin (voir l'en-tête), puis lit le jeton frais.
  await lireNonLu();
  const jeton = (await lireJetons())?.acces ?? null;
  if (jeton === null) {
    ecoute.surFin("refuse");
    return { signalerLu: () => undefined, fermer: () => undefined };
  }

  const requete =
    ecoute.depuis === null ? "" : `?since=${encodeURIComponent(ecoute.depuis)}`;
  const adresse = `${API_URL.replace(/^http/, "ws")}/support/me/stream${requete}`;
  const socket = new WebSocketAvecEnTetes(adresse, null, {
    headers: { Authorization: `Bearer ${jeton}` },
  });
  let fermeParNous = false;

  socket.onopen = () => ecoute.surOuvert();
  socket.onmessage = (evenement) => {
    if (typeof evenement.data !== "string") return;
    const message = lireTrame(evenement.data);
    if (message !== null) ecoute.surMessage(message);
  };
  socket.onerror = (evenement) => {
    // La fermeture suit toujours l'erreur : c'est elle qui décide. On garde
    // la cause dans le journal (React Native y pose `message`).
    console.warn("[karria] flux de l'équipe en erreur", evenement);
  };
  socket.onclose = (evenement) => {
    if (fermeParNous) return;
    ecoute.surFin(evenement.code === FERMETURE_REFUS ? "refuse" : "coupe");
  };

  return {
    signalerLu: () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "read" }));
      }
    },
    fermer: () => {
      fermeParNous = true;
      socket.close();
    },
  };
}
