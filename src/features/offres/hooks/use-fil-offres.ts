/**
 * Le fil des offres : chargement, pagination, filtres, et ce que le
 * serveur en dit (toutes les offres, ou une recherche).
 *
 * ═══ Le comportement de la V1, gardé ═══
 *
 * - « tirer pour actualiser » recharge depuis le début ;
 * - arrivé en bas, la page suivante se charge seule (défilement infini) ;
 * - changer un filtre ou le tri recharge depuis le début.
 *
 * ═══ Deux modes, décidés par le serveur ═══
 *
 * Sans recherche, le fil montre **toutes** les offres actives, les plus
 * récentes d'abord. Dès que Karria a compris une demande, il passe en
 * mode recherche : les offres retenues, par pertinence, et
 * `resumeRecherche` dit laquelle. Le fil ne décide rien : il affiche le
 * `mode` reçu (`docs/contrat-api-offres.md`).
 *
 * ═══ Deux vues, choisies par la personne ═══
 *
 * « Ma recherche » et « Toutes les offres ». Changer de vue ne change que
 * le paramètre `mode` du fil (`all_offers` / `search`) : la recherche reste
 * enregistrée et ses **alertes restent actives**. On ne retire jamais les
 * critères pour « voir tout » — `DELETE /search/criteria` couperait les
 * alertes. Une nouvelle recherche de Karria rend la main au serveur (mode
 * déduit), pour qu'elle s'affiche aussitôt.
 *
 * ═══ Les offres vues partent par lots ═══
 *
 * Chaque carte qui passe à l'écran est notée ; les identifiants partent
 * toutes les deux secondes, en un seul appel, jamais à la carte : c'est
 * ce qui fait tomber « Nouvelle » et alimente « Non vues ».
 *
 * ═══ Sans compte ═══
 *
 * Le fil se lit tel quel (le serveur le sert sans session, en
 * `all_offers`). Mais rien ne s'écrit : les offres vues ne partent pas, et
 * « garder » passe par la porte — la feuille de connexion monte, puis le
 * signet se pose tout seul une fois connecté (`useReprise`), et le fil se
 * relit avec l'état de la personne.
 *
 * ═══ Une seule requête à la fois ═══
 *
 * `jeton` numérote chaque chargement. Une réponse arrivée après un
 * nouveau chargement — filtre changé pendant l'attente — est ignorée :
 * sans cela, l'ancienne liste écraserait la nouvelle. La page suivante
 * suit la même règle : changer de tri en plein défilement jette la suite
 * de l'ancien ordre.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
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
  type Tri,
} from "../types/offres.types";
import { memoriser } from "./memoire-offres";

/** Le délai avant d'envoyer les offres vues : assez pour grouper un
 *  défilement, assez court pour qu'une fermeture n'en perde presque rien. */
const DELAI_VUES_MS = 2_000;

/** La vue choisie : la recherche en cours, ou tout le corpus. */
export type VueDuFil = "pour_toi" | "toutes";

/** Ce que la personne a choisi pour une vue. `tri` à `null` : l'ordre par
 *  défaut du mode servi, non envoyé. */
interface Reglage {
  filtres: Filtres;
  tri: Tri | null;
}

const REGLAGE_PAR_DEFAUT: Reglage = { filtres: FILTRES_PAR_DEFAUT, tri: null };
const REGLAGES_PAR_DEFAUT: Record<ModeDuFil, Reglage> = {
  recherche: REGLAGE_PAR_DEFAUT,
  toutes: REGLAGE_PAR_DEFAUT,
};

/** L'ordre qu'on sert quand la personne n'a rien choisi. */
export const triParDefaut = (mode: ModeDuFil): Tri =>
  mode === "recherche" ? "pertinence" : "recentes";

const triImpossible = (cause: unknown) =>
  cause instanceof ErreurApi && cause.raison === "nearest_unavailable";

/** Sans lieu de recherche, « Plus proches » ne vaut plus dans aucune vue. */
function sansProches(reglages: Record<ModeDuFil, Reglage>): Record<ModeDuFil, Reglage> {
  const retirer = (r: Reglage): Reglage =>
    r.tri === "proches" ? { ...r, tri: null } : r;
  return { recherche: retirer(reglages.recherche), toutes: retirer(reglages.toutes) };
}

