/**
 * L'état de la carte de soutien : le catalogue, mes droits, et les trois
 * gestes — passer sans pub, offrir un café, gérer mon abonnement.
 *
 * ═══ Pourquoi l'issue ne vient jamais du navigateur ═══
 *
 * Comme Zoumani (`use-abonnement.ts`) : la page de paiement s'ouvre dans une
 * session d'authentification du navigateur (`openAuthSessionAsync`), que la
 * page de retour de l'API referme en renvoyant vers `karria://`. Quelle que
 * soit l'issue rendue par le navigateur, on **relit le serveur** jusqu'à ce
 * qu'il dise « livré » (`services/attente.ts`). Se fier au retour marquerait
 * payés des cafés qui ne le sont pas.
 *
 * ═══ Ce qu'il décide ═══
 *
 * - `catalogue` et `facturation` valent `null` tant qu'on ne sait pas : la
 *   carte montre un squelette plutôt qu'un prix qui clignoterait.
 * - Deux tasses sont choisies d'office : le milieu, ni radin ni pressant.
 * - Le merci reste jusqu'à « En offrir un autre ».
 * - Dès que la facturation est lue, le drapeau « sans pub » de toute
 *   l'application est recopié (`lib/sans-pub.ts`) : la publicité s'arrête.
 * - En simulation (faux serveur), il n'y a pas de page Stripe à ouvrir : le
 *   faux serveur livre à l'ouverture, et l'on passe droit à la relecture.
 *
 * ═══ Relu au focus ═══
 *
 * Un abonnement change hors de l'app (portail, prélèvement, résiliation) :
 * on relit à chaque retour sur le profil.
 */

import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

import { SIMULATION } from "@/lib/config";
import { ErreurApi } from "@/lib/http";
import { poserSansPub } from "@/lib/sans-pub";

import {
  lireCatalogue,
  lireFacturation,
  lireStatut,
  ouvrirAbonnement,
  ouvrirCafe,
  ouvrirPortail,
  RETOUR,
} from "../api/soutien.api";
import { attendreLaLivraison } from "../services/attente";
import { TEXTES } from "../services/presentation";
import type {
  Catalogue,
  Facturation,
  OffreDeCafe,
  SessionPaiement,
  Tasses,
} from "../types/soutien.types";

/** Ce que le hook est en train de faire pour la personne. */
export type PhaseSoutien =
  | "repos"
  /** La page de paiement s'ouvre, ou est ouverte. */
  | "paiement"
  /** La page est refermée ; on attend que Stripe prévienne le serveur. */
  | "confirmation"
  /** Le portail s'ouvre, ou est ouvert. */
  | "portail";

export interface Soutien {
  catalogue: Catalogue | null;
  facturation: Facturation | null;
  /** Faux : l'interrupteur du serveur est éteint pour cette plateforme. */
  actif: boolean;
  choix: Tasses;
  offreChoisie: OffreDeCafe | null;
  phase: PhaseSoutien;
  /** Vrai le temps que le paiement en cours soit un café (pour le bouton). */
  cafeEnCours: boolean;
  merci: boolean;
  erreur: string | null;
  choisir: (tasses: Tasses) => void;
  passerSansPub: () => void;
  offrir: () => void;
  gerer: () => void;
  recommencer: () => void;
  effacerErreur: () => void;
}

function message(cause: unknown, repli: string, contexte: string): string {
  console.warn(`[karria] ${contexte}`, cause);
  return cause instanceof ErreurApi ? cause.message : repli;
}

/** Ouvre la page Stripe et attend qu'on en revienne. En simulation, rien à ouvrir. */
async function ouvrirDansLeNavigateur(session: SessionPaiement): Promise<void> {
  if (SIMULATION) return;
  await WebBrowser.openAuthSessionAsync(session.adresse, RETOUR);
}

/**
 * `actif` à faux (un invité) : rien n'est lu — le catalogue et les droits
 * sont ceux d'un compte, et le serveur refuserait.
 */
