/**
 * Tout ce dont l'écran de l'assistant a besoin, derrière un seul hook.
 *
 * `fermer` vient du rideau qui porte le panneau : c'est lui qui joue la
 * transition de retour vers le fil.
 */

import { useMemo } from "react";

import { salutation } from "@/lib/salutation";
import { SUGGESTIONS } from "../services/accueil";
import { useConversation, type Conversation } from "./use-conversation";

export interface EcranAssistant extends Conversation {
  /** Les messages du plus récent au plus ancien, pour la liste inversée. */
  fil: Conversation["messages"];
  salutation: string;
  suggestions: readonly string[];
  /** Aucun message encore : on montre l'accueil plutôt que le fil. */
  vierge: boolean;
  /** L'IA réfléchit ou parle : l'aura et l'orbe s'animent. */
  active: boolean;
  fermer: () => void;
}

export function useEcranAssistant(fermer: () => void): EcranAssistant {
  const conversation = useConversation();

  // Calculée une fois à l'ouverture : une salutation qui changerait sous
  // les yeux à 18 h pile serait une curiosité, pas un service.
  const bonjour = useMemo(() => salutation(new Date().getHours()), []);

  return {
    ...conversation,
    fil: [...conversation.messages].reverse(),
    salutation: bonjour,
    suggestions: SUGGESTIONS,
    vierge: conversation.messages.length === 0,
    active: conversation.reflechit || conversation.parle,
    fermer,
  };
}
