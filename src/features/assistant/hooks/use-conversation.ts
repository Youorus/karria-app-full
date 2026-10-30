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
 *
 * ═══ Ce que la dernière réponse propose ═══
 *
 * Les réponses rapides et les élargissements de la **dernière** réponse
 * restent affichés sous elle jusqu'au message suivant : ce sont des
 * suites possibles, pas de l'historique. Un élargissement touché part
 * comme un message — c'est le serveur qui le reconnaît et l'applique.
 *
 * ═══ Le premier message demande l'accord sur l'IA ═══
 *
 * Un message part chez un modèle tiers : avant le premier, la feuille de
 * consentement se montre (`useActionIa`), et le message part dès « J'accepte
 * et je continue ». Si le serveur répond quand même `ai_consent_required`
 * (accord retiré, fournisseur changé), la bulle optimiste se retire, la
 * feuille se remontre, et le message repart tout seul après l'accord — sans
 * message d'erreur, puisque ce n'est pas une panne.
 *
 * ═══ La recherche se voit dans le fil ═══
 *
 * Quand Karria a lancé une recherche, le fil derrière le rideau n'est
 * plus le même : `onRecherche` le prévient pour qu'il se recharge, et le
 * bouton « Voir les N offres » n'a plus qu'à refermer le rideau.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";
import { ErreurApi } from "@/lib/http";
import { envoyerMessage } from "../api/assistant.api";
import { BATTEMENT_MS, borneSuivante } from "@/lib/revelation";
import type { Elargissement, Message, StatutReponse } from "../types/assistant.types";

export interface Suite {
  /** Le message auquel ces suites appartiennent. */
  messageId: string;
  statut: StatutReponse;
  resultats: number | null;
  suggestions: string[];
  elargissements: Elargissement[];
}

export interface Conversation {
  messages: Message[];
  brouillon: string;
  changerBrouillon: (texte: string) => void;
  envoyer: (texte?: string) => void;
  reflechit: boolean;
  parle: boolean;
  erreur: string | null;
  peutEnvoyer: boolean;
  /** Ce que la dernière réponse propose, une fois révélée. */
  suite: Suite | null;
}

let compteur = 0;
function idLocal(): string {
  compteur += 1;
  return `local_${compteur}`;
}

function messageDErreur(cause: unknown): string {
  if (cause instanceof ErreurApi) {
    if (cause.estReseau) {
      return "Pas de connexion. Ton message est revenu dans le champ : renvoie-le quand tu veux.";
    }
    if (cause.raison === "conversation_not_found") {
      return "Cette conversation n'existe plus. On en reprend une : renvoie ton message.";
    }
    // Le quota du jour et une panne de service : le serveur rédige déjà
    // le message pour être lu, et il dit quoi faire.
    if (cause.statut === 429 || cause.statut === 503) {
      return `${cause.message} Ton message est revenu dans le champ.`;
    }
  }
  return "Karria n'a pas pu répondre. Ton message est revenu dans le champ : réessaie.";
}

export function useConversation(onRecherche?: (resultats: number) => void): Conversation {
  const [messages, setMessages] = useState<Message[]>([]);
  const [brouillon, setBrouillon] = useState("");
  const [reflechit, setReflechit] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suite, setSuite] = useState<Suite | null>(null);
  const conversationId = useRef<string | null>(null);
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  // Le rejeu après l'accord passe par une référence : la fonction se cite
  // elle-même, et React refuse qu'une valeur soit lue avant d'être déclarée.
  const rejouer = useRef<(texte: string) => void>(() => undefined);

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

  const expedier = useCallback(
    (texte: string) => {
      setErreur(null);
      setBrouillon("");
      setSuite(null);
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
          setSuite({
            messageId: reponse.message.id,
            statut: reponse.statut,
            resultats: reponse.resultats,
            suggestions: reponse.suggestions,
            elargissements: reponse.elargissements,
          });
          if (reponse.statut === "recherche") onRecherche?.(reponse.resultats ?? 0);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] message non envoyé", cause);
          if (cause instanceof ErreurApi && cause.raison === "conversation_not_found") {
            conversationId.current = null;
          }
          setMessages((liste) => liste.filter((m) => m.id !== id));
          // Le serveur veut l'accord d'abord : la feuille s'ouvre, le message
          // repartira tout seul. Rien à afficher d'autre.
          if (
            rejouerSiConsentementRequis(cause, "assistant", () => rejouer.current(texte))
          ) {
            return;
          }
          setBrouillon(texte);
          setErreur(messageDErreur(cause));
        })
        .finally(() => setReflechit(false));
    },
    [onRecherche, rejouerSiConsentementRequis],
  );

  useEffect(() => {
    rejouer.current = expedier;
  }, [expedier]);

  const envoyer = useCallback(
    (fourni?: string) => {
      const texte = (fourni ?? brouillon).trim();
      if (texte === "" || reflechit) return;
      avecConsentement("assistant", () => expedier(texte));
    },
    [brouillon, reflechit, avecConsentement, expedier],
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
    // Les suites n'apparaissent qu'une fois la réponse entièrement lue :
    // des boutons sous une phrase à moitié écrite tirent l'œil trop tôt.
    suite: parle ? null : suite,
  };
}
