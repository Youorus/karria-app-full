/**
 * Le fil des offres : chargement, pagination, filtres.
 *
 * ═══ Le comportement de la V1, gardé ═══
 *
 * - « tirer pour actualiser » recharge depuis le début ;
 * - arrivé en bas, la page suivante se charge seule (défilement infini) ;
 * - changer un filtre recharge depuis le début.
 *
 * ═══ Les filtres viennent du fil ═══
 *
 * Les contrats et les villes proposés sont ceux que l'API trouve dans les
 * matchs de la personne (`filter-options`) : on ne propose jamais un
 * filtre qui donnerait une liste vide.
 *
 * ═══ Une seule requête à la fois ═══
 *
 * `jeton` numérote chaque chargement. Une réponse arrivée après un
 * nouveau chargement — filtre changé pendant l'attente — est ignorée :
 * sans cela, l'ancienne liste écraserait la nouvelle.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { ErreurApi } from "@/lib/http";
import { garderOffre, lireFil, lireOptionsDeFiltre } from "../api/offres.api";
import {
  FILTRES_PAR_DEFAUT,
  type Filtres,
  type Offre,
  type OptionsDeFiltre,
} from "../types/offres.types";
import { memoriser } from "./memoire-offres";

export interface FilOffres {
  offres: Offre[];
  total: number;
  chargement: boolean;
  actualisation: boolean;
  chargementSuite: boolean;
  erreur: string | null;
  filtres: Filtres;
  options: OptionsDeFiltre;
  actualiser: () => void;
  chargerLaSuite: () => void;
  appliquerFiltres: (filtres: Filtres) => void;
  /** Garde ou retire une offre, en optimiste comme la V1. */
  garder: (offre: Offre) => void;
  /** Le détail a été ouvert : retire le liseré de la carte. */
  marquerOuverte: (offre: Offre) => void;
}

function messageDErreur(cause: unknown): string {
  return cause instanceof ErreurApi && cause.estReseau
    ? "Pas de connexion. Tes offres reviendront dès que le réseau sera là."
    : "Tes offres n'ont pas pu être chargées. Réessaie dans un instant.";
}

export function useFilOffres(): FilOffres {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [total, setTotal] = useState(0);
  const [suivantes, setSuivantes] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [chargementSuite, setChargementSuite] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_PAR_DEFAUT);
  const [options, setOptions] = useState<OptionsDeFiltre>({ contrats: [], villes: [] });
  const jeton = useRef(0);

  /** Charge la première page pour ces filtres. Aucun `setState` avant la
   *  réponse : appelé depuis un effet, il ne déclenche pas de rendu en
   *  cascade. */
  const chargerDebut = useCallback((pour: Filtres) => {
    const numero = ++jeton.current;
    return lireFil(pour, 0).then(
      (fil) => {
        if (numero !== jeton.current) return;
        memoriser(fil.offres);
        setOffres(fil.offres);
        setTotal(fil.total);
        setSuivantes(fil.suivantes);
        setErreur(null);
      },
      (cause: unknown) => {
        if (numero !== jeton.current) return;
        console.warn("[karria] fil indisponible", cause);
        setErreur(messageDErreur(cause));
      },
    );
  }, []);

  useEffect(() => {
    void chargerDebut(filtres).finally(() => setChargement(false));
  }, [chargerDebut, filtres]);

  useEffect(() => {
    lireOptionsDeFiltre().then(setOptions, (cause: unknown) =>
      // Sans options, la feuille de filtres n'offre que le tri et la
      // période : dégradé, pas cassé.
      console.warn("[karria] options de filtre indisponibles", cause),
    );
  }, []);

  const actualiser = useCallback(() => {
    setActualisation(true);
    void chargerDebut(filtres).finally(() => setActualisation(false));
  }, [chargerDebut, filtres]);

  const chargerLaSuite = useCallback(() => {
    if (!suivantes || chargementSuite || chargement) return;
    const numero = jeton.current;
    setChargementSuite(true);
    lireFil(filtres, offres.length)
      .then((fil) => {
        if (numero !== jeton.current) return;
        memoriser(fil.offres);
        setOffres((avant) => [...avant, ...fil.offres]);
        setSuivantes(fil.suivantes);
      })
      .catch((cause: unknown) =>
        console.warn("[karria] page suivante indisponible", cause),
      )
      .finally(() => setChargementSuite(false));
  }, [suivantes, chargementSuite, chargement, filtres, offres.length]);

  const appliquerFiltres = useCallback((nouveaux: Filtres) => {
    setChargement(true);
    setFiltres(nouveaux);
  }, []);

  const remplacer = useCallback((id: number, modif: Partial<Offre>) => {
    setOffres((liste) => liste.map((o) => (o.id === id ? { ...o, ...modif } : o)));
  }, []);

  const garder = useCallback(
    (offre: Offre) => {
      // Optimiste : le signet bascule à l'instant. Si le serveur refuse, il
      // revient — et l'on journalise, sans interrompre le défilement.
      remplacer(offre.id, { enregistree: !offre.enregistree });
      garderOffre(offre.id, !offre.enregistree)
        .then((confirme) => remplacer(offre.id, { enregistree: confirme }))
        .catch((cause: unknown) => {
          console.warn("[karria] signet non enregistré", cause);
          remplacer(offre.id, { enregistree: offre.enregistree });
        });
    },
    [remplacer],
  );

  const marquerOuverte = useCallback(
    (offre: Offre) => remplacer(offre.id, { nonOuverte: false }),
    [remplacer],
  );

  return {
    offres,
    total,
    chargement,
    actualisation,
    chargementSuite,
    erreur,
    filtres,
    options,
    actualiser,
    chargerLaSuite,
    appliquerFiltres,
    garder,
    marquerOuverte,
  };
}
