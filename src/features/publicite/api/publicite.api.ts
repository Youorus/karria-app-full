/**
 * Le seul fichier qui parle au SDK Google Mobile Ads et à l'ATT d'Apple.
 *
 * ═══ L'ordre, qui n'est pas négociable ═══
 *
 * 1. **Consentement UMP** (`gatherConsent`) : en France, le RGPD exige
 *    qu'on demande avant tout traitement publicitaire. Le message est
 *    celui configuré dans la console AdMob (« Confidentialité et
 *    messages ») ; hors EEE, UMP ne montre rien.
 * 2. **ATT** sur iOS, seulement si UMP permet de demander des annonces :
 *    Apple veut la question avant toute lecture de l'IDFA.
 * 3. **Configuration** (appareils de test), puis **initialisation** — dans
 *    cet ordre, sinon les appareils de test ne sont pas pris en compte.
 *
 * Personnalisées seulement si la personne l'a accepté **et** (sur iOS) a
 * autorisé le suivi ; sinon, des annonces non personnalisées. Refuser ne
 * prive pas de l'application : c'est le principe d'une app gratuite.
 *
 * ═══ Aucune erreur ne remonte jusqu'à l'écran ═══
 *
 * Une panne du SDK, du formulaire ou du réseau publicitaire ne doit
 * jamais toucher le fil : la cause est journalisée et la liste reste sans
 * annonce.
 */

import * as Device from "expo-device";
import {
  getTrackingPermissionsAsync,
  PermissionStatus,
  requestTrackingPermissionsAsync,
} from "expo-tracking-transparency";
import { Platform } from "react-native";
import mobileAds, {
  AdsConsent,
  AdsConsentPrivacyOptionsRequirementStatus,
  NativeAd,
  NativeMediaAspectRatio,
  NativeAdChoicesPlacement,
  TestIds,
  MaxAdContentRating,
} from "react-native-google-mobile-ads";

import type { BlocAnnonce } from "../services/regles-publicite";

export type { NativeAd };

export interface Autorisation {
  /** UMP permet-il de demander des annonces ? */
  peutDemander: boolean;
  personnalisees: boolean;
}

const REFUS: Autorisation = { peutDemander: false, personnalisees: false };

async function suiviAutoriseSurIos(): Promise<boolean> {
  if (Platform.OS !== "ios") return true;
  // Le simulateur répond « refusé » sans rien demander : inutile d'essayer.
  if (!Device.isDevice) return false;
  try {
    const actuel = await getTrackingPermissionsAsync();
    if (actuel.status !== PermissionStatus.UNDETERMINED) return actuel.granted;
    return (await requestTrackingPermissionsAsync()).granted;
  } catch (cause) {
    console.warn("[karria] ATT illisible, annonces non personnalisées", cause);
    return false;
  }
}

/** Le consentement, le suivi, puis le SDK. À n'appeler qu'une fois. */
export async function demarrerLaPublicite(test: boolean): Promise<Autorisation> {
  let peutDemander = false;
  let personnaliseesPermises = false;
  try {
    const info = await AdsConsent.gatherConsent();
    peutDemander = info.canRequestAds;
    const rgpd = await AdsConsent.getGdprApplies();
    personnaliseesPermises = rgpd
      ? (await AdsConsent.getUserChoices()).selectPersonalisedAds
      : true;
  } catch (cause) {
    // Sans réponse d'UMP (réseau, message absent de la console), on ne
    // demande rien en production : servir une annonce sans consentement
    // dans l'EEE est précisément ce que le RGPD interdit. En mode test,
    // on continue en non personnalisé — les annonces de test ne traitent
    // aucune donnée, et le fil doit rester vérifiable avant que le
    // message soit publié dans la console AdMob.
    console.warn("[karria] consentement publicitaire indisponible", cause);
    if (!test) return REFUS;
    peutDemander = true;
    personnaliseesPermises = false;
  }
  if (!peutDemander) return REFUS;

  const suivi = await suiviAutoriseSurIos();
  try {
    // Un fil d'offres d'emploi n'est pas un lieu pour des contenus adultes :
    // la classification « T » (adolescents) borne ce que Google peut servir.
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.T,
      ...(test ? { testDeviceIdentifiers: ["EMULATOR"] } : {}),
    });
    await mobileAds().initialize();
  } catch (cause) {
    console.warn("[karria] SDK publicitaire non initialisé", cause);
    return REFUS;
  }
  return { peutDemander: true, personnalisees: personnaliseesPermises && suivi };
}

/** Le formulaire « gérer mes choix », quand UMP l'exige (EEE). */
export async function ouvrirLesChoixDeConfidentialite(): Promise<void> {
  await AdsConsent.showPrivacyOptionsForm();
}

/** Faut-il proposer « gérer mes choix » dans les réglages ? */
export async function choixDeConfidentialiteRequis(): Promise<boolean> {
  try {
    const info = await AdsConsent.getConsentInfo();
    return (
      info.privacyOptionsRequirementStatus ===
      AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
    );
  } catch (cause) {
    console.warn("[karria] état du consentement illisible", cause);
    return false;
  }
}

/**
 * Charge une annonce native. `null` sans annonce disponible (« no fill »,
 * fréquent et normal) ou en cas d'erreur : l'emplacement disparaît.
 */
export async function chargerAnnonce(
  bloc: Exclude<BlocAnnonce, { mode: "coupe" }>,
  personnalisees: boolean,
): Promise<NativeAd | null> {
  try {
    return await NativeAd.createForAdRequest(
      bloc.mode === "test" ? TestIds.NATIVE : bloc.id,
      {
        requestNonPersonalizedAdsOnly: !personnalisees,
        aspectRatio: NativeMediaAspectRatio.ANY,
        adChoicesPlacement: NativeAdChoicesPlacement.TOP_RIGHT,
        startVideoMuted: true,
      },
    );
  } catch (cause) {
    if (__DEV__) console.info("[karria] pas d'annonce pour cet emplacement", cause);
    return null;
  }
}
