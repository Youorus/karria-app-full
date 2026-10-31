/**
 * Tout ce dont l'écran de l'assistant a besoin, derrière un seul hook.
 *
 * `fermer` vient du rideau qui porte le panneau : c'est lui qui joue la
 * transition de retour vers le fil. `onRecherche` vient du fil lui-même :
 * quand Karria a cherché, il doit se recharger derrière le rideau.
 *
 * La dictée vit ici aussi : ce qu'elle entend rejoint le **brouillon**, pas
 * la conversation — l'utilisateur relit, corrige, puis envoie lui-même.
 */

import { useCallback, useMemo } from "react";

import { useDictee, type Dictee } from "@/features/dictee/hooks/use-dictee";
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
  dictee: Dictee;
  fermer: () => void;
}

export function useEcranAssistant(
  fermer: () => void,
  onRecherche?: (resultats: number) => void,
): EcranAssistant {
  const conversation = useConversation(onRecherche);
  const dictee = useDictee({ onTexte: conversation.ajouterAuBrouillon });

  // Calculée une fois à l'ouverture : une salutation qui changerait sous
  // les yeux à 18 h pile serait une curiosité, pas un service.
  const bonjour = useMemo(() => salutation(new Date().getHours()), []);

  const { changerBrouillon } = conversation;
  const { oublierProbleme } = dictee;
  // Écrire, c'est reprendre la main : le message du micro s'efface.
  const changerBrouillonEtOublier = useCallback(
    (texte: string) => {
      changerBrouillon(texte);
      oublierProbleme();
    },
    [changerBrouillon, oublierProbleme],
  );

  return {
    ...conversation,
    changerBrouillon: changerBrouillonEtOublier,
    // Un problème de micro se lit au même endroit qu'un échec d'envoi.
    erreur: conversation.erreur ?? dictee.probleme,
    fil: [...conversation.messages].reverse(),
    salutation: bonjour,
    suggestions: SUGGESTIONS,
    vierge: conversation.messages.length === 0,
    active: conversation.reflechit || conversation.parle,
    dictee,
    fermer,
  };
}
