/**
 * Le fil des offres : chargement, pagination, filtres, et ce que le
 * serveur en dit (toutes les offres, ou une recherche).
 *
 * ═══ Le comportement de la V1, gardé ═══
 *
 * - « tirer pour actualiser » recharge depuis le début ;
 * - arrivé en bas, la page suivante se charge seule (défilement infini) ;
 * - changer un filtre recharge depuis le début.
 *
 * ═══ Deux modes, décidés par le serveur ═══
 *
 * Sans recherche, le fil montre **toutes** les offres actives, les plus
 * récentes d'abord. Dès que Karria a compris une demande, il passe en
 * mode recherche : les offres retenues, par pertinence, et
 * `resumeRecherche` dit laquelle. Le fil ne décide rien : il affiche le
 * `mode` reçu (`docs/contrat-api-offres.md`).
 *
 * ═══ Les offres vues partent par lots ═══
 *
 * Chaque carte qui passe à l'écran est notée ; les identifiants partent
 * toutes les deux secondes, en un seul appel, jamais à la carte : c'est
 * ce qui fait tomber « Nouvelle » et alimente « Non vues ».
 *
 * ═══ Une seule requête à la fois ═══
 *
 * `jeton` numérote chaque chargement. Une réponse arrivée après un
 * nouveau chargement — filtre changé pendant l'attente — est ignorée :
 * sans cela, l'ancienne liste écraserait la nouvelle.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { oublierRecherche } from "@/features/assistant/api/recherche.api";
import { ErreurApi } from "@/lib/http";
import {
  garderOffre,
  lireFil,
  lireOptionsDeFiltre,
  marquerVues,
} from "../api/offres.api";
import {
  FILTRES_PAR_DEFAUT,
  type Filtres,
  type ModeDuFil,
  type Offre,
  type OptionsDeFiltre,
} from "../types/offres.types";
import { memoriser } from "./memoire-offres";

/** Le délai avant d'envoyer les offres vues : assez pour grouper un
 *  défilement, assez court pour qu'une fermeture n'en perde presque rien. */
const DELAI_VUES_MS = 2_000;

export interface FilOffres {
  offres: Offre[];
  total: number;
  mode: ModeDuFil;
  resumeRecherche: string | null;
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
  /** Des cartes sont passées à l'écran. */
  signalerVisibles: (ids: string[]) => void;
  /** Karria vient de lancer une recherche : le fil se recharge. */
  rechargerApresRecherche: () => void;
  /** Oublie la recherche : le fil redevient « toutes les offres ». */
  oublierLaRecherche: () => void;
}

function messageDErreur(cause: unknown): string {
  return cause instanceof ErreurApi && cause.estReseau
    ? "Pas de connexion. Tes offres reviendront dès que le réseau sera là."
    : "Tes offres n'ont pas pu être chargées. Réessaie dans un instant.";
}

export function useFilOffres(): FilOffres {
  const [offres, setOffres] = useState<Offre[]>([]);
  const [total, setTotal] = useState(0);
  const [mode, setMode] = useState<ModeDuFil>("toutes");
  const [resumeRecherche, setResumeRecherche] = useState<string | null>(null);
  const [suivantes, setSuivantes] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [chargementSuite, setChargementSuite] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtres, setFiltres] = useState<Filtres>(FILTRES_PAR_DEFAUT);
  const [options, setOptions] = useState<OptionsDeFiltre>({ contrats: [], villes: [] });
  const jeton = useRef(0);
  // Les offres vues et pas encore envoyées, et celles déjà envoyées (pour
  // ne pas renvoyer dix fois la même en remontant le fil).
  const aEnvoyer = useRef(new Set<string>());
  const envoyees = useRef(new Set<string>());
  const minuteurVues = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setMode(fil.mode);
        setResumeRecherche(fil.resumeRecherche);
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

  const chargerOptions = useCallback(() => {
    lireOptionsDeFiltre().then(setOptions, (cause: unknown) =>
      // Sans options, la feuille de filtres n'offre que la période et
      // l'affichage : dégradé, pas cassé.
      console.warn("[karria] options de filtre indisponibles", cause),
    );
  }, []);

  useEffect(() => {
    void chargerDebut(filtres).finally(() => setChargement(false));
  }, [chargerDebut, filtres]);

  useEffect(chargerOptions, [chargerOptions]);

  const envoyerLesVues = useCallback(() => {
    minuteurVues.current = null;
    const ids = [...aEnvoyer.current];
    aEnvoyer.current.clear();
    if (ids.length === 0) return;
    for (const id of ids) envoyees.current.add(id);
    marquerVues(ids).catch((cause: unknown) => {
      console.warn("[karria] offres vues non notées", cause);
      // Elles repartiront avec le prochain lot.
      for (const id of ids) {
        envoyees.current.delete(id);
        aEnvoyer.current.add(id);
      }
    });
  }, []);

  const signalerVisibles = useCallback(
    (ids: string[]) => {
      for (const id of ids) {
        if (!envoyees.current.has(id)) aEnvoyer.current.add(id);
      }
      if (aEnvoyer.current.size === 0 || minuteurVues.current !== null) return;
      minuteurVues.current = setTimeout(envoyerLesVues, DELAI_VUES_MS);
    },
    [envoyerLesVues],
  );

  // Ce qui reste à envoyer part quand l'écran se démonte.
  useEffect(
    () => () => {
      if (minuteurVues.current !== null) clearTimeout(minuteurVues.current);
      envoyerLesVues();
    },
    [envoyerLesVues],
  );

  const actualiser = useCallback(() => {
    setActualisation(true);
    void chargerDebut(filtres).finally(() => setActualisation(false));
    chargerOptions();
  }, [chargerDebut, chargerOptions, filtres]);

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

  const remplacer = useCallback((id: string, modif: Partial<Offre>) => {
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

  // Une recherche change tout le fil : on repart de zéro, filtres
  // compris — ceux de l'ancien fil (une ville, un contrat) n'ont plus de
  // sens sur le nouveau.
  const rechargerApresRecherche = useCallback(() => {
    setChargement(true);
    setFiltres((anciens) =>
      anciens === FILTRES_PAR_DEFAUT ? { ...anciens } : FILTRES_PAR_DEFAUT,
    );
    chargerOptions();
  }, [chargerOptions]);

  const oublierLaRecherche = useCallback(() => {
    setChargement(true);
    oublierRecherche()
      .catch((cause: unknown) => console.warn("[karria] recherche non oubliée", cause))
      .finally(rechargerApresRecherche);
  }, [rechargerApresRecherche]);

  return {
    offres,
    total,
    mode,
    resumeRecherche,
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
    signalerVisibles,
    rechargerApresRecherche,
    oublierLaRecherche,
  };
}
