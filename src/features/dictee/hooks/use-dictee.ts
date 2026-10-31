/**
 * Dicter à Karria : le micro, la reconnaissance du téléphone, et le repli
 * par le serveur — derrière une seule machine d'états (`services/dictee.ts`).
 *
 * ═══ D'abord le téléphone, en direct ═══
 *
 * La reconnaissance vocale du système (`expo-speech-recognition` :
 * SFSpeechRecognizer sur iOS, SpeechRecognizer sur Android) écrit le texte
 * **pendant** qu'on parle. On demande la reconnaissance **sur l'appareil**
 * (`requiresOnDeviceRecognition`) : la voix ne quitte pas le téléphone, et
 * aucun accord n'est à demander pour écouter. L'envoi à Karria, lui, reste
 * derrière `useActionIa` comme tout message — c'est l'appelant qui l'a.
 *
 * Limite connue, à garder en tête : sur iOS, le drapeau « sur l'appareil »
 * n'est appliqué que si le moteur de la langue le permet ; sinon le système
 * reconnaît par **son** réseau (Apple), sans nous le dire. On ne lance donc le
 * mode appareil que si `supportsOnDeviceRecognition()` — lu pour la langue du
 * téléphone — répond oui. Un francophone sur un iPhone récent est sur place ;
 * les autres passent par le serveur de Karria, avec l'accord qui va avec.
 *
 * ═══ Sinon, le serveur de Karria ═══
 *
 * Pas de reconnaissance disponible, langue sans modèle local, service
 * refusé : on enregistre (`use-micro`) et `POST /voice/transcribe` rend le
 * texte à la fin. Cet envoi part chez un fournisseur d'IA : l'accord
 * (`avecConsentement("transcription")`) se demande **avant** d'ouvrir le
 * micro — on ne fait pas parler quelqu'un pour lui dire ensuite que sa voix
 * ne partira pas. Un `403` du serveur rouvre la feuille et la transcription
 * repart après l'accord.
 *
 * ═══ Le niveau de la voix sans rendu React ═══
 *
 * Le système mesure le volume toutes les 80 ms ; chaque mesure écrit une
 * valeur partagée Reanimated que l'orbe et l'aura lisent sur le fil
 * d'interface. Passer par un état React ferait douze rendus par seconde
 * pour une animation.
 *
 * ═══ Un seul fil d'événements ═══
 *
 * Les événements du module sont globaux : le panneau de l'agent reste monté
 * pendant qu'on crée son CV, et chacun porte sa dictée. Chaque instance ne
 * traite donc que les événements qui la concernent — celle qui n'est pas au
 * repos, en mode appareil.
 */

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";

import { transcrire } from "../api/transcription.api";
import {
  interpreterErreur,
  LIMITE_MS,
  MESSAGE_REFUS,
  niveauDepuisVolume,
  reduire,
  REPOS,
  RIEN_ENTENDU,
  texteDicte,
  type EtatDictee,
  type EvenementDictee,
  type ModeDictee,
} from "../services/dictee";
import { useMicro } from "./use-micro";

const LANGUE = "fr-FR";
/** Cadence des mesures de volume : celle d'une image animée lissée. */
const CADENCE_VOLUME_MS = 80;
/** Après `stop()`, le système rend son dernier mot ; passé ce délai, on
 *  garde ce qu'on a plutôt que de laisser l'utilisateur attendre. */
const DELAI_CLOTURE_MS = 2_500;
const MAL_ENTENDU = "Je ne t'ai pas bien entendu. Réessaie, ou écris-moi.";

export interface OptionsDictee {
  /** Le texte dicté, à poser dans le champ pour relecture. Jamais envoyé ici. */
  onTexte: (texte: string) => void;
}

export interface Dictee {
  etat: EtatDictee;
  /** Le micro est engagé (démarrage compris) : la zone d'écoute remplace le champ. */
  ouverte: boolean;
  /** On écoute, pour de vrai : l'orbe suit la voix. */
  ecoute: boolean;
  /** On attend quelque chose : le micro, le dernier mot du système, le serveur. */
  attente: boolean;
  mode: ModeDictee | null;
  /** Ce qui a été confirmé par la reconnaissance. */
  confirme: string;
  /** Ce qu'elle est en train d'entendre, encore susceptible de changer. */
  partiel: string;
  /** Depuis le début de l'écoute, en millisecondes (figé à la clôture). */
  dureeMs: number;
  /** Le niveau de la voix, de 0 à 1, sur le fil d'interface. */
  niveau: SharedValue<number>;
  probleme: string | null;
  /** L'utilisateur a repris la main (il écrit) : le message n'a plus lieu d'être. */
  oublierProbleme: () => void;
  demarrer: () => void;
  /** Garde le texte : il arrive par `onTexte` une fois le système fermé. */
  terminer: () => void;
  /** Ne garde rien. */
  annuler: () => void;
}

function modeDe(etat: EtatDictee): ModeDictee | null {
  switch (etat.nom) {
    case "demarrage":
    case "ecoute":
      return etat.mode;
    case "cloture":
      return "appareil";
    case "transcription":
      return "serveur";
    case "repos":
      return null;
  }
}

