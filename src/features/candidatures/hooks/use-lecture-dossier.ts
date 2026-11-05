/**
 * La lecture d'un document du dossier — le CV adapté ou la lettre — telle
 * que le détail vient de la laisser en mémoire.
 *
 * Le détail a déjà lu le dossier entier (`memoire-dossiers.ts`) : l'écran
 * s'ouvre sans attente. S'il n'y est pas (lien direct, redémarrage à
 * chaud), on le relit. Rien ne se modifie ici : les retouches sont
 * l'affaire de l'atelier.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { ErreurApi } from "@/lib/http";
import { useNavigationUnique } from "@/lib/navigation";

import { lireDossier } from "../api/candidatures.api";
import { dossierMemorise, memoriserDossier } from "../services/memoire-dossiers";
import { TEXTES } from "../services/presentation";
import type { Dossier } from "../types/candidatures.types";
import type { DocumentDuDossier } from "./use-dossier";

export interface LectureDossier {
  dossier: Dossier | null;
  document: DocumentDuDossier;
  chargement: boolean;
  erreur: string | null;
  retour: () => void;
}

export function useLectureDossier(): LectureDossier {
  const { id, document } = useLocalSearchParams<{ id: string; document?: string }>();
  const router = useRouter();
  const { remplacer } = useNavigationUnique();
  const [dossier, setDossier] = useState<Dossier | null>(() => dossierMemorise(id));
  const [chargement, setChargement] = useState(dossier === null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (dossier !== null) return undefined;
    let vivant = true;
    lireDossier(id)
      .then((lu) => {
        if (!vivant) return;
        memoriserDossier(lu);
        setDossier(lu);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] dossier illisible", cause);
        if (vivant) {
          setErreur(
            cause instanceof ErreurApi && cause.statut === 404
              ? TEXTES.dossierIntrouvable
              : TEXTES.erreurDetail,
          );
        }
      })
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
  }, [id, dossier]);

  return {
    dossier,
    document: document === "lettre" ? "lettre" : "cv",
    chargement,
    erreur,
    retour: useCallback(() => {
      if (router.canGoBack()) router.back();
      else remplacer({ pathname: "/candidatures/[id]", params: { id } });
    }, [router, remplacer, id]),
  };
}
