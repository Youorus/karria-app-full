/**
 * Une annonce native pour **un** emplacement d'écran — le détail d'une
 * offre, la galerie des modèles, le CV, l'attente d'un import.
 *
 * ═══ Un emplacement, un objet, une impression ═══
 *
 * Une annonce native ne se montre qu'à un endroit : la réutiliser ailleurs
 * compterait deux impressions pour un objet, ce que Google traite comme du
 * trafic invalide. Chaque emplacement charge donc la sienne à son
 * ouverture et la détruit en se fermant. Pas de carte de remplacement
 * quand aucune ne vient : l'emplacement disparaît, il ne s'invente pas un
 * annonceur.
 *
 * ═══ Chargée en arrière-plan, montrée au calme ═══
 *
 * Le chargement part dès que l'écran le demande (`actif`), mais l'annonce
 * n'est **rendue** qu'après deux secondes sans toucher
 * (`services/calme-tactile.ts`) : jamais sous le doigt. Et jamais au-dessus
 * d'un bouton principal — c'est à l'écran de la poser sous son contenu,
 * ce hook ne décide que du **quand**.
 *
 * ═══ Les mêmes gardes que le fil ═══
 *
 * Même consentement (`demarrer`), mêmes blocs, et rien pour une personne
 * sans pub — relu à chaque changement du drapeau, pour qu'un abonnement
 * pris pendant que l'écran est ouvert la fasse disparaître.
 *
 * ═══ L'impression ═══
 *
 * Comptée sur l'événement `IMPRESSION` du SDK, par emplacement
 * (`services/journal-impressions.ts`) : le chiffre colle à la console.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { NativeAdEventType } from "react-native-google-mobile-ads";

import { useSansPub } from "@/hooks/use-sans-pub";

import { chargerAnnonce, type NativeAd } from "../api/publicite.api";
import { delaiAvantCalme } from "../services/calme-tactile";
import { compterImpression, type Emplacement } from "../services/journal-impressions";
import { blocNatif } from "../services/regles-publicite";
import { demarrer } from "./reserve-annonces";

const bloc = blocNatif({
  developpement: __DEV__,
  modeTest: process.env.EXPO_PUBLIC_ADMOB_TEST_MODE,
  plateforme: Platform.OS === "ios" ? "ios" : "android",
  idIos: process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS,
  idAndroid: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID,
});

/**
 * Attend le calme tactile, puis appelle `montrer` — sauf si entre-temps
 * `vivant` est retombé. Un toucher pendant l'attente relance l'attente.
 */
function quandCalme(estVivant: () => boolean, montrer: () => void): () => void {
  let minuterie: ReturnType<typeof setTimeout> | null = null;
  const essayer = () => {
    if (!estVivant()) return;
    const delai = delaiAvantCalme();
    if (delai === 0) {
      montrer();
      return;
    }
    minuterie = setTimeout(essayer, delai);
  };
  essayer();
  return () => {
    if (minuterie !== null) clearTimeout(minuterie);
  };
}

/**
 * L'annonce de cet emplacement, ou `null` : pas encore là, pas disponible,
 * pas encore calme, écran inactif, ou sans pub.
 */
export function useAnnonceEmplacement(
  emplacement: Emplacement,
  actif: boolean = true,
): NativeAd | null {
  const sansPub = useSansPub();
  const [annonce, setAnnonce] = useState<NativeAd | null>(null);

  useEffect(() => {
    if (!actif || sansPub || bloc.mode === "coupe") return undefined;
    let vivant = true;
    let chargee: NativeAd | null = null;
    let annulerAttente: (() => void) | null = null;

    void demarrer().then(async ({ peutDemander, personnalisees }) => {
      if (!vivant || !peutDemander) return;
      const resultat = await chargerAnnonce(bloc, personnalisees);
      if (resultat === null) return;
      if (!vivant) {
        resultat.destroy();
        return;
      }
      chargee = resultat;
      resultat.addAdEventListener(NativeAdEventType.IMPRESSION, () =>
        compterImpression(emplacement),
      );
      annulerAttente = quandCalme(
        () => vivant,
        () => setAnnonce(resultat),
      );
    });

    return () => {
      vivant = false;
      annulerAttente?.();
      chargee?.destroy();
      setAnnonce(null);
    };
  }, [actif, sansPub, emplacement]);

  return sansPub || !actif ? null : annonce;
}
