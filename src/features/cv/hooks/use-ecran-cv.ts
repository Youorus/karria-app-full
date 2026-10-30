/**
 * L'onglet CV : le CV s'il existe, l'invitation à le créer sinon.
 *
 * Relu à chaque retour sur l'onglet : on revient de la création avec un
 * CV tout neuf, il doit être là sans geste de plus.
 *
 * « J'ai déjà un CV » importe un fichier puis ouvre le parcours de
 * création : c'est là que les propositions tirées du document se
 * valident, une à une — le même écran que la création en parlant.
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
import { ErreurApi } from "@/lib/http";
import { lireBrouillon, lireMonCv } from "../api/cv.api";
import type { Cv } from "../types/cv.types";
import { useImportCv } from "./use-import-cv";

export interface EcranCv {
  cv: Cv | null;
  /** Un CV commencé avec Karria et pas encore fini : on propose de le reprendre. */
  brouillonEnCours: boolean;
  chargement: boolean;
  erreur: string | null;
  creer: () => void;
  /** « J'ai déjà un CV » : choisir un fichier, puis ouvrir le parcours. */
  importer: () => void;
  importation: boolean;
  problemeImport: string | null;
  recharger: () => void;
}

export function useEcranCv(): EcranCv {
  const router = useRouter();
  const { exiger, invite } = usePorte();
  const [cv, setCv] = useState<Cv | null>(null);
  const [brouillonEnCours, setBrouillonEnCours] = useState(false);
  const [chargement, setChargement] = useState(!invite);
  const [erreur, setErreur] = useState<string | null>(null);
  const importCv = useImportCv(() => router.push("/cv/creer"));
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

  const creer = useCallback(() => {
    if (exiger("cv", { cle: "cv.creer" })) router.push("/cv/creer");
  }, [exiger, router]);
  const importer = useCallback(() => {
    if (exiger("cv", { cle: "cv.importer" })) importCv.importer();
  }, [exiger, importCv]);
  useReprise("cv.creer", () => router.push("/cv/creer"));
  useReprise("cv.importer", () => importCv.importer());

  return {
    cv,
    brouillonEnCours,
    chargement,
    erreur,
    creer,
    importer,
    importation: importCv.enCours,
    problemeImport: importCv.probleme,
    recharger: () => {
      setChargement(true);
      charger();
    },
  };
}