export interface FilOffres {
  offres: Offre[];
  total: number;
  mode: ModeDuFil;
  /** Découle du `mode` : « Ma recherche » quand le serveur cherche. */
  vue: VueDuFil;
  /** Une recherche est enregistrée : le sélecteur de vue a un sens. */
  aUneRecherche: boolean;
  resumeRecherche: string | null;
  chargement: boolean;
  actualisation: boolean;
  chargementSuite: boolean;
  erreur: string | null;
  /** Les filtres de la vue affichée. */
  filtres: Filtres;
  /** Les contrats et villes de la vue affichée. */
  options: OptionsDeFiltre;
  /** L'ordre de la vue affichée. */
  tri: Tri;
  /** « Plus proches » est possible (recherche localisée). */
  procheDisponible: boolean;
  actualiser: () => void;
  chargerLaSuite: () => void;
  appliquerFiltres: (filtres: Filtres) => void;
  /** Change l'ordre de la vue affichée ; recharge depuis le début. */
  changerDeTri: (tri: Tri) => void;
  /** Garde ou retire une offre, en optimiste comme la V1. */
  garder: (offre: Offre) => void;
  /** Le détail a été ouvert : retire le liseré de la carte. */
  marquerOuverte: (offre: Offre) => void;
  /** Des cartes sont passées à l'écran. */
  signalerVisibles: (ids: string[]) => void;
  /** Karria vient de lancer une recherche : le fil se recharge. */
  rechargerApresRecherche: () => void;
  /** Passe à l'autre vue ; sans effet si elle est déjà affichée. */
  changerDeVue: (vue: VueDuFil) => void;
}

function messageDErreur(cause: unknown): string {
  return cause instanceof ErreurApi && cause.estReseau
    ? "Pas de connexion. Tes offres reviendront dès que le réseau sera là."
    : "Tes offres n'ont pas pu être chargées. Réessaie dans un instant.";
}

