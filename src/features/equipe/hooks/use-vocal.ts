/**
 * Enregistrer un message vocal pour l'équipe.
 *
 * ═══ Pourquoi pas la dictée (`features/dictee/`) ═══
 *
 * La dictée parle à Karria : elle rend un **texte** (transcrit sur le
 * téléphone ou par le serveur), à relire avant l'envoi. Ici
 * le fichier **est** le message : il faut sa durée (le serveur la borne à
 * cinq minutes), un arrêt automatique à la limite, et l'abandon sans
 * envoi. Deux usages, deux hooks ; ce qu'ils partagent — `expo-audio` —
 * est déjà commun.
 *
 * ═══ Le format ═══
 *
 * `HIGH_QUALITY` d'`expo-audio` : AAC dans un conteneur MPEG-4 (`.m4a`) sur
 * iOS comme sur Android. Envoyé en `audio/mp4`, que l'API accepte et qu'un
 * navigateur lit dans la console de l'équipe.
 */

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";

import { VOCAL_MAX_MS, VOCAL_MIN_MS } from "../services/fil";
import type { FichierAEnvoyer } from "../types/equipe.types";

const SILENCE_DB = -55;
const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export interface Vocal {
  enregistre: boolean;
  dureeMs: number;
  /** De 0 à 1 : l'onde qui prouve que le téléphone écoute. */
  niveau: number;
  probleme: string | null;
  demarrer: () => Promise<void>;
  /** Arrête et rend le fichier, ou `null` (trop court, panne). */
  terminer: () => Promise<FichierAEnvoyer | null>;
  /** Arrête et jette. */
  annuler: () => Promise<void>;
}

export function useVocal(surLimite: (fichier: FichierAEnvoyer | null) => void): Vocal {
  const enregistreur = useAudioRecorder(OPTIONS);
  const etat = useAudioRecorderState(enregistreur, 100);
  const [probleme, setProbleme] = useState<string | null>(null);

  const demarrer = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setProbleme(
        "Autorise le micro dans les réglages du téléphone pour laisser un vocal. Tu peux aussi écrire.",
      );
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
      setProbleme(null);
    } catch (cause: unknown) {
      console.warn("[karria] enregistrement vocal impossible", cause);
      setProbleme("Le micro ne répond pas. Réessaie, ou écris ton message.");
    }
  }, [enregistreur]);

  const arreter = useCallback(async (): Promise<{
    uri: string | null;
    dureeMs: number;
  }> => {
    // La durée se lit **avant** l'arrêt : après, l'état repart à zéro.
    const dureeMs = enregistreur.getStatus().durationMillis;
    try {
      await enregistreur.stop();
    } catch (cause: unknown) {
      console.warn("[karria] arrêt de l'enregistrement en échec", cause);
      return { uri: null, dureeMs };
    } finally {
      // Rendre la sortie audio normale : sans cela, iOS joue les vocaux du
      // fil dans l'écouteur, au volume d'un appel.
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
        (cause: unknown) => console.warn("[karria] mode audio non rétabli", cause),
      );
    }
    return { uri: enregistreur.uri, dureeMs };
  }, [enregistreur]);

  const terminer = useCallback(async (): Promise<FichierAEnvoyer | null> => {
    const { uri, dureeMs } = await arreter();
    if (uri === null) {
      setProbleme("Le vocal n'a pas pu être enregistré. Réessaie.");
      return null;
    }
    if (dureeMs < VOCAL_MIN_MS) {
      setProbleme("Garde le micro un peu plus longtemps pour enregistrer.");
      return null;
    }
    return {
      uri,
      type: "audio/mp4",
      nom: "vocal.m4a",
      dureeMs: Math.min(dureeMs, VOCAL_MAX_MS),
    };
  }, [arreter]);

  const annuler = useCallback(async () => {
    await arreter();
  }, [arreter]);

  // Cinq minutes, c'est la limite du serveur : on s'arrête de soi-même et
  // on envoie, plutôt que d'enregistrer un vocal qui sera refusé.
  const terminerRef = useRef(terminer);
  const surLimiteRef = useRef(surLimite);
  useEffect(() => {
    terminerRef.current = terminer;
    surLimiteRef.current = surLimite;
  }, [terminer, surLimite]);
  const depasse = etat.isRecording && etat.durationMillis >= VOCAL_MAX_MS;
  useEffect(() => {
    if (!depasse) return;
    void terminerRef.current().then((fichier) => surLimiteRef.current(fichier));
  }, [depasse]);

  const db = etat.metering ?? SILENCE_DB;
  const niveau = etat.isRecording
    ? Math.min(1, Math.max(0, (db - SILENCE_DB) / -SILENCE_DB))
    : 0;

  return {
    enregistre: etat.isRecording,
    dureeMs: etat.isRecording ? etat.durationMillis : 0,
    niveau,
    probleme,
    demarrer,
    terminer,
    annuler,
  };
}
