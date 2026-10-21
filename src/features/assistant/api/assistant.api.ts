/**
 * Les appels de la conversation, et leur traduction.
 *
 * ═══ Le contrat ═══
 *
 * `POST /assistant/messages` reçoit le message de l'utilisateur et rend la
 * réponse de Karria. Le premier message part sans `conversation_id` : le
 * serveur ouvre la conversation et rend son identifiant, que les messages
 * suivants rappellent. C'est le serveur qui garde l'historique — le
 * mobile n'envoie jamais la conversation entière, ce qui la ferait
 * grossir à chaque échange et laisserait le client réécrire le passé.
 *
 * En attendant le backend reconstruit, `lib/dev/serveur-simule.ts`
 * implémente cette route avec des réponses préparées.
 */

import { http } from "@/lib/http";
import type { Reponse, ReponseBrute } from "../types/assistant.types";

export async function envoyerMessage(
  conversationId: string | null,
  texte: string,
): Promise<Reponse> {
  const brute = await http.post<ReponseBrute>("/assistant/messages", {
    conversation_id: conversationId,
    content: texte,
  });
  return {
    conversationId: brute.conversation_id,
    message: { id: brute.message.id, texte: brute.message.content },
  };
}