export function useFilOffres(): FilOffres {
  const { exiger, invite } = usePorte();
  const [offres, setOffres] = useState<Offre[]>([]);
  const [total, setTotal] = useState(0);
  // Le mode **servi** ; `null` avant la première réponse.
  const [modeServi, setModeServi] = useState<ModeDuFil | null>(null);
  const [resumeRecherche, setResumeRecherche] = useState<string | null>(null);
  const [procheDisponible, setProcheDisponible] = useState(false);
  const [suivantes, setSuivantes] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [chargementSuite, setChargementSuite] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reglages, setReglages] = useState(REGLAGES_PAR_DEFAUT);
  const [options, setOptions] = useState<OptionsDeFiltre>({ contrats: [], villes: [] });
  // La vue demandée au serveur ; `null` le laisse la déduire des critères.
  const [demande, setDemande] = useState<ModeDuFil | null>(null);
  // Relance le chargement sans rien changer d'autre (session ouverte,
  // nouvelle recherche).
  const [relance, setRelance] = useState(0);
  const jeton = useRef(0);
  // Les offres vues et pas encore envoyées, et celles déjà envoyées (pour
  // ne pas renvoyer dix fois la même en remontant le fil).
  const aEnvoyer = useRef(new Set<string>());
  const envoyees = useRef(new Set<string>());
  const minuteurVues = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode: ModeDuFil = modeServi ?? "toutes";
  // La vue dont les réglages partent avec la requête : celle qu'on demande,
  // sinon celle qu'on affiche. Avant la première réponse, les deux vues
  // ont les mêmes réglages par défaut : peu importe laquelle.
  const cle: ModeDuFil = demande ?? mode;
  const { filtres, tri: triChoisi } = reglages[cle];
  const tri = triChoisi ?? triParDefaut(mode);

  /** Charge la première page. Aucun `setState` avant la réponse : appelé
   *  depuis un effet, il ne déclenche pas de rendu en cascade. */
  const chargerDebut = useCallback(
    (pour: Filtres, voulu: ModeDuFil | null, ordre: Tri | null) => {
      const numero = ++jeton.current;
      return lireFil(pour, 0, voulu, ordre).then(
        (fil) => {
          if (numero !== jeton.current) return;
          memoriser(fil.offres);
          setOffres(fil.offres);
          setTotal(fil.total);
          setModeServi(fil.mode);
          setResumeRecherche(fil.resumeRecherche);
          setProcheDisponible(fil.procheDisponible);
          setSuivantes(fil.suivantes);
          setErreur(null);
        },
        (cause: unknown) => {
          if (numero !== jeton.current) return;
          if (triImpossible(cause)) {
            // La recherche a perdu son lieu : l'ordre par défaut, et l'on
            // recharge (le changement de réglage relance l'effet).
            setProcheDisponible(false);
            setReglages(sansProches);
            return;
          }
          console.warn("[karria] fil indisponible", cause);
          setErreur(messageDErreur(cause));
        },
      );
    },
    [],
  );

  // Les options suivent la vue **servie** : elles n'existent qu'une fois le
  // mode connu.
  const chargerOptions = useCallback((pour: ModeDuFil) => {
    lireOptionsDeFiltre(pour).then(setOptions, (cause: unknown) =>
      // Sans options, la feuille de filtres n'offre que la période et
      // l'affichage : dégradé, pas cassé.
      console.warn("[karria] options de filtre indisponibles", cause),
    );
  }, []);

  useEffect(() => {
    void chargerDebut(filtres, demande, triChoisi).finally(() => setChargement(false));
  }, [chargerDebut, filtres, demande, triChoisi, relance]);

  useEffect(() => {
    if (modeServi !== null) chargerOptions(modeServi);
  }, [chargerOptions, modeServi, relance]);

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
      // Un invité n'a pas d'état : rien à noter, et le serveur refuserait.
      if (invite) return;
      for (const id of ids) {
        if (!envoyees.current.has(id)) aEnvoyer.current.add(id);
      }
      if (aEnvoyer.current.size === 0 || minuteurVues.current !== null) return;
      minuteurVues.current = setTimeout(envoyerLesVues, DELAI_VUES_MS);
    },
    [envoyerLesVues, invite],
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
    void chargerDebut(filtres, demande, triChoisi).finally(() => setActualisation(false));
    if (modeServi !== null) chargerOptions(modeServi);
  }, [chargerDebut, chargerOptions, filtres, demande, triChoisi, modeServi]);

  const chargerLaSuite = useCallback(() => {
    if (!suivantes || chargementSuite || chargement) return;
    const numero = jeton.current;
    setChargementSuite(true);
    lireFil(filtres, offres.length, demande, triChoisi)
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
  }, [
    suivantes,
    chargementSuite,
    chargement,
    filtres,
    offres.length,
    demande,
    triChoisi,
  ]);

  const appliquerFiltres = useCallback(
    (nouveaux: Filtres) => {
      setChargement(true);
      setReglages((r) => ({ ...r, [cle]: { ...r[cle], filtres: nouveaux } }));
    },
    [cle],
  );

  const changerDeTri = useCallback(
    (nouveau: Tri) => {
      if (nouveau === tri) return;
      // Le défaut du mode se note `null` : il n'est pas envoyé, et la vue
      // n'a pas de choix à retenir.
      const choisi = nouveau === triParDefaut(cle) ? null : nouveau;
      setChargement(true);
      setReglages((r) => ({ ...r, [cle]: { ...r[cle], tri: choisi } }));
    },
    [cle, tri],
  );

  const remplacer = useCallback((id: string, modif: Partial<Offre>) => {
    setOffres((liste) => liste.map((o) => (o.id === id ? { ...o, ...modif } : o)));
  }, []);

  const garder = useCallback(
    (offre: Offre) => {
      if (!exiger("garder", { cle: "fil.garder", charge: offre.id })) return;
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
    [remplacer, exiger],
  );

  // Connecté après avoir voulu garder : le signet se pose tout seul.
  useReprise("fil.garder", (charge) => {
    const offre = offres.find((o) => o.id === charge);
    if (offre !== undefined) garder(offre);
  });
  // La session vient de s'ouvrir : l'état d'une personne n'est pas celui
  // d'un invité — le fil et ses options se relisent.
  const etaitInvite = useRef(invite);
  useEffect(() => {
    if (etaitInvite.current && !invite) {
      setChargement(true);
      setRelance((n) => n + 1);
    }
    etaitInvite.current = invite;
  }, [invite]);

  const marquerOuverte = useCallback(
    (offre: Offre) => remplacer(offre.id, { nonOuverte: false }),
    [remplacer],
  );

  // Une recherche change tout le fil de « Ma recherche » : ses filtres et
  // son tri repartent de zéro — une ville, un contrat de l'ancien fil n'ont
  // plus de sens sur le nouveau. « Toutes les offres » garde les siens.
  // La vue passe sur la recherche que Karria vient de poser, même depuis
  // « Toutes les offres ».
  const rechargerApresRecherche = useCallback(() => {
    setChargement(true);
    setDemande("recherche");
    setReglages((r) => ({ ...r, recherche: REGLAGE_PAR_DEFAUT }));
    setRelance((n) => n + 1);
  }, []);

  // La vue affichée suit le mode **servi** : `search` demandé sans
  // critères revient en `all_offers`, et le sélecteur le reflète.
  const vue: VueDuFil = mode === "recherche" ? "pour_toi" : "toutes";
  // Le serveur rend le résumé dès que des critères existent, même en
  // `all_offers` : c'est lui qui dit si « Ma recherche » existe.
  const aUneRecherche = resumeRecherche !== null;

  // Changer de vue ne touche qu'au paramètre `mode` : la recherche et ses
  // alertes restent ; la vue d'arrivée retrouve ses propres filtres et son
  // tri.
  const changerDeVue = useCallback(
    (cible: VueDuFil) => {
      const voulu: ModeDuFil = cible === "pour_toi" ? "recherche" : "toutes";
      // Déjà demandée mais pas servie (critères retirés entre-temps) : un
      // même `setDemande` ne relancerait rien et l'attente resterait figée.
      if (cible === vue || voulu === demande) return;
      setChargement(true);
      setDemande(voulu);
    },
    [vue, demande],
  );

  return {
    offres,
    total,
    mode,
    vue,
    aUneRecherche,
    resumeRecherche,
    chargement,
    actualisation,
    chargementSuite,
    erreur,
    filtres,
    options,
    tri,
    procheDisponible,
    actualiser,
    chargerLaSuite,
    appliquerFiltres,
    changerDeTri,
    garder,
    marquerOuverte,
    signalerVisibles,
    rechargerApresRecherche,
    changerDeVue,
  };
}
