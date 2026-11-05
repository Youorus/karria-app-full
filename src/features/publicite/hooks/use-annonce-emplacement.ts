/**
 * Une annonce native pour **un** emplacement d'écran — le détail d'une
 * offre, la galerie des modèles, le CV, l'attente d'un import.
 *
 * ═══ « Ai-je la garantie qu'une pub est comptée à chaque ouverture ? » ═══
 *
 * Non — et aucune application ne l'a. Une impression (`IMPRESSION` du SDK,
 * le seul chiffre qui colle à la console AdMob) n'est comptée que si **tout**
 * ceci est vrai, dans l'ordre :
 *
 * 1. la personne n'est pas **sans pub** (`useSansPub`) et le bloc n'est pas
 *    coupé (identifiants AdMob absents, mode test mal réglé) ;
 * 2. le **consentement** est obtenu (`demarrer` : UMP pour le RGPD, ATT sur
 *    iOS) — sans lui, aucune demande ne part ; avec un refus, des annonces
 *    non personnalisées, qui remplissent moins ;
 * 3. AdMob **remplit** la demande : un nouveau bloc, une audience étroite ou
 *    une heure creuse rendent souvent `null` (taux de remplissage) ;
 * 4. l'écran est encore ouvert quand l'annonce arrive, et le **calme
 *    tactile** est atteint (délai de l'emplacement, doigt levé) ;
 * 5. la carte est **réellement visible** : le SDK n'émet `IMPRESSION` que
 *    quand la `NativeAdView` est à l'écran — une carte posée sous le pli,
 *    jamais défilée jusqu'à elle, ne compte pas.
 *
 * Ce que l'app maîtrise, c'est 4 et 5 : la fiche d'offre pose sa carte
 * **au-dessus du pli** (après les étiquettes, avant la description) et
 * attend 700 ms de calme au lieu de 2 s, parce que l'arrivée sur la fiche
 * est elle-même un toucher. Le reste se lit dans la console AdMob
 * (demandes, remplissage, impressions) et dans le journal local par
 * emplacement (`services/journal-impressions.ts`).
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
 * n'est **rendue** qu'après un temps sans toucher, doigt levé
 * (`services/calme-tactile.ts`) : deux secondes par défaut, moins pour les
 * emplacements de `CALME_PAR_EMPLACEMENT`. Jamais sous le doigt. Et jamais
 * au-dessus d'un bouton principal — c'est à l'écran de la poser, ce hook ne
 * décide que du **quand**.
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
 * **Une fois par objet** : l'écouteur est posé une seule fois, sur une
 * annonce chargée une seule fois par ouverture de l'écran, et l'objet est
 * détruit à la fermeture — rouvrir l'écran charge un autre objet, donc une
 * autre impression possible, ce qui est exactement ce que Google compte.
 */

import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { NativeAdEventType } from "react-native-google-mobile-ads";

import { useSansPub } from "@/hooks/use-sans-pub";

import { chargerAnnonce, type NativeAd } from "../api/publicite.api";
import { CALME_MS, delaiAvantCalme } from "../services/calme-tactile";
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
 * Le calme exigé avant de montrer, par emplacement, quand il diffère des
 * deux secondes. Le détail d'une offre : on vient d'y toucher pour entrer,
 * et la carte est au-dessus du pli — 700 ms suffisent à ne pas paraître
 * sous le doigt, sans attendre que la personne ait déjà défilé.
 */
export const CALME_PAR_EMPLACEMENT: Partial<Record<Emplacement, number>> = {
  detail_offre: 700,
};

/**
 * Attend le calme tactile, puis appelle `montrer` — sauf si entre-temps
 * `vivant` est retombé. Un toucher pendant l'attente relance l'attente.
 */
function quandCalme(
  estVivant: () => boolean,
  montrer: () => void,
  calmeMs: number = CALME_MS,
): () => void {
  let minuterie: ReturnType<typeof setTimeout> | null = null;
  const essayer = () => {
    if (!estVivant()) return;
    const delai = delaiAvantCalme(Date.now(), calmeMs);
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
        CALME_PAR_EMPLACEMENT[emplacement] ?? CALME_MS,
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
