/**
 * Écouter les vocaux du fil — un seul lecteur pour tout l'écran.
 *
 * ═══ Pourquoi un seul ═══
 *
 * Un lecteur par bulle, c'est un objet natif par vocal du fil (jusqu'à deux
 * cents) chargé à l'affichage, et deux voix qui se chevauchent si l'on
 * touche deux bulles. Un lecteur partagé change de source au toucher : un
 * seul vocal joue à la fois, et rien n'est chargé tant qu'on n'écoute pas.
 *
 * L'URL est signée et peut avoir expiré si l'écran est resté ouvert
 * longtemps : le retour au premier plan relit le fil, donc les URL.
 */

import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useCallback, useEffect, useState } from "react";

import type { MessageEquipe } from "../types/equipe.types";

export interface LecteurVocal {
  /** Le message en cours de lecture (ou en pause), `null` sinon. */
  courant: string | null;
  joue: boolean;
  /** De 0 à 1, pour le message courant. */
  progression: number;
  basculer: (message: MessageEquipe) => void;
  arreter: () => void;
}

export function useLecteurVocal(): LecteurVocal {
  const lecteur = useAudioPlayer(null);
  const statut = useAudioPlayerStatus(lecteur);
  const [courant, setCourant] = useState<string | null>(null);

  const basculer = useCallback(
    (message: MessageEquipe) => {
      if (message.piece === null) return;
      if (courant === message.id) {
        if (statut.playing) lecteur.pause();
        else lecteur.play();
        return;
      }
      lecteur.replace({ uri: message.piece.url });
      lecteur.play();
      setCourant(message.id);
    },
    [courant, lecteur, statut.playing],
  );

  const arreter = useCallback(() => {
    lecteur.pause();
    setCourant(null);
  }, [lecteur]);

  // À la fin, on revient au début : un second toucher réécoute. Le vocal
  // reste « courant » (en pause) ; rien à changer dans l'état React.
  useEffect(() => {
    if (!statut.didJustFinish) return;
    lecteur.pause();
    lecteur.seekTo(0).catch((cause: unknown) => {
      console.warn("[karria] retour au début du vocal impossible", cause);
    });
  }, [statut.didJustFinish, lecteur]);

  const progression =
    courant !== null && statut.duration > 0
      ? Math.min(1, statut.currentTime / statut.duration)
      : 0;

  return {
    courant,
    joue: courant !== null && statut.playing,
    progression,
    basculer,
    arreter,
  };
}
