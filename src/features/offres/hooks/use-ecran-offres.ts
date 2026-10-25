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
 * ═══ Le bouton ✦ change de rôle au défilement ═══
 *
 * En haut du fil, il ouvre Karria ; une fois la liste défilée, il ramène
 * en haut (V1). `defile` le dit à l'écran.
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
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { useAnnoncesDeListe } from "@/features/publicite/hooks/use-annonces-de-liste";
import { entrelacer, REGLE_DU_FIL } from "@/features/publicite/services/regles-publicite";
import { useNavigationUnique } from "@/lib/navigation";
import { noterDetailOuvert } from "../api/offres.api";
import type { Offre } from "../types/offres.types";
import { memoriser } from "./memoire-offres";
import { useFilOffres, type FilOffres, type VueDuFil } from "./use-fil-offres";

export type ElementDuFil =
  | { type: "offre"; offre: Offre; rang: number }
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
  filtresActifs: number;
  feuilleFiltres: boolean;
  ouvrirFiltres: () => void;
  fermerFiltres: () => void;
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

export function useEcranOffres(): EcranOffres {
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
    if (karria === "1") setAgentOuvert(true);
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
  } = fil;

  // Les annonces se glissent parmi les offres principales seulement, et
  // n'existent dans la liste qu'une fois chargées (aucun trou).
  const nombrePrincipales = offres.filter((o) => o.qualite !== "basse").length;
  const annonces = useAnnoncesDeListe(nombrePrincipales, REGLE_DU_FIL);

  const elements = useMemo<ElementDuFil[]>(() => {
    const principales = offres.filter((o) => o.qualite !== "basse");
    const autres = offres.filter((o) => o.qualite === "basse");
    const liste = entrelacer<ElementDuFil>(
      principales.map((offre, rang) => ({ type: "offre", offre, rang })),
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
      })),
    ];
  }, [offres, autresVisibles, annonces]);

  const sousTitre = chargement
    ? "Recherche en cours…"
    : total === 0
      ? "Aucune offre pour le moment"
      : mode === "recherche"
        ? `${nombre(total)} offre${total > 1 ? "s" : ""} pour toi`
        : `${nombre(total)} offres, les plus récentes d'abord`;

  const selecteur = aUneRecherche
    ? { vue, resume: resumeRecherche, desactive: chargement, onChanger: changerDeVue }
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
      if (offre.nonOuverte) {
        marquerOuverte(offre);
        noterDetailOuvert(offre.id);
      }
      pousser({ pathname: "/offre/[id]", params: { id: offre.id } });
    },
    [pousser, marquerOuverte],
  );

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
    filtresActifs,
    feuilleFiltres,
    ouvrirFiltres: useCallback(() => setFeuilleFiltres(true), []),
    fermerFiltres: useCallback(() => setFeuilleFiltres(false), []),
    agentOuvert,
    ouvrirAgent: useCallback(() => setAgentOuvert(true), []),
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
