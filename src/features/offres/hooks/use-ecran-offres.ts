/**
 * Tout ce dont l'écran des offres a besoin, derrière un seul hook.
 *
 * ═══ Le repli des offres « à explorer » ═══
 *
 * Comme la V1 : en mode recherche, les offres de faible pertinence ne sont
 * pas mêlées au fil. Elles attendent derrière « Voir N offres
 * supplémentaires », puis sous un séparateur « Autres opportunités ». Le
 * fil reste ainsi d'abord une sélection, pas un catalogue. Sans
 * recherche, il n'y a pas de pertinence : tout s'affiche, du plus récent.
 *
 * Le repli n'a de sens que trié par **pertinence** : c'est elle qui met
 * les offres « à explorer » en queue. Trié par date ou par distance, le
 * fil montre toutes les offres retenues dans cet ordre, sans repli —
 * sinon une offre « à explorer » publiée ce matin, ou à 2 km, resterait
 * cachée derrière un bouton alors qu'on vient de demander les plus
 * récentes ou les plus proches. La pastille « À explorer » de la carte
 * suffit à la distinguer.
 *
 * ═══ Le tri rapide ═══
 *
 * Une rangée de mots sous le sélecteur de vue : « Pertinence · Plus
 * récentes · Plus proches ». « Pertinence » n'existe qu'en recherche ;
 * « Plus proches » seulement si la recherche a un lieu — le serveur le dit
 * (`procheDisponible`) et mesure depuis ce lieu. Une rangée d'un seul choix
 * ne s'affiche pas (un invité, ou « Toutes les offres » sans lieu). En
 * « Plus proches », chaque carte dit sa distance (« à 12 km »).
 *
 * ═══ Le bouton ✦ change de rôle au défilement ═══
 *
 * En haut du fil, il ouvre Karria ; une fois la liste défilée, il ramène
 * en haut (V1). `defile` le dit à l'écran.
 *
 * ═══ Sans compte ═══
 *
 * Le ✦ ouvre la porte au lieu de Karria : la feuille de connexion dit ce
 * qu'on gagne, et Karria s'ouvre toute seule une fois connecté. Le détail
 * s'ouvre sans rien noter. La feuille de filtres cache l'« Affichage »
 * (sauvegardées, non vues, non postulées) : ces filtres parlent d'un compte.
 *
 * ═══ Karria et le fil se répondent ═══
 *
 * Quand Karria lance une recherche dans le rideau, le fil se recharge
 * derrière ; quand on referme le rideau, les offres sont déjà là. Dès
 * qu'une recherche existe, le sélecteur « Ma recherche / Toutes les
 * offres » apparaît sous l'en-tête et permet d'aller et venir.
 */

import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ViewabilityConfigCallbackPairs, ViewToken } from "react-native";

import { useMenuCompte } from "@/features/auth/hooks/use-menu-compte";
import { ouvrirPorte } from "@/features/auth/hooks/porte-store";
import { usePorte, useReprise } from "@/features/auth/hooks/use-porte";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnoncesDeListe } from "@/features/publicite/hooks/use-annonces-de-liste";
import { entrelacer, REGLE_DU_FIL } from "@/features/publicite/services/regles-publicite";
import { useNavigationUnique } from "@/lib/navigation";
import { noterDetailOuvert } from "../api/offres.api";
import { libelleDistance } from "../services/presentation";
import type { Offre, Tri } from "../types/offres.types";
import { memoriser } from "./memoire-offres";
import { useFilOffres, type FilOffres, type VueDuFil } from "./use-fil-offres";

export type ElementDuFil =
  /** `distance` : « à 12 km », en tri « Plus proches » seulement. */
  | { type: "offre"; offre: Offre; rang: number; distance: string | null }
  /** Une annonce native déjà chargée (`features/publicite`). */
  | { type: "annonce"; emplacement: number; annonce: NativeAd }
  | { type: "plus"; nombre: number }
  | { type: "separateur" };

