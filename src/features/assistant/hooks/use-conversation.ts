/**
 * La conversation avec Karria : ce qui a été dit, ce qui s'écrit, et
 * l'état de l'IA.
 *
 * ═══ L'envoi est optimiste ═══
 *
 * Le message de l'utilisateur s'affiche à l'instant où il l'envoie, avant
 * la réponse du serveur. Attendre l'aller-retour pour montrer ce qu'on
 * vient soi-même d'écrire donne l'impression que le message s'est perdu.
 *
 * ═══ Un échec rend le texte ═══
 *
 * Si l'envoi échoue, la bulle optimiste est retirée et le texte revient
 * dans le compositeur : réessayer coûte un geste, pas une réécriture. La
 * laisser à l'écran ferait croire qu'elle est partie, et la renvoyer
 * produirait un doublon.
 *
 * ═══ « Réfléchit » puis « parle » ═══
 *
 * Deux états distincts, que l'aura et l'orbe rendent visibles :
 * `reflechit` pendant l'attente du serveur, `parle` pendant la révélation
 * de la réponse. Ensemble ils forment `active`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ErreurApi } from "@/lib/http";
import { envoyerMessage } from "../api/assistant.api";
import { BATTEMENT_MS, borneSuivante } from "@/lib/revelation";
import type { Message } from "../types/assistant.types";

export interface Conversation {
  messages: Message[];
  brouillon: string;
  changerBrouillon: (texte: string) => void;
  envoyer: (texte?: string) => void;
  reflechit: boolean;
  parle: boolean;
  erreur: string | null;
  peutEnvoyer: boolean;
}

let compteur = 0;
function idLocal(): string {
  compteur += 1;
  return `local_${compteur}`;
}

export function useConversation(): Conversation {
  const [messages, setMessages] = useState<Message[]>([]);
  const [brouillon, setBrouillon] = useState("");
  const [reflechit, setReflechit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const conversationId = useRef<string | null>(null);

  // La réponse en cours de révélation, s'il y en a une.
  const enRevelation = messages.find(
    (m) => m.auteur === "assistant" && m.visible < m.texte.length,
  );
  const parle = enRevelation !== undefined;

  useEffect(() => {
    if (enRevelation === undefined) return;
    const battement = setTimeout(() => {
      setMessages((liste) =>
        liste.map((m) =>
          m.id === enRevelation.id
            ? { ...m, visible: borneSuivante(m.texte, m.visible) }
            : m,
        ),
      );
    }, BATTEMENT_MS);
    return () => clearTimeout(battement);
  }, [enRevelation]);

  const envoyer = useCallback(
    (fourni?: string) => {
      const texte = (fourni ?? brouillon).trim();
      if (texte === "" || reflechit) return;

      setErreur(null);
      setBrouillon("");
      const id = idLocal();
      setMessages((liste) => [
        ...liste,
        { id, auteur: "utilisateur", texte, visible: texte.length },
      ]);
      setReflechit(true);

      envoyerMessage(conversationId.current, texte)
        .then((reponse) => {
          conversationId.current = reponse.conversationId;
          setMessages((liste) => [
            ...liste,
            {
              id: reponse.message.id,
              auteur: "assistant",
              texte: reponse.message.texte,
              visible: 0,
            },
          ]);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] message non envoyé", cause);
          setMessages((liste) => liste.filter((m) => m.id !== id));
          setBrouillon(texte);
          setErreur(
            cause instanceof ErreurApi && cause.estReseau
              ? "Pas de connexion. Ton message est revenu dans le champ : renvoie-le quand tu veux."
              : "Karria n'a pas pu répondre. Ton message est revenu dans le champ : réessaie.",
          );
        })
        .finally(() => setReflechit(false));
    },
    [brouillon, reflechit],
  );

  const changerBrouillon = useCallback(
    (texte: string) => {
      setBrouillon(texte);
      if (erreur !== null) setErreur(null);
    },
    [erreur],
  );

  return {
    messages,
    brouillon,
    changerBrouillon,
    envoyer,
    reflechit,
    parle,
    erreur,
    peutEnvoyer: brouillon.trim() !== "" && !reflechit,
  };
}
