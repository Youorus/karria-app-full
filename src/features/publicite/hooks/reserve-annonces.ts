/**
 * La réserve d'annonces natives d'une liste, gardée le temps de la session.
 *
 * ═══ Pourquoi une réserve, et non une annonce par carte ═══
 *
 * La V1 l'a appris à ses dépens (`usePooledNativeAd`) :
 *
 * - des requêtes lancées **au même instant** reçoivent le même créatif ;
 *   elles partent donc **une par une**, espacées de `ESPACEMENT_MS` ;
 * - une cellule qui sort de l'écran et y revient ne doit rien recharger :
 *   chaque emplacement garde son annonce ;
 * - une annonce n'est **jamais** montrée à deux emplacements (ce serait du
 *   trafic invalide pour Google) : un emplacement = un objet = une
 *   impression.
 *
 * Les emplacements sont **préchargés** dès que la liste sait combien elle
 * en aura : quand on y arrive en faisant défiler, l'annonce est prête, et
 * rien ne pousse le contenu sous le doigt. La réserve est bornée
 * (`plafond` de la règle) : au-delà, rien n'est demandé.
 *
 * ═══ Le démarrage ═══
 *
 * `demarrer` pose le consentement (UMP, puis ATT) et initialise le SDK,
 * une seule fois par session — d'où l'état au niveau du module, et non
 * dans un composant qui se remonte. Un **refus** n'est pas gardé : un
 * message UMP indisponible (réseau) au premier passage ne doit pas couper
 * les annonces jusqu'au redémarrage ; le passage suivant redemande.
 *
 * ═══ Sans pub ═══
 *
 * Une personne abonnée (« Karria sans pub », `lib/sans-pub.ts`) ne doit
 * voir **aucune** annonce : ni le consentement, ni le SDK, ni une requête
 * ne partent tant que le drapeau est levé, et ce qui était chargé est
 * libéré dès qu'il se lève. La règle est vérifiée ici, au plus bas, pour
 * qu'aucun écran ne puisse l'oublier.
 *
 * ═══ L'expiration ═══
 *
 * Google demande qu'une annonce native soit montrée dans l'heure qui suit
 * son chargement. Une session longue, une application reprise après une
 * nuit : `rafraichir` détruit les annonces trop vieilles et remet leurs
 * emplacements en file ; `vider` fait de même quand on se déconnecte.
 */

import { Platform } from "react-native";

import { abonnerSansPub, estSansPub } from "@/lib/sans-pub";

import {
  chargerAnnonce,
  demarrerLaPublicite,
  type Autorisation,
  type NativeAd,
} from "../api/publicite.api";
import { blocNatif } from "../services/regles-publicite";

/** L'écart entre deux requêtes, pour varier les créatifs. */
const ESPACEMENT_MS = 700;

const bloc = blocNatif({
  developpement: __DEV__,
  modeTest: process.env.EXPO_PUBLIC_ADMOB_TEST_MODE,
  plateforme: Platform.OS === "ios" ? "ios" : "android",
  idIos: process.env.EXPO_PUBLIC_ADMOB_NATIVE_IOS,
  idAndroid: process.env.EXPO_PUBLIC_ADMOB_NATIVE_ANDROID,
});

/** Au-delà, une annonce chargée n'est plus montrable (règle AdMob : une heure). */
const DUREE_DE_VIE_MS = 50 * 60 * 1000;

let autorisation: Promise<Autorisation> | null = null;
const annonces = new Map<number, NativeAd>();
const chargeesA = new Map<number, number>();
/** Emplacements demandés (en cours, servis, ou sans annonce) : jamais deux fois. */
const demandes = new Set<number>();
const file: number[] = [];
let enCours = false;

let instantane: ReadonlyMap<number, NativeAd> = new Map();
const abonnes = new Set<() => void>();

function publier(): void {
  instantane = new Map(annonces);
  abonnes.forEach((rappel) => rappel());
}

export function demarrer(): Promise<Autorisation> {
  if (bloc.mode === "coupe" || estSansPub()) {
    return Promise.resolve({ peutDemander: false, personnalisees: false });
  }
  autorisation ??= demarrerLaPublicite(bloc.mode === "test").then((reponse) => {
    if (!reponse.peutDemander) autorisation = null;
    return reponse;
  });
  return autorisation;
}

async function vider(): Promise<void> {
  if (enCours || bloc.mode === "coupe" || estSansPub()) return;
  enCours = true;
  try {
    const { peutDemander, personnalisees } = await demarrer();
    if (!peutDemander) return;
    let emplacement = file.shift();
    while (emplacement !== undefined) {
      const annonce = await chargerAnnonce(bloc, personnalisees);
      if (annonce !== null) {
        annonces.set(emplacement, annonce);
        chargeesA.set(emplacement, Date.now());
        publier();
      }
      if (file.length > 0) await new Promise((r) => setTimeout(r, ESPACEMENT_MS));
      emplacement = file.shift();
    }
  } finally {
    enCours = false;
  }
}

/** Précharge ces emplacements, dans l'ordre, s'ils ne l'ont jamais été. */
export function prechauffer(emplacements: readonly number[]): void {
  if (bloc.mode === "coupe" || estSansPub()) return;
  for (const e of emplacements) {
    if (demandes.has(e)) continue;
    demandes.add(e);
    file.push(e);
  }
  void vider();
}

/** Détruit les annonces trop vieilles et remet leurs emplacements en file. */
export function rafraichir(maintenant: number = Date.now()): void {
  const perimes: number[] = [];
  for (const [emplacement, instant] of chargeesA) {
    if (maintenant - instant >= DUREE_DE_VIE_MS) perimes.push(emplacement);
  }
  if (perimes.length === 0) return;
  for (const emplacement of perimes) {
    annonces.get(emplacement)?.destroy();
    annonces.delete(emplacement);
    chargeesA.delete(emplacement);
    demandes.delete(emplacement);
  }
  publier();
  prechauffer(perimes);
}

/** Tout détruire (déconnexion) : les objets natifs sont libérés, la file vidée. */
export function liberer(): void {
  for (const annonce of annonces.values()) annonce.destroy();
  annonces.clear();
  chargeesA.clear();
  demandes.clear();
  file.length = 0;
  publier();
}

// Dès que la personne passe sans pub, tout ce qui était chargé est libéré :
// un abonné ne doit pas garder une annonce prête sous le coude.
abonnerSansPub(() => {
  if (estSansPub()) liberer();
});

export function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/** Les annonces prêtes, par emplacement. Même objet tant que rien ne change. */
export function annoncesPretes(): ReadonlyMap<number, NativeAd> {
  return instantane;
}
