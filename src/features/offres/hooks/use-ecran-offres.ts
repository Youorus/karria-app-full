/**
 * Tout ce dont l'écran des offres a besoin, derrière un seul hook.
 *
 * ═══ Le repli des offres « à explorer » ═══
 *
 * Comme la V1 : les matchs de faible qualité ne sont pas mêlés au fil.
 * Ils attendent derrière « Voir N offres supplémentaires », puis sous un
 * séparateur « Autres opportunités ». Le fil reste ainsi d'abord une
 * sélection, pas un catalogue.
 *
 * ═══ Le bouton ✦ change de rôle au défilement ═══
 *
 * En haut du fil, il ouvre Karria ; une fois la liste défilée, il ramène
 * en haut (V1). `defile` le dit à l'écran.
 */

import { useNavigation } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useMenuCompte } from "@/features/auth/hooks/use-menu-compte";
import { useNavigationUnique } from "@/lib/navigation";
import { noterDetailOuvert } from "../api/offres.api";
import type { Offre } from "../types/offres.types";
import { memoriser } from "./memoire-offres";
import { useFilOffres, type FilOffres } from "./use-fil-offres";

export type ElementDuFil =
  | { type: "offre"; offre: Offre; rang: number }
  | { type: "plus"; nombre: number }
  | { type: "separateur" };

export interface EcranOffres extends FilOffres {
  maintenant: Date;
  /** Le fil prêt à afficher : offres, bouton « voir plus », séparateur. */
  elements: ElementDuFil[];
  sousTitre: string;
  filtresActifs: number;
  feuilleFiltres: boolean;
  ouvrirFiltres: () => void;
  fermerFiltres: () => void;
  agentOuvert: boolean;
  ouvrirAgent: () => void;
  fermerAgent: () => void;
  defile: boolean;
  signalerDefilement: (y: number) => void;
  ouvrirMenu: () => void;
  ouvrirOffre: (offre: Offre) => void;
  voirLesAutres: () => void;
}

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

  const { offres, total, chargement, filtres, marquerOuverte } = fil;

  const elements = useMemo<ElementDuFil[]>(() => {
    const principales = offres.filter((o) => o.qualite !== "basse");
    const autres = offres.filter((o) => o.qualite === "basse");
    const liste: ElementDuFil[] = principales.map((offre, rang) => ({
      type: "offre",
      offre,
      rang,
    }));
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
  }, [offres, autresVisibles]);

  const sousTitre = chargement
    ? "Recherche en cours…"
    : total === 0
      ? "Aucune offre pour le moment"
      : `${total} opportunité${total > 1 ? "s" : ""} sélectionnée${total > 1 ? "s" : ""} par Karria`;

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
      pousser({ pathname: "/offre/[id]", params: { id: String(offre.id) } });
    },
    [pousser, marquerOuverte],
  );

  const signalerDefilement = useCallback((y: number) => setDefile(y > 0), []);

  return {
    ...fil,
    maintenant,
    elements,
    sousTitre,
    filtresActifs,
    feuilleFiltres,
    ouvrirFiltres: useCallback(() => setFeuilleFiltres(true), []),
    fermerFiltres: useCallback(() => setFeuilleFiltres(false), []),
    agentOuvert,
    ouvrirAgent: useCallback(() => setAgentOuvert(true), []),
    fermerAgent: useCallback(() => setAgentOuvert(false), []),
    defile,
    signalerDefilement,
    ouvrirMenu,
    ouvrirOffre,
    voirLesAutres: useCallback(() => setAutresVisibles(true), []),
  };
}
