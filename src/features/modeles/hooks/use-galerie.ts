/**
 * La galerie des modèles : la liste, ceux qu'on possède, le filtre.
 *
 * Les deux lectures — les modèles et « les miens » — partent ensemble ;
 * la seconde peut échouer sans priver la galerie : on affiche alors les
 * modèles sans coche plutôt que pas de modèles du tout.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { ErreurApi } from "@/lib/http";
import { lireMesModeles, lireModeles } from "../api/modeles.api";
import {
  filtrer,
  memeFiltre,
  pucesDeLaGalerie,
  sousTitreGalerie,
  type Puce,
} from "../services/presentation";
import type { FiltreGalerie, Modele } from "../types/modeles.types";

/** Marges de la grille de la V1 : 16 de chaque côté, 12 entre colonnes. */
const MARGE = 16;
const ECART = 12;

export interface Galerie {
  modeles: Modele[];
  /** Largeur d'une carte : deux colonnes dans la largeur de l'écran. */
  largeurCarte: number;
  possedes: Set<number>;
  puces: (Puce & { active: boolean })[];
  choisirFiltre: (filtre: FiltreGalerie) => void;
  sousTitre: string;
  total: number;
  chargement: boolean;
  actualisation: boolean;
  erreur: string | null;
  actualiser: () => void;
}

function messageDErreur(cause: unknown): string {
  return cause instanceof ErreurApi && cause.estReseau
    ? "Pas de connexion. Les modèles reviendront dès que le réseau sera là."
    : "Les modèles n'ont pas pu être chargés. Réessaie dans un instant.";
}

export function useGalerie(): Galerie {
  const { width } = useWindowDimensions();
  const [tous, setTous] = useState<Modele[]>([]);
  const [possedes, setPossedes] = useState<Set<number>>(new Set());
  const [filtre, setFiltre] = useState<FiltreGalerie>({ type: "tous" });
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let vivant = true;
    Promise.all([
      lireModeles(),
      lireMesModeles().catch((cause: unknown) => {
        console.warn("[karria] modèles possédés indisponibles", cause);
        return new Set<number>();
      }),
    ])
      .then(
        ([modeles, miens]) => {
          if (!vivant) return;
          setTous(modeles);
          setPossedes(miens);
          setErreur(null);
        },
        (cause: unknown) => {
          console.warn("[karria] galerie indisponible", cause);
          if (vivant) setErreur(messageDErreur(cause));
        },
      )
      .finally(() => {
        if (!vivant) return;
        setChargement(false);
        setActualisation(false);
      });
    return () => {
      vivant = false;
    };
  }, [tentative]);

  const puces = useMemo(
    () =>
      pucesDeLaGalerie(tous).map((p) => ({ ...p, active: memeFiltre(p.filtre, filtre) })),
    [tous, filtre],
  );

  const actualiser = useCallback(() => {
    setActualisation(true);
    setTentative((t) => t + 1);
  }, []);

  return {
    modeles: useMemo(() => filtrer(tous, filtre), [tous, filtre]),
    largeurCarte: Math.floor((width - MARGE * 2 - ECART) / 2),
    possedes,
    puces,
    choisirFiltre: setFiltre,
    sousTitre: chargement ? "Chargement des modèles…" : sousTitreGalerie(tous.length),
    total: tous.length,
    chargement,
    actualisation,
    erreur,
    actualiser,
  };
}