/** La reconnaissance du téléphone, sur place : disponible ici ? */
function reconnaissanceSurPlace(): boolean {
  try {
    return (
      ExpoSpeechRecognitionModule.isRecognitionAvailable() &&
      ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
    );
  } catch (cause: unknown) {
    console.warn("[karria] reconnaissance vocale illisible, repli serveur", cause);
    return false;
  }
}

export function useDictee({ onTexte }: OptionsDictee): Dictee {
  const micro = useMicro();
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  const [etat, setEtat] = useState<EtatDictee>(REPOS);
  // Les événements natifs arrivent hors du rendu : la référence est la
  // vérité, l'état React n'est que son reflet pour l'affichage.
  const etatRef = useRef<EtatDictee>(REPOS);
  const [probleme, setProbleme] = useState<string | null>(null);
  const [dureeMs, setDureeMs] = useState(0);
  const niveau = useSharedValue(0);
  const onTexteRef = useRef(onTexte);
  const minuteurCloture = useRef<ReturnType<typeof setTimeout> | null>(null);
  // La transcription se cite elle-même après l'accord : une référence, pour
  // que React n'ait pas à lire une valeur avant sa déclaration.
  const transcrireFichierRef = useRef<(uri: string) => void>(() => undefined);
  const terminerRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    onTexteRef.current = onTexte;
  }, [onTexte]);

  const appliquer = useCallback(
    (evenement: EvenementDictee) => {
      const { etat: suivant, sortie } = reduire(etatRef.current, evenement);
      etatRef.current = suivant;
      setEtat(suivant);
      if (suivant.nom === "repos") {
        setDureeMs(0);
        niveau.set(withTiming(0, { duration: 200 }));
        if (minuteurCloture.current !== null) {
          clearTimeout(minuteurCloture.current);
          minuteurCloture.current = null;
        }
      }
      if (sortie === null) return;
      if (sortie.type === "texte") {
        setProbleme(null);
        onTexteRef.current(sortie.texte);
      } else if (sortie.type === "rien") {
        setProbleme(RIEN_ENTENDU);
      } else {
        setProbleme(sortie.message);
      }
    },
    [niveau],
  );

  // ── Le repli : enregistrer, puis le serveur ──

  const transcrireFichier = useCallback(
    (uri: string) => {
      transcrire(uri)
        .then((texte) => {
          if (etatRef.current.nom !== "transcription") return;
          appliquer({ type: "texte-serveur", texte });
        })
        .catch((cause: unknown) => {
          console.warn("[karria] transcription en échec", cause);
          if (etatRef.current.nom !== "transcription") return;
          const rejoue = rejouerSiConsentementRequis(cause, "transcription", () => {
            appliquer({ type: "transcrire-encore" });
            transcrireFichierRef.current(uri);
          });
          if (rejoue) {
            // La feuille d'accord est ouverte : on rend le champ sans message.
            appliquer({ type: "annuler" });
            return;
          }
          appliquer({ type: "echec", message: MAL_ENTENDU });
        });
    },
    [appliquer, rejouerSiConsentementRequis],
  );

  useEffect(() => {
    transcrireFichierRef.current = transcrireFichier;
  }, [transcrireFichier]);

  const demarrerServeur = useCallback(() => {
    avecConsentement("transcription", () => {
      appliquer({ type: "demarrer", mode: "serveur" });
      micro.demarrer().then((refus) => {
        if (etatRef.current.nom !== "demarrage") {
          // Annulé pendant l'ouverture : le micro ne doit pas rester allumé.
          void micro.arreter();
          return;
        }
        if (refus !== null) appliquer({ type: "echec", message: refus });
        else appliquer({ type: "pret" });
      });
    });
  }, [avecConsentement, appliquer, micro]);

  // ── La reconnaissance du téléphone ──

  const demarrerAppareil = useCallback(() => {
    appliquer({ type: "demarrer", mode: "appareil" });
    ExpoSpeechRecognitionModule.requestPermissionsAsync().then(
      (permission) => {
        if (etatRef.current.nom !== "demarrage") return;
        if (!permission.granted) {
          appliquer({ type: "echec", message: MESSAGE_REFUS });
          return;
        }
        ExpoSpeechRecognitionModule.start({
          lang: LANGUE,
          interimResults: true,
          // Jusqu'à ce que l'utilisateur termine : c'est lui qui décide quand
          // il a fini, pas trois secondes de silence.
          continuous: true,
          requiresOnDeviceRecognition: true,
          addsPunctuation: true,
          maxAlternatives: 1,
          iosTaskHint: "dictation",
          volumeChangeEventOptions: { enabled: true, intervalMillis: CADENCE_VOLUME_MS },
        });
      },
      (cause: unknown) => {
        console.warn("[karria] permissions de dictée illisibles", cause);
        appliquer({ type: "echec", message: MESSAGE_REFUS });
      },
    );
  }, [appliquer]);

  /** Cette instance est-elle celle qui parle au système en ce moment ? */
  const enModeAppareil = useCallback(() => modeDe(etatRef.current) === "appareil", []);

  useSpeechRecognitionEvent("start", () => {
    if (enModeAppareil()) appliquer({ type: "pret" });
  });

  useSpeechRecognitionEvent("result", (evenement) => {
    if (!enModeAppareil()) return;
    const premier = evenement.results[0];
    if (premier === undefined) return;
    appliquer({ type: "resultat", texte: premier.transcript, final: evenement.isFinal });
  });

  useSpeechRecognitionEvent("end", () => {
    if (enModeAppareil()) appliquer({ type: "fin" });
  });

  useSpeechRecognitionEvent("error", (evenement) => {
    if (!enModeAppareil()) return;
    const suite = interpreterErreur(evenement.error);
    switch (suite.type) {
      case "ignorer":
        return;
      case "fin":
        appliquer({ type: "fin" });
        return;
      case "repli":
        // Déjà des mots : on les garde. Rien encore : le serveur reprend,
        // avec l'accord qui va avec.
        if (texteDicte(etatRef.current) !== "") {
          appliquer({ type: "fin" });
          return;
        }
        console.warn(
          "[karria] dictée sur l'appareil indisponible, repli serveur",
          evenement,
        );
        appliquer({ type: "annuler" });
        demarrerServeur();
        return;
      case "probleme":
        console.warn("[karria] dictée en erreur", evenement);
        appliquer({ type: "echec", message: suite.message });
    }
  });

  useSpeechRecognitionEvent("volumechange", (evenement) => {
    if (etatRef.current.nom !== "ecoute") return;
    niveau.set(
      withTiming(niveauDepuisVolume(evenement.value), { duration: CADENCE_VOLUME_MS }),
    );
  });

  // En repli, le niveau vient du compteur de l'enregistreur.
  useEffect(() => {
    if (etat.nom === "ecoute" && etat.mode === "serveur") {
      niveau.set(withTiming(micro.niveau, { duration: CADENCE_VOLUME_MS }));
    }
  }, [etat, micro.niveau, niveau]);

  // ── Les gestes ──

  const oublierProbleme = useCallback(() => setProbleme(null), []);

  const demarrer = useCallback(() => {
    if (etatRef.current.nom !== "repos") return;
    setProbleme(null);
    if (reconnaissanceSurPlace()) demarrerAppareil();
    else demarrerServeur();
  }, [demarrerAppareil, demarrerServeur]);

  const terminer = useCallback(() => {
    const courant = etatRef.current;
    if (courant.nom !== "ecoute") return;
    appliquer({ type: "terminer" });
    if (courant.mode === "appareil") {
      ExpoSpeechRecognitionModule.stop();
      minuteurCloture.current = setTimeout(() => {
        if (etatRef.current.nom === "cloture") appliquer({ type: "fin" });
      }, DELAI_CLOTURE_MS);
      return;
    }
    micro.arreter().then((uri) => {
      if (etatRef.current.nom !== "transcription") return;
      if (uri === null) {
        appliquer({ type: "echec", message: MAL_ENTENDU });
        return;
      }
      transcrireFichier(uri);
    });
  }, [appliquer, micro, transcrireFichier]);

  useEffect(() => {
    terminerRef.current = terminer;
  }, [terminer]);

  const annuler = useCallback(() => {
    const courant = etatRef.current;
    if (courant.nom === "repos") return;
    const mode = modeDe(courant);
    appliquer({ type: "annuler" });
    if (mode === "appareil") ExpoSpeechRecognitionModule.abort();
    else if (courant.nom === "ecoute") void micro.arreter();
  }, [appliquer, micro]);

  // La minuterie : une seconde affichée toutes les 250 ms pour ne jamais
  // sauter un chiffre ; à la limite, on termine pour l'utilisateur.
  useEffect(() => {
    if (etat.nom !== "ecoute") return;
    const debut = Date.now();
    const tic = setInterval(() => {
      const ecoule = Date.now() - debut;
      setDureeMs(ecoule);
      if (ecoule >= LIMITE_MS) terminerRef.current();
    }, 250);
    return () => clearInterval(tic);
    // Dépend du nom seul : chaque mot entendu change l'état, pas l'écoute.
  }, [etat.nom]);

  // Quitter l'écran micro ouvert : on coupe, sans rien garder.
  useEffect(
    () => () => {
      if (modeDe(etatRef.current) === "appareil") ExpoSpeechRecognitionModule.abort();
    },
    [],
  );

  return {
    etat,
    ouverte: etat.nom !== "repos",
    ecoute: etat.nom === "ecoute",
    attente:
      etat.nom === "demarrage" || etat.nom === "cloture" || etat.nom === "transcription",
    mode: modeDe(etat),
    confirme: etat.nom === "ecoute" || etat.nom === "cloture" ? etat.confirme : "",
    partiel: etat.nom === "ecoute" || etat.nom === "cloture" ? etat.partiel : "",
    dureeMs,
    niveau,
    probleme,
    oublierProbleme,
    demarrer,
    terminer,
    annuler,
  };
}
