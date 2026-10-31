/**
 * L'enregistreur : la voix dans un fichier, pour la transcription serveur.
 *
 * ═══ Un repli, pas la règle ═══
 *
 * La dictée passe d'abord par la reconnaissance du téléphone (`use-dictee`),
 * qui écrit le texte en direct. Ce hook ne sert que lorsqu'elle manque :
 * on enregistre, et Karria transcrit à la fin.
 *
 * ═══ Le niveau de la voix ═══
 *
 * Le compteur du micro est lu toutes les 80 ms **pendant l'enregistrement
 * seulement**, et écrit dans la valeur partagée `niveau` que l'orbe lit sur
 * le fil d'interface. `useAudioRecorderState` d'expo-audio interrogeait le
 * module natif en permanence — le panneau de l'agent reste monté toute la
 * vie de l'app — et faisait un rendu React par mesure pendant l'écoute.
 *
 * ═══ L'autorisation ═══
 *
 * Demandée au premier appui, jamais à l'ouverture de l'écran : on comprend
 * pourquoi le micro est demandé quand on vient de toucher le bouton micro.
 * Refusée, `demarrer` rend le message à afficher et l'écrit reste là.
 *
 * ═══ Quitter l'écran micro ouvert ═══
 *
 * Le démontage coupe l'enregistrement et rend la session audio : le
 * téléphone ne garde pas le micro (et son point orange) pour rien.
 */

import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { withTiming, type SharedValue } from "react-native-reanimated";

import { MESSAGE_REFUS, niveauDepuisDecibels } from "../services/dictee";

/** Le compteur rend des décibels (≈ −60 en silence, 0 au plus fort). */
const SILENCE_DB = -55;
const CADENCE_MS = 80;

const OPTIONS = { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true };

export interface Micro {
  /** Ouvre le micro ; rend `null` si tout va bien, sinon le message à montrer. */
  demarrer: () => Promise<string | null>;
  /** Arrête et rend le fichier enregistré, ou `null`. */
  arreter: () => Promise<string | null>;
}

function rendreLaSession(): void {
  setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(
    (cause: unknown) => console.warn("[karria] session audio non rendue", cause),
  );
}

export function useMicro(niveau: SharedValue<number>): Micro {
  const enregistreur = useAudioRecorder(OPTIONS);
  const mesure = useRef<ReturnType<typeof setInterval> | null>(null);
  const actif = useRef(false);

  const couperMesure = useCallback(() => {
    if (mesure.current !== null) {
      clearInterval(mesure.current);
      mesure.current = null;
    }
  }, []);

  const demarrer = useCallback(async (): Promise<string | null> => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return MESSAGE_REFUS;
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await enregistreur.prepareToRecordAsync();
      enregistreur.record();
      actif.current = true;
      couperMesure();
      mesure.current = setInterval(() => {
        const db = enregistreur.getStatus().metering ?? SILENCE_DB;
        niveau.set(withTiming(niveauDepuisDecibels(db), { duration: CADENCE_MS }));
      }, CADENCE_MS);
      return null;
    } catch (cause: unknown) {
      console.warn("[karria] micro indisponible", cause);
      rendreLaSession();
      return "Le micro ne répond pas. Écris-moi plutôt.";
    }
  }, [enregistreur, niveau, couperMesure]);

  const arreter = useCallback(async () => {
    couperMesure();
    actif.current = false;
    try {
      await enregistreur.stop();
      return enregistreur.uri;
    } catch (cause: unknown) {
      console.warn("[karria] arrêt du micro en échec", cause);
      return null;
    } finally {
      rendreLaSession();
    }
  }, [enregistreur, couperMesure]);

  // Démontage en plein enregistrement : on coupe et on rend la session.
  // L'enregistreur lui-même est libéré par `useAudioRecorder`.
  useEffect(
    () => () => {
      couperMesure();
      if (actif.current) {
        actif.current = false;
        try {
          // Peut déjà être libéré par `useAudioRecorder` : sans importance.
          enregistreur.stop().catch(() => undefined);
        } catch {
          // idem
        }
        rendreLaSession();
      }
    },
    [enregistreur, couperMesure],
  );

  return useMemo(() => ({ demarrer, arreter }), [demarrer, arreter]);
}
