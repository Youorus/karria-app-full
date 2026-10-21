/**
 * Le micro : parler au lieu d'écrire.
 *
 * ═══ Ce qu'il rend ═══
 *
 * `niveau`, de 0 à 1, lu sur le compteur du micro toutes les 80 ms :
 * c'est lui qui fait onduler l'onde pendant qu'on parle. Sans retour
 * visuel, on ne sait pas si le téléphone écoute — et on se tait.
 *
 * ═══ L'autorisation ═══
 *
 * Demandée au premier appui, jamais à l'ouverture de l'écran : on
 * comprend pourquoi le micro est demandé quand on vient de toucher le
 * bouton micro. Refusée, on le dit et l'écrit reste là.
 */

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useState } from "react";

/** Le compteur rend des décibels (≈ −60 en silence, 0 au plus fort). */
const SILENCE_DB = -55;

const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export interface Micro {
  enregistre: boolean;
  niveau: number;
  /** Message à montrer quand le micro est refusé ou en panne. */
  probleme: string | null;
  demarrer: () => Promise<boolean>;
  /** Arrête et rend le fichier enregistré, ou `null`. */
  arreter: () => Promise<string | null>;
}

export function useMicro(): Micro {
  const enregistreur = useAudioRecorder(OPTIONS);
  const etat = useAudioRecorderState(enregistreur, 80);
  const [probleme, setProbleme] = useState<string | null>(null);

  const demarrer = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setProbleme(
        "Autorise le micro dans les réglages pour me parler. En attendant, écris-moi !",
      );
      return false;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
      setProbleme(null);
      return true;
    } catch (cause: unknown) {
      console.warn("[karria] micro indisponible", cause);
      setProbleme("Le micro ne répond pas. Écris-moi plutôt.");
      return false;
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

  const db = etat.metering ?? SILENCE_DB;
  const niveau = etat.isRecording
    ? Math.min(1, Math.max(0, (db - SILENCE_DB) / -SILENCE_DB))
    : 0;

  return { enregistre: etat.isRecording, niveau, probleme, demarrer, arreter };
}
