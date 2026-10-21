/**
 * Les types de la conversation avec Karria.
 *
 * `…Brut` décrit ce que le serveur envoie ; le reste, ce que l'application
 * manipule. La traduction se fait dans `api/`.
 */

export type Auteur = "utilisateur" | "assistant";

export interface Message {
  id: string;
  auteur: Auteur;
  texte: string;
  /** Pour un message de l'assistant en cours de révélation : la part
   *  déjà affichée. Égal à `texte.length` une fois la révélation finie. */
  visible: number;
}

export interface MessageBrut {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ReponseBrute {
  conversation_id: string;
  message: MessageBrut;
}

export interface Reponse {
  conversationId: string;
  message: { id: string; texte: string };
}
