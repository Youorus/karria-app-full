/**
 * L'enregistreur : la voix dans un fichier, pour la transcription serveur.
 *
 * ═══ Un repli, pas la règle ═══
 *
 * La dictée passe d'abord par la reconnaissance du téléphone (`use-dictee`),
 * qui écrit le texte en direct. Ce hook ne sert que lorsqu'elle manque :
 * on enregistre, et Karria transcrit à la fin.
 *
 * ═══ Ce qu'il rend ═══
 *
 * `niveau`, de 0 à 1, lu sur le compteur du micro toutes les 80 ms : c'est
 * lui qui fait vivre l'orbe pendant qu'on parle. Sans retour visuel, on ne
 * sait pas si le téléphone écoute — et on se tait.
 *
 * ═══ L'autorisation ═══
 *
 * Demandée au premier appui, jamais à l'ouverture de l'écran : on comprend
 * pourquoi le micro est demandé quand on vient de toucher le bouton micro.
 * Refusée, `demarrer` rend le message à afficher et l'écrit reste là.
 */

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback } from "react";

import { MESSAGE_REFUS, niveauDepuisDecibels } from "../services/dictee";

/** Le compteur rend des décibels (≈ −60 en silence, 0 au plus fort). */
const SILENCE_DB = -55;

const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export interface Micro {
  enregistre: boolean;
  niveau: number;
  /** Ouvre le micro ; rend `null` si tout va bien, sinon le message à montrer. */
  demarrer: () => Promise<string | null>;
  /** Arrête et rend le fichier enregistré, ou `null`. */
  arreter: () => Promise<string | null>;
}

export function useMicro(): Micro {
  const enregistreur = useAudioRecorder(OPTIONS);
  const etat = useAudioRecorderState(enregistreur, 80);

  const demarrer = useCallback(async (): Promise<string | null> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return MESSAGE_REFUS;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
      return null;
    } catch (cause: unknown) {
      console.warn("[karria] micro indisponible", cause);
      return "Le micro ne répond pas. Écris-moi plutôt.";
    }
  }, [enregistreur]);

  const arreter = useCallback(async () => {
    try {
      await enregistreur.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      return enregistreur.uri;
    } catch (cause: unknown) {
      console.warn("[karria] arrêt du micro en échec", cause);
      return null;
    }
  }, [enregistreur]);

  return {
    enregistre: etat.isRecording,
    niveau: etat.isRecording ? niveauDepuisDecibels(etat.metering ?? SILENCE_DB) : 0,
    demarrer,
    arreter,
  };
}
