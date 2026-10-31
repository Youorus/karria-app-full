/**
 * L'écran « Parler à l'équipe » : le fil, le direct, et les trois façons
 * d'écrire (texte, vocal, image).
 *
 * ═══ Quand on relit ═══
 *
 * À chaque fois que l'écran redevient actif — ouverture, retour au premier
 * plan —, on relit le fil entier puis on pose la lecture. C'est le **repli**
 * du direct : si le flux était tombé pendant que le téléphone dormait, ce
 * qui est arrivé entre-temps est là, et les URL signées des pièces sont
 * neuves. Le flux s'ouvre ensuite depuis le dernier message relu.
 *
 * ═══ Les envois ═══
 *
 * Chaque envoi apparaît tout de suite dans le fil, estompé, puis prend sa
 * place définitive à la réponse du serveur. En échec, il reste, avec la
 * raison et « Réessayer » : un vocal de deux minutes ne se perd pas sur une
 * coupure de métro. Le fichier local est gardé jusqu'au succès.
 */

import { useIsFocused, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { usePorte } from "@/features/auth/hooks/use-porte";
import { ErreurApi } from "@/lib/http";

import { ecrireTexte, envoyerFichier, lireFil, marquerLu } from "../api/equipe.api";
import {
  dernierInstant,
  fusionner,
  lignesDuFil,
  problemeEnvoi,
  texteAEnvoyer,
  type LigneFil,
} from "../services/fil";
import { signalerEcranEquipe } from "../services/presence";
import type { EnvoiLocal, FichierAEnvoyer, MessageEquipe } from "../types/equipe.types";
import { useDirectEquipe, type EtatDirect } from "./use-direct-equipe";
import { useImageEquipe } from "./use-image-equipe";
import { useLecteurVocal, type LecteurVocal } from "./use-lecteur-vocal";
import { useVocal, type Vocal } from "./use-vocal";

export interface EcranEquipe {
  chargement: "chargement" | "pret" | "erreur";
  /** Le message d'une lecture en échec, quand rien n'est encore affiché. */
  erreur: string | null;
  recharger: () => void;
  /** Du plus récent au plus ancien : la liste est inversée (le bas d'abord). */
  lignes: LigneFil[];
  vide: boolean;
  direct: EtatDirect;
  texte: string;
  changerTexte: (texte: string) => void;
  peutEnvoyer: boolean;
  envoyerTexte: () => void;
  reessayer: (cle: string) => void;
  abandonner: (cle: string) => void;
  vocal: Vocal;
  envoyerVocal: () => void;
  annulerVocal: () => void;
  lecteur: LecteurVocal;
  /** L'image choisie, en attente de confirmation. */
  apercu: FichierAEnvoyer | null;
  choisirImage: (source: "camera" | "galerie") => void;
  confirmerImage: () => void;
  renoncerImage: () => void;
  /** Le dernier problème de micro ou d'image, à montrer sous le compositeur. */
  probleme: string | null;
  retour: () => void;
}

function cleLocale(): string {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useEcranEquipe(): EcranEquipe {
  const router = useRouter();
  const { invite } = usePorte();
  const auPremierPlan = useIsFocused();
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const abonnement = AppState.addEventListener("change", (etat) =>
      setAppActive(etat === "active"),
    );
    return () => abonnement.remove();
  }, []);
  const actif = auPremierPlan && appActive && !invite;

  const [messages, setMessages] = useState<MessageEquipe[]>([]);
  const [envois, setEnvois] = useState<EnvoiLocal[]>([]);
  const [chargement, setChargement] = useState<EcranEquipe["chargement"]>("chargement");
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [apercu, setApercu] = useState<FichierAEnvoyer | null>(null);
  const [maintenant, setMaintenant] = useState(() => new Date());
  const [relecture, setRelecture] = useState(0);
  /** Les fichiers locaux des envois, gardés jusqu'au succès. */
  const fichiers = useRef(new Map<string, FichierAEnvoyer>());

  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const recevoir = useCallback((nouveaux: readonly MessageEquipe[]) => {
    setMessages((existants) => fusionner(existants, nouveaux));
    setMaintenant(new Date());
  }, []);

  // ── Présence : la bannière d'une notification `support` se tait ici ──
  useEffect(() => {
    signalerEcranEquipe(actif);
    return () => signalerEcranEquipe(false);
  }, [actif]);

  // ── La relecture, à chaque retour sous les yeux ──
  // Le direct n'attend que la **première** lecture (sinon son `since` serait
  // vide et il ne rattraperait rien) ; aux retours suivants, il rouvre en
  // même temps que la relecture, depuis le dernier message déjà affiché, et
  // la fusion par identifiant absorbe ce que les deux livrent en double.
  const [dejaLu, setDejaLu] = useState(false);
  useEffect(() => {
    if (!actif) return undefined;
    let vivant = true;
    lireFil().then(
      (fil) => {
        if (!vivant) return;
        recevoir(fil.messages);
        setChargement("pret");
        setErreur(null);
        setDejaLu(true);
        marquerLu().catch((cause: unknown) =>
          console.warn("[karria] lecture du fil de l'équipe non posée", cause),
        );
      },
      (cause: unknown) => {
        console.warn("[karria] fil de l'équipe illisible", cause);
        if (!vivant) return;
        // Ce qui est déjà affiché reste ; le direct rattrapera.
        if (messagesRef.current.length > 0) return;
        setChargement("erreur");
        setErreur(
          cause instanceof ErreurApi && cause.estReseau
            ? "Pas de réseau pour l'instant. Vérifie ta connexion, puis réessaie."
            : "Impossible d'ouvrir l'échange avec l'équipe pour le moment. Réessaie dans un instant.",
        );
      },
    );
    return () => {
      vivant = false;
    };
  }, [actif, recevoir, relecture]);

  const direct = useDirectEquipe(
    actif && dejaLu,
    useCallback(() => dernierInstant(messagesRef.current), []),
    useCallback((message: MessageEquipe) => recevoir([message]), [recevoir]),
  );

  // ── Les envois ──
  const expedier = useCallback(
    (cle: string, envoi: () => Promise<MessageEquipe>) => {
      setEnvois((liste) =>
        liste.map((e) => (e.cle === cle ? { ...e, etat: "envoi", probleme: null } : e)),
      );
      envoi().then(
        (message) => {
          fichiers.current.delete(cle);
          setEnvois((liste) => liste.filter((e) => e.cle !== cle));
          recevoir([message]);
        },
        (cause: unknown) => {
          console.warn("[karria] envoi à l'équipe en échec", cause);
          setEnvois((liste) =>
            liste.map((e) =>
              e.cle === cle ? { ...e, etat: "echec", probleme: problemeEnvoi(cause) } : e,
            ),
          );
        },
      );
    },
    [recevoir],
  );

  const envoyerTexte = useCallback(() => {
    const propre = texteAEnvoyer(texte);
    if (propre === null) return;
    const cle = cleLocale();
    setEnvois((liste) => [
      ...liste,
      {
        cle,
        sorte: "texte",
        texte: propre,
        uri: null,
        dureeMs: null,
        etat: "envoi",
        probleme: null,
      },
    ]);
    setTexte("");
    expedier(cle, () => ecrireTexte(propre));
  }, [texte, expedier]);

  const envoyerFichierLocal = useCallback(
    (fichier: FichierAEnvoyer) => {
      const cle = cleLocale();
      fichiers.current.set(cle, fichier);
      setEnvois((liste) => [
        ...liste,
        {
          cle,
          sorte: fichier.dureeMs === null ? "image" : "vocal",
          texte: null,
          uri: fichier.uri,
          dureeMs: fichier.dureeMs,
          etat: "envoi",
          probleme: null,
        },
      ]);
      expedier(cle, () => envoyerFichier(fichier));
    },
    [expedier],
  );

  const reessayer = useCallback(
    (cle: string) => {
      const envoi = envois.find((e) => e.cle === cle);
      if (envoi === undefined || envoi.etat !== "echec") return;
      const fichier = fichiers.current.get(cle);
      if (fichier !== undefined) {
        expedier(cle, () => envoyerFichier(fichier));
      } else if (envoi.texte !== null) {
        const propre = envoi.texte;
        expedier(cle, () => ecrireTexte(propre));
      }
    },
    [envois, expedier],
  );

  const abandonner = useCallback((cle: string) => {
    fichiers.current.delete(cle);
    setEnvois((liste) => liste.filter((e) => e.cle !== cle));
  }, []);

  // ── Le vocal ──
  const vocal = useVocal(
    useCallback(
      (fichier: FichierAEnvoyer | null) => {
        if (fichier !== null) envoyerFichierLocal(fichier);
      },
      [envoyerFichierLocal],
    ),
  );
  const lecteur = useLecteurVocal();
  const { terminer, annuler } = vocal;
  const { arreter: arreterLecture } = lecteur;

  const envoyerVocal = useCallback(() => {
    void terminer().then((fichier) => {
      if (fichier !== null) envoyerFichierLocal(fichier);
    });
  }, [terminer, envoyerFichierLocal]);

  // Quitter l'écran en plein enregistrement le jette ; et coupe la lecture.
  // L'enregistrement est lu par une référence : on le regarde au moment où
  // l'écran devient inactif, on ne réagit pas à chacun de ses changements.
  const enregistreRef = useRef(false);
  useEffect(() => {
    enregistreRef.current = vocal.enregistre;
  }, [vocal.enregistre]);
  useEffect(() => {
    if (actif) return;
    if (enregistreRef.current) void annuler();
    arreterLecture();
  }, [actif, annuler, arreterLecture]);

  // ── L'image ──
  const image = useImageEquipe();
  const { choisir } = image;
  const choisirImage = useCallback(
    (source: "camera" | "galerie") => {
      void choisir(source).then((fichier) => {
        if (fichier !== null) setApercu(fichier);
      });
    },
    [choisir],
  );
  const confirmerImage = useCallback(() => {
    if (apercu === null) return;
    envoyerFichierLocal(apercu);
    setApercu(null);
  }, [apercu, envoyerFichierLocal]);

  const lignes = useMemo(
    () => lignesDuFil(messages, envois, maintenant).reverse(),
    [messages, envois, maintenant],
  );

  return {
    chargement,
    erreur,
    recharger: useCallback(() => {
      setChargement("chargement");
      setRelecture((n) => n + 1);
    }, []),
    lignes,
    vide: messages.length === 0 && envois.length === 0,
    direct,
    texte,
    changerTexte: setTexte,
    peutEnvoyer: texteAEnvoyer(texte) !== null,
    envoyerTexte,
    reessayer,
    abandonner,
    vocal,
    envoyerVocal,
    annulerVocal: useCallback(() => void annuler(), [annuler]),
    lecteur,
    apercu,
    choisirImage,
    confirmerImage,
    renoncerImage: useCallback(() => setApercu(null), []),
    probleme: vocal.probleme ?? image.probleme,
    retour: useCallback(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/profil");
    }, [router]),
  };
}