export interface EcranOffres extends FilOffres {
  maintenant: Date;
  /** Le fil prêt à afficher : offres, bouton « voir plus », séparateur. */
  elements: ElementDuFil[];
  sousTitre: string;
  /** Le sélecteur « Ma recherche / Toutes les offres », ou rien tant
   *  qu'aucune recherche n'existe. */
  selecteur: {
    vue: VueDuFil;
    resume: string | null;
    desactive: boolean;
    onChanger: (vue: VueDuFil) => void;
  } | null;
  /** La rangée de tri, ou rien quand un seul ordre est possible. */
  rangeeTri: {
    choix: { tri: Tri; libelle: string }[];
    actif: Tri;
    desactive: boolean;
    onChanger: (tri: Tri) => void;
  } | null;
  filtresActifs: number;
  feuilleFiltres: boolean;
  ouvrirFiltres: () => void;
  fermerFiltres: () => void;
  /** Sans compte : la feuille de filtres n'offre pas l'« Affichage ». */
  invite: boolean;
  agentOuvert: boolean;
  ouvrirAgent: () => void;
  fermerAgent: () => void;
  /** Karria a cherché : le fil se recharge derrière le rideau. */
  surRecherche: (resultats: number) => void;
  /** Ce que la liste appelle quand des cartes passent à l'écran. Une
   *  seule référence pour toute la vie de l'écran : la liste refuse
   *  qu'elle change en cours de route. */
  visibilite: ViewabilityConfigCallbackPairs;
  defile: boolean;
  signalerDefilement: (y: number) => void;
  ouvrirMenu: () => void;
  ouvrirOffre: (offre: Offre) => void;
  voirLesAutres: () => void;
}

const nombre = (n: number) => n.toLocaleString("fr-FR");

const LIBELLES_TRI: Record<Tri, string> = {
  pertinence: "Pertinence",
  recentes: "Plus récentes",
  proches: "Plus proches",
};

