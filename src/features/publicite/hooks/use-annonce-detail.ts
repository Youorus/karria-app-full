/**
 * Une annonce native pour le détail d'une offre — son propre emplacement.
 *
 * ═══ Pourquoi pas celle du fil ═══
 *
 * Une annonce native ne se montre qu'à **un** endroit : la réutiliser dans
 * le détail alors qu'elle est affichée dans le fil compte deux impressions
 * pour un objet, ce que Google traite comme du trafic invalide. Le détail
 * charge donc la sienne, à son ouverture, et la détruit en la quittant.
 * Pas de carte de remplacement quand aucune annonce ne vient : un
 * emplacement vide disparaît, il ne s'invente pas un annonceur.
 *
 * ═══ Les mêmes gardes que le fil ═══
 *
 * Même consentement (`demarrer`), mêmes blocs, et rien pour une personne
 * sans pub — relu à chaque changement du drapeau, pour qu'un abonnement
 * pris pendant que le détail est ouvert la fasse disparaître.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { useSansPub } from "@/hooks/use-sans-pub";

import { chargerAnnonce, type NativeAd } from "../api/publicite.api";
import { blocNatif } from "../services/regles-publicite";
import { demarrer } from "./reserve-annonces";

const bloc = blocNatif({
  developpement: __DEV__,
  modeTest: process.env.EXPO_PUBLIC_ADMOB_TEST_MODE,
  plateforme: Platform.OS === "ios" ? "ios" : "android",
  idIos: process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS,
  idAndroid: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID,
});

/** L'annonce du détail, ou `null` : pas encore là, pas disponible, ou sans pub. */
export function useAnnonceDetail(): NativeAd | null {
  const sansPub = useSansPub();
  const [annonce, setAnnonce] = useState<NativeAd | null>(null);

  useEffect(() => {
    if (sansPub || bloc.mode === "coupe") return;
    let vivant = true;
    let chargee: NativeAd | null = null;
    void demarrer().then(async ({ peutDemander, personnalisees }) => {
      if (!vivant || !peutDemander) return;
      const resultat = await chargerAnnonce(bloc, personnalisees);
      if (!vivant) {
        resultat?.destroy();
        return;
      }
      chargee = resultat;
      setAnnonce(resultat);
    });
    return () => {
      vivant = false;
      chargee?.destroy();
      setAnnonce(null);
    };
  }, [sansPub]);

  return sansPub ? null : annonce;
}
