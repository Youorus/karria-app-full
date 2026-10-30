/**
 * La galerie des modèles : la liste, ceux qu'on possède, le filtre.
 *
 * Les deux lectures — les modèles et « les miens » — partent ensemble ;
 * la seconde peut échouer sans priver la galerie : on affiche alors les
 * modèles sans coche plutôt que pas de modèles du tout.
 *
 * Sans compte, la galerie se lit telle quelle (le serveur la sert sans
 * session) ; « les miens » n'existe pas, on ne le demande pas.
 *
 * Un lien peut ouvrir la galerie sur une catégorie
 * (`karria://modeles?categorie=étudiant`) : une notification « de nouveaux
 * modèles pour ton premier emploi » mène droit à eux.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useWindowDimensions } from "react-native";

import { usePorte } from "@/features/auth/hooks/use-porte";
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
  possedes: Set<string>;
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
  const { invite } = usePorte();
  const [tous, setTous] = useState<Modele[]>([]);
  const [possedes, setPossedes] = useState<Set<string>>(new Set());
  const { categorie } = useLocalSearchParams<{ categorie?: string }>();
  const [filtre, setFiltre] = useState<FiltreGalerie>(
    categorie ? { type: "categorie", valeur: categorie } : { type: "tous" },
  );
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tentative, setTentative] = useState(0);

  useEffect(() => {
    let vivant = true;
    Promise.all([
      lireModeles(),
      invite
        ? Promise.resolve(new Set<string>())
        : lireMesModeles().catch((cause: unknown) => {
            console.warn("[karria] modèles possédés indisponibles", cause);
            return new Set<string>();
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
  }, [tentative, invite]);

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
