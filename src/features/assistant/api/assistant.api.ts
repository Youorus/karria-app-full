/**
 * Les appels de la conversation, et leur traduction.
 *
 * ═══ Le contrat ═══
 *
 * `POST /assistant/messages` reçoit le message de l'utilisateur et rend la
 * réponse de Karria (`docs/contrat-api-recherche.md`). Le premier message
 * part sans `conversation_id` : le serveur ouvre la conversation et rend
 * son identifiant, que les messages suivants rappellent. C'est le serveur
 * qui garde l'historique — le mobile n'envoie jamais la conversation
 * entière, ce qui la ferait grossir à chaque échange et laisserait le
 * client réécrire le passé.
 *
 * La réponse dit aussi ce qui s'est passé : une recherche a tourné (le fil
 * est à jour, `resultats` dit combien), Karria pose une question, ou elle
 * a simplement répondu. Et ce qu'elle propose ensuite : des réponses
 * rapides, et des élargissements dont le gain est **compté** sur la base.
 */

import { http } from "@/lib/http";
import type { Reponse, ReponseBrute, StatutReponse } from "../types/assistant.types";
import { versCriteres } from "./recherche.api";

const STATUTS: Record<ReponseBrute["status"], StatutReponse> = {
  search: "recherche",
  clarify: "question",
  chat: "discussion",
};

export function versReponse(brute: ReponseBrute): Reponse {
  return {
    conversationId: brute.conversation_id,
    message: { id: brute.message.id, texte: brute.message.content },
    statut: STATUTS[brute.status],
    resultats: brute.results_count,
    criteres: brute.criteria === null ? null : versCriteres(brute.criteria),
    suggestions: brute.suggestions,
    elargissements: (brute.widenings ?? []).map((e) => ({
      id: e.id,
      libelle: e.label,
      gain: e.gain,
      message: e.message,
    })),
  };
}

export async function envoyerMessage(
  conversationId: string | null,
  texte: string,
): Promise<Reponse> {
  return versReponse(
    await http.post<ReponseBrute>("/assistant/messages", {
      conversation_id: conversationId,
      content: texte,
    }),
  );
}
