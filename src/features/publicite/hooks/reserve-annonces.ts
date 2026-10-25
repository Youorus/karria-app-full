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
 * dans un composant qui se remonte.
 */

import { Platform } from "react-native";

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

let autorisation: Promise<Autorisation> | null = null;
const annonces = new Map<number, NativeAd>();
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
  if (bloc.mode === "coupe") {
    return Promise.resolve({ peutDemander: false, personnalisees: false });
  }
  autorisation ??= demarrerLaPublicite(bloc.mode === "test");
  return autorisation;
}

async function vider(): Promise<void> {
  if (enCours || bloc.mode === "coupe") return;
  enCours = true;
  try {
    const { peutDemander, personnalisees } = await demarrer();
    if (!peutDemander) return;
    let emplacement = file.shift();
    while (emplacement !== undefined) {
      const annonce = await chargerAnnonce(bloc, personnalisees);
      if (annonce !== null) {
        annonces.set(emplacement, annonce);
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
  if (bloc.mode === "coupe") return;
  for (const e of emplacements) {
    if (demandes.has(e)) continue;
    demandes.add(e);
    file.push(e);
  }
  void vider();
}

export function abonner(rappel: () => void): () => void {
  abonnes.add(rappel);
  return () => abonnes.delete(rappel);
}

/** Les annonces prêtes, par emplacement. Même objet tant que rien ne change. */
export function annoncesPretes(): ReadonlyMap<number, NativeAd> {
  return instantane;
}
