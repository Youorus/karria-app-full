/**
 * « Parler à l'équipe » : les messages tels que le serveur les envoie, et
 * tels que l'application les manipule.
 *
 * Deux formes, comme partout : la brute (`snake_case`, celle de
 * `docs/contrat-api-equipe.md`) ne sort pas de `api/` ; le reste de
 * l'application ne lit que la traduite.
 */

// ─── La forme réseau ───

export interface PieceBrute {
  url: string;
  content_type: string;
  size_bytes: number;
  duration_ms: number | null;
}

export interface MessageBrut {
  id: string;
  author: "user" | "team";
  kind: "text" | "voice" | "image";
  body: string | null;
  attachment: PieceBrute | null;
  created_at: string;
}

export interface FilBrut {
  id: string;
  has_unread: boolean;
  last_team_message_at: string | null;
  messages: MessageBrut[];
}

/** Une trame du flux WebSocket `/support/me/stream`. */
export interface TrameBrute {
  type: string;
  message?: MessageBrut | null;
}

// ─── La forme de l'application ───

export type AuteurMessage = "moi" | "equipe";
export type SorteMessage = "texte" | "vocal" | "image";

export interface PieceJointe {
  /** URL signée, qui expire : jamais gardée au-delà de l'écran. */
  url: string;
  type: string;
  /** Durée d'un vocal, `null` pour une image. */
  dureeMs: number | null;
}

export interface MessageEquipe {
  id: string;
  auteur: AuteurMessage;
  sorte: SorteMessage;
  texte: string | null;
  piece: PieceJointe | null;
  /** ISO 8601, tel que le serveur l'a écrit : c'est aussi le curseur du flux. */
  creeLe: string;
}

export interface FilEquipe {
  messages: MessageEquipe[];
  nonLu: boolean;
}

/**
 * Un message parti de ce téléphone que le serveur n'a pas encore confirmé
 * — ou qu'il a refusé. Montré dans le fil, estompé, avec « Réessayer » en
 * cas d'échec : un vocal enregistré ne doit jamais se perdre sur une
 * coupure réseau.
 */
export interface EnvoiLocal {
  cle: string;
  sorte: SorteMessage;
  texte: string | null;
  /** Le fichier local d'un vocal ou d'une image. */
  uri: string | null;
  dureeMs: number | null;
  etat: "envoi" | "echec";
  /** Le message d'erreur à montrer quand `etat` vaut `echec`. */
  probleme: string | null;
}

/** Un fichier à déposer : vocal enregistré ou image choisie. */
export interface FichierAEnvoyer {
  uri: string;
  type: string;
  nom: string;
  dureeMs: number | null;
}

/** Le flux en direct ouvert sur le fil. */
export interface FluxEquipe {
  /** « J'ai vu » — envoyé à chaque réponse reçue en direct. */
  signalerLu: () => void;
  fermer: () => void;
}

/** Pourquoi le flux s'est fermé sans qu'on le lui demande. */
export type FinDuFlux = "refuse" | "coupe";

export interface EcouteFlux {
  /** L'instant du dernier message connu : le serveur rattrape la suite. */
  depuis: string | null;
  surMessage: (message: MessageEquipe) => void;
  surOuvert: () => void;
  surFin: (fin: FinDuFlux) => void;
}