export function useSoutien(actif = true): Soutien {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [facturation, setFacturation] = useState<Facturation | null>(null);
  const [choix, setChoix] = useState<Tasses>(2);
  const [phase, setPhase] = useState<PhaseSoutien>("repos");
  const [cafeEnCours, setCafeEnCours] = useState(false);
  const [merci, setMerci] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Un verrou synchrone en plus de `phase` : deux appuis dans la même image
  // partent avant que l'état ne soit relu, et ouvriraient deux sessions.
  const enVol = useRef(false);

  const relireFacturation = useCallback(async (): Promise<Facturation | null> => {
    try {
      const lue = await lireFacturation(Platform.OS);
      setFacturation(lue);
      poserSansPub(lue.sansPub.actif);
      return lue;
    } catch (cause) {
      console.warn("[karria] droits illisibles", cause);
      return null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!actif) return undefined;
      let vivant = true;
      lireCatalogue(Platform.OS).then(
        (lu) => {
          if (vivant) setCatalogue(lu);
        },
        (cause: unknown) =>
          console.warn("[karria] catalogue du soutien illisible", cause),
      );
      void lireFacturation(Platform.OS).then(
        (lue) => {
          if (!vivant) return;
          setFacturation(lue);
          poserSansPub(lue.sansPub.actif);
        },
        (cause: unknown) => console.warn("[karria] droits illisibles", cause),
      );
      return () => {
        vivant = false;
      };
    }, [actif]),
  );

  const offreChoisie = catalogue?.cafes.find((c) => c.tasses === choix) ?? null;

  const payer = useCallback(
    async (
      ouvrir: () => Promise<SessionPaiement>,
      livre: (statut: { livre: boolean }, facturation: Facturation | null) => boolean,
      apres: () => void,
    ) => {
      if (enVol.current) return;
      enVol.current = true;
      setErreur(null);
      setPhase("paiement");
      try {
        const session = await ouvrir();
        await ouvrirDansLeNavigateur(session);
        setPhase("confirmation");
        const issue = await attendreLaLivraison(async () => {
          const [statut, lue] = await Promise.all([
            lireStatut(session.id),
            relireFacturation(),
          ]);
          return livre(statut, lue);
        });
        if (issue === "livre") apres();
        else if (issue === "en_attente") setErreur(TEXTES.nonConfirme);
        else setErreur(TEXTES.nonConfirme);
      } catch (cause) {
        setErreur(
          message(cause, TEXTES.erreurOuverture, "ouverture du paiement échouée"),
        );
        // Déjà abonné ailleurs (un autre téléphone) : l'état vrai est au serveur.
        if (
          cause instanceof ErreurApi &&
          cause.raison === "subscription_already_active"
        ) {
          void relireFacturation();
        }
      } finally {
        enVol.current = false;
        setPhase("repos");
        setCafeEnCours(false);
      }
    },
    [relireFacturation],
  );

  const passerSansPub = useCallback(() => {
    void payer(
      ouvrirAbonnement,
      (statut, lue) => statut.livre || lue?.sansPub.actif === true,
      () => undefined,
    );
  }, [payer]);

  const offrir = useCallback(() => {
    if (offreChoisie === null) return;
    const tasses = offreChoisie.tasses;
    setCafeEnCours(true);
    void payer(
      () => ouvrirCafe(tasses),
      (statut) => statut.livre,
      () => setMerci(true),
    );
  }, [payer, offreChoisie]);

  const gerer = useCallback(async () => {
    if (enVol.current) return;
    enVol.current = true;
    setErreur(null);
    setPhase("portail");
    try {
      const adresse = await ouvrirPortail();
      if (!SIMULATION) await WebBrowser.openAuthSessionAsync(adresse, RETOUR);
      // Carte changée, résiliation : ce qui a été fait là-bas se lit ici.
      await relireFacturation();
    } catch (cause) {
      setErreur(message(cause, TEXTES.erreurPortail, "ouverture du portail échouée"));
    } finally {
      enVol.current = false;
      setPhase("repos");
    }
  }, [relireFacturation]);

  return {
    catalogue,
    facturation,
    actif: (catalogue?.actif ?? facturation?.actif) === true,
    choix,
    offreChoisie,
    phase,
    cafeEnCours,
    merci,
    erreur,
    choisir: setChoix,
    passerSansPub,
    offrir,
    gerer: useCallback(() => void gerer(), [gerer]),
    recommencer: useCallback(() => setMerci(false), []),
    effacerErreur: useCallback(() => setErreur(null), []),
  };
}
