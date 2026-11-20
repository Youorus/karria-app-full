/**
 * Le bandeau de connexion : ce qu'il dit, et quand il le dit à voix haute.
 *
 * ═══ Trois phrases ═══
 *
 * Hors ligne, instable, rétablie — l'état vient de `lib/etat-connexion.ts`,
 * qui décide aussi de la durée de « Connexion rétablie ». Ce hook ne fait
 * que le traduire, et démarrer l'écoute de l'appareil : elle vit aussi
 * longtemps que le bandeau, c'est-à-dire que la navigation.
 *
 * ═══ L'annonce ═══
 *
 * La carte porte le rôle `alert`, mais sa phrase **change** sans qu'elle se
 * remonte (hors ligne → rétablie) : un lecteur d'écran ne relit pas un texte
 * qui change sous lui. Chaque nouvel état est donc annoncé explicitement —
 * y compris après que la personne a fermé le bandeau, puisqu'un retour de
 * connexion le fait reparaître.
 */

import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

import type { NomIcone } from "@/components/icone";
import { surveillerLeReseau } from "@/lib/ecoute-reseau";
import {
  masquerBandeauConnexion,
  useAffichageConnexion,
  type AffichageConnexion,
} from "@/lib/etat-connexion";

type Visible = Exclude<AffichageConnexion, "aucun">;

export const TEXTES_CONNEXION: Record<Visible, string> = {
  "hors-ligne": "Pas de connexion. Karria reprendra dès qu'elle revient.",
  instable: "Connexion instable. Certaines actions peuvent être lentes.",
  retablie: "Connexion rétablie",
};

const ICONES_CONNEXION: Record<Visible, NomIcone> = {
  "hors-ligne": "horsLigne",
  instable: "alerte",
  retablie: "cocheCercle",
};

export interface BandeauConnexion {
  visible: boolean;
  phrase: string;
  icone: NomIcone;
  /** La croix ; absente de « Connexion rétablie », qui s'efface seule. */
  masquer: (() => void) | undefined;
}

export function useBandeauConnexion(): BandeauConnexion {
  const affichage = useAffichageConnexion();

  useEffect(() => surveillerLeReseau(), []);

  useEffect(() => {
    if (affichage !== "aucun") {
      AccessibilityInfo.announceForAccessibility(TEXTES_CONNEXION[affichage]);
    }
  }, [affichage]);

  if (affichage === "aucun") {
    return { visible: false, phrase: "", icone: "horsLigne", masquer: undefined };
  }
  return {
    visible: true,
    phrase: TEXTES_CONNEXION[affichage],
    icone: ICONES_CONNEXION[affichage],
    masquer: affichage === "retablie" ? undefined : masquerBandeauConnexion,
  };
}