export function useEcranOffres(): EcranOffres {
  const { exiger, invite } = usePorte();
  const fil = useFilOffres();
  const ouvrirMenu = useMenuCompte();
  const { pousser } = useNavigationUnique();
  const [feuilleFiltres, setFeuilleFiltres] = useState(false);
  const [agentOuvert, setAgentOuvert] = useState(false);
  const [autresVisibles, setAutresVisibles] = useState(false);
  const [defile, setDefile] = useState(false);
  const maintenant = useMemo(() => new Date(), []);
  const navigation = useNavigation();

  // Karria ouverte : la barre d'onglets s'efface, comme la V1 la masquait
  // sur l'écran de chat — sinon elle couvrirait le champ de saisie.
  useEffect(() => {
    navigation.setOptions({ tabBarStyle: agentOuvert ? { display: "none" } : undefined });
  }, [navigation, agentOuvert]);

  // `?karria=1` : une notification de type `assistant` ouvre le rideau.
  // L'ouverture suit le changement du paramètre pendant le rendu (et non
  // dans un effet, qui rendrait deux fois) ; le paramètre est ensuite
  // effacé, sinon Karria se rouvrirait au prochain retour sur l'onglet.
  const { karria } = useLocalSearchParams<{ karria?: string }>();
  const routeur = useRouter();
  const [karriaVu, setKarriaVu] = useState<string | undefined>(undefined);
  if (karria !== karriaVu) {
    setKarriaVu(karria);
    // Un invité n'a pas de notification, mais un lien se forge : la porte,
    // pas Karria.
    if (karria === "1") {
      if (invite) ouvrirPorte("karria", { cle: "karria" });
      else setAgentOuvert(true);
    }
  }
  useEffect(() => {
    if (karria === "1") routeur.setParams({ karria: undefined });
  }, [karria, routeur]);

  const {
    offres,
    total,
    mode,
    resumeRecherche,
    chargement,
    filtres,
    marquerOuverte,
    rechargerApresRecherche,
    vue,
    aUneRecherche,
    changerDeVue,
    tri,
    procheDisponible,
    changerDeTri,
  } = fil;

  // Le repli « à explorer » ne vaut qu'en pertinence (voir l'en-tête).
  const replie = tri === "pertinence";
  const estPrincipale = useCallback(
    (o: Offre) => !replie || o.qualite !== "basse",
    [replie],
  );
  // Les annonces se glissent parmi les offres principales seulement, et
  // n'existent dans la liste qu'une fois chargées (aucun trou).
  const nombrePrincipales = offres.filter(estPrincipale).length;
  const annonces = useAnnoncesDeListe(nombrePrincipales, REGLE_DU_FIL);

  const elements = useMemo<ElementDuFil[]>(() => {
    const principales = offres.filter(estPrincipale);
    const autres = offres.filter((o) => !estPrincipale(o));
    const distance = (o: Offre) =>
      tri === "proches" ? libelleDistance(o.distanceKm) : null;
    const liste = entrelacer<ElementDuFil>(
      principales.map((offre, rang) => ({
        type: "offre",
        offre,
        rang,
        distance: distance(offre),
      })),
      new Map(
        [...annonces].map(([emplacement, annonce]) => [
          emplacement,
          { type: "annonce", emplacement, annonce },
        ]),
      ),
      REGLE_DU_FIL,
    );
    if (autres.length === 0) return liste;
    if (!autresVisibles) return [...liste, { type: "plus", nombre: autres.length }];
    return [
      ...liste,
      { type: "separateur" },
      ...autres.map((offre, i) => ({
        type: "offre" as const,
        offre,
        rang: principales.length + i,
        distance: distance(offre),
      })),
    ];
  }, [offres, autresVisibles, annonces, estPrincipale, tri]);

  const sousTitre = chargement
    ? "Recherche en cours…"
    : total === 0
      ? "Aucune offre pour le moment"
      : mode === "recherche"
        ? `${nombre(total)} offre${total > 1 ? "s" : ""} pour toi`
        : tri === "proches"
          ? `${nombre(total)} offres, les plus proches d'abord`
          : `${nombre(total)} offres, les plus récentes d'abord`;

  const selecteur = aUneRecherche
    ? { vue, resume: resumeRecherche, desactive: chargement, onChanger: changerDeVue }
    : null;

  const choixDeTri: Tri[] = [
    ...(mode === "recherche" ? (["pertinence"] as const) : []),
    "recentes",
    ...(procheDisponible ? (["proches"] as const) : []),
  ];
  const rangeeTri =
    choixDeTri.length > 1
      ? {
          choix: choixDeTri.map((t) => ({ tri: t, libelle: LIBELLES_TRI[t] })),
          actif: tri,
          desactive: chargement,
          onChanger: changerDeTri,
        }
      : null;

  const filtresActifs =
    filtres.contrats.length +
    filtres.villes.length +
    (filtres.periode === null ? 0 : 1) +
    (filtres.sauvegardees ? 1 : 0) +
    (filtres.nonVues ? 1 : 0) +
    (filtres.nonPostulees ? 1 : 0);

  const ouvrirOffre = useCallback(
    (offre: Offre) => {
      memoriser([offre]);
      if (offre.nonOuverte && !invite) {
        marquerOuverte(offre);
        noterDetailOuvert(offre.id);
      }
      pousser({ pathname: "/offre/[id]", params: { id: offre.id } });
    },
    [pousser, marquerOuverte, invite],
  );

  const ouvrirAgent = useCallback(() => {
    if (exiger("karria", { cle: "karria" })) setAgentOuvert(true);
  }, [exiger]);
  useReprise("karria", () => setAgentOuvert(true));

  const signalerDefilement = useCallback((y: number) => setDefile(y > 0), []);

  const { signalerVisibles } = fil;
  const visibilite = useMemo<ViewabilityConfigCallbackPairs>(
    () => [
      {
        viewabilityConfig: { itemVisiblePercentThreshold: 60, minimumViewTime: 400 },
        onViewableItemsChanged: ({
          viewableItems,
        }: {
          viewableItems: ViewToken<ElementDuFil>[];
        }) =>
          signalerVisibles(
            viewableItems.flatMap((v) =>
              v.item.type === "offre" ? [v.item.offre.id] : [],
            ),
          ),
      },
    ],
    [signalerVisibles],
  );

  const surRecherche = useCallback(() => {
    setAutresVisibles(false);
    rechargerApresRecherche();
  }, [rechargerApresRecherche]);

  return {
    ...fil,
    maintenant,
    elements,
    sousTitre,
    selecteur,
    rangeeTri,
    filtresActifs,
    feuilleFiltres,
    ouvrirFiltres: useCallback(() => setFeuilleFiltres(true), []),
    fermerFiltres: useCallback(() => setFeuilleFiltres(false), []),
    invite,
    agentOuvert,
    ouvrirAgent,
    fermerAgent: useCallback(() => setAgentOuvert(false), []),
    surRecherche,
    visibilite,
    defile,
    signalerDefilement,
    ouvrirMenu,
    ouvrirOffre,
    voirLesAutres: useCallback(() => setAutresVisibles(true), []),
  };
}
