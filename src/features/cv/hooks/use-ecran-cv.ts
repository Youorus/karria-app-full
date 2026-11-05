/**
 * L'onglet CV : le CV s'il existe, l'invitation à l'apporter sinon.
 *
 * Relu à chaque retour sur l'onglet : on revient de l'import ou d'une
 * modification avec un CV changé, il doit être là sans geste de plus.
 *
 * ═══ Importer ouvre un écran ═══
 *
 * « Photographier », « PDF ou Word », « Mes photos » mènent à
 * `/cv/importer?source=…` : c'est cet écran qui ouvre le sélecteur, lit,
 * raconte et revient ici. L'onglet ne fait que router — et, après
 * l'import, mettre en avant ce qui reste à vérifier (`useVerification`).
 *
 * ═══ Sans compte ═══
 *
 * L'invitation s'affiche telle quelle — on voit ce qu'on va obtenir — mais
 * créer ou importer passe par la porte (`usePorte`) : la feuille de
 * connexion monte, et le geste reprend une fois connecté (`useReprise`).
 * Rien n'est lu sur le serveur tant qu'il n'y a pas de session.
 */

import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnonceEmplacement } from "@/features/publicite/hooks/use-annonce-emplacement";
import { ErreurApi } from "@/lib/http";

import { lireBrouillon, lireMonCv } from "../api/cv.api";
import {
  effacerVerification,
  manquantsDuCv,
  useVerification,
} from "../services/verification";
import type { ChampManquant, CleChapitre, Cv } from "../types/cv.types";
import type { SourceImport } from "./use-choix-fichiers";

export interface EcranCv {
  cv: Cv | null;
  /** Un CV commencé avec Karria et pas encore fini : on propose de le reprendre. */
  brouillonEnCours: boolean;
  chargement: boolean;
  erreur: string | null;
  creer: () => void;
  importer: (source: SourceImport) => void;
  modifier: (section: CleChapitre) => void;
  /** L'en-tête : « Mes CV », les CV déjà mis en page (`/cv/mes-cv`). */
  ouvrirMesCv: () => void;
  /** Le « + » de l'en-tête : un nouveau CV. Avec un CV, l'atelier libre
   *  (`/atelier/libre`) ; sans CV, le créer d'abord (`/cv/creer`). */
  nouveauCv: () => void;
  /** Après un import : les sections à relire, coordonnées d'abord. */
  aVerifier: readonly CleChapitre[];
  importRecent: boolean;
  /** Ce qui manque au CV, calculé depuis le CV lui-même. */
  manquants: ChampManquant[];
  /** « C'est bon » : on n'insiste plus sur la vérification. */
  terminerVerification: () => void;
  recharger: () => void;
  /** Une annonce native **sous** les sections du CV rempli (`features/publicite`),
   *  jamais au-dessus d'un geste ; rien sans CV, sans pub, ou sans annonce. */
  annonce: NativeAd | null;
}

const SOURCES: readonly SourceImport[] = ["camera", "galerie", "fichier"];

export function useEcranCv(): EcranCv {
  const router = useRouter();
  const { exiger, invite } = usePorte();
  const [cv, setCv] = useState<Cv | null>(null);
  const [brouillonEnCours, setBrouillonEnCours] = useState(false);
  const [chargement, setChargement] = useState(!invite);
  const [erreur, setErreur] = useState<string | null>(null);
  const verification = useVerification();

  // Une seule fonction de lecture, pour le retour sur l'onglet comme pour
  // « Réessayer ». Elle rend de quoi ignorer une réponse arrivée trop tard.
  const charger = useCallback(() => {
    if (invite) {
      setChargement(false);
      return () => undefined;
    }
    let vivant = true;
    Promise.all([lireMonCv(), lireBrouillon()])
      .then(([lu, brouillon]) => {
        if (!vivant) return;
        setCv(lu);
        setBrouillonEnCours(brouillon !== null);
        setErreur(null);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] CV illisible", cause);
        if (vivant) {
          setErreur(
            cause instanceof ErreurApi && cause.estReseau
              ? "Pas de connexion. Ton CV revient dès que le réseau est là."
              : "Ton CV n'a pas pu être chargé.",
          );
        }
      })
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, [invite]);

  useFocusEffect(charger);

  const ouvrirImport = useCallback(
    (source: SourceImport) =>
      router.push({ pathname: "/cv/importer", params: { source } }),
    [router],
  );
  const creer = useCallback(() => {
    if (exiger("cv", { cle: "cv.creer" })) router.push("/cv/creer");
  }, [exiger, router]);
  const importer = useCallback(
    (source: SourceImport) => {
      if (exiger("cv", { cle: "cv.importer", charge: source })) ouvrirImport(source);
    },
    [exiger, ouvrirImport],
  );
  const modifier = useCallback(
    (section: CleChapitre) =>
      router.push({ pathname: "/cv/modifier/[section]", params: { section } }),
    [router],
  );
  const ouvrirMesCv = useCallback(() => {
    if (exiger("cv", { cle: "cv.mes-cv" })) router.push("/cv/mes-cv");
  }, [exiger, router]);
  const rempli = cv !== null && !cv.vide;
  const nouveauCv = useCallback(() => {
    if (!rempli) {
      creer();
      return;
    }
    if (exiger("cv", { cle: "cv.nouveau" })) router.push("/atelier/libre");
  }, [rempli, creer, exiger, router]);
  useReprise("cv.creer", () => router.push("/cv/creer"));
  useReprise("cv.mes-cv", () => router.push("/cv/mes-cv"));
  useReprise("cv.nouveau", () => router.push("/atelier/libre"));
  useReprise("cv.importer", (charge) =>
    ouvrirImport(SOURCES.find((s) => s === charge) ?? "fichier"),
  );
  const annonce = useAnnonceEmplacement("cv", cv !== null && !cv.vide);

  return {
    cv,
    brouillonEnCours,
    chargement,
    erreur,
    creer,
    importer,
    modifier,
    ouvrirMesCv,
    nouveauCv,
    aVerifier: verification.aVerifier,
    importRecent: verification.importRecent,
    manquants: cv === null || cv.vide ? [] : manquantsDuCv(cv),
    terminerVerification: effacerVerification,
    annonce,
    recharger: () => {
      setChargement(true);
      charger();
    },
  };
}
