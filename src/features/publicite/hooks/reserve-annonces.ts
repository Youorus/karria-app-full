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
 * Le drapeau est relu du magasin local au démarrage (`lib/sans-pub.ts`) :
 * `demarrer` **attend** cette relecture (`sansPubPret`) avant le consentement
 * et le SDK. Sans cela, un abonné hors ligne — `GET /payments/me` en échec —
 * voyait des annonces toute la session. Une annonce dont le chargement
 * aboutit après que le drapeau s'est levé (ou après une déconnexion) est
 * détruite au lieu d'être posée.
 *
 * ═══ Retirer d'abord, détruire ensuite ═══
 *
 * `rafraichir` et `liberer` détruisaient l'objet natif **avant** de publier,
 * et la publication pouvait attendre le calme tactile : pendant ce temps, une
 * vue rendait une annonce déjà détruite. L'ordre est maintenant : retirer de
 * la réserve, publier **tout de suite** (un retrait ne fait rien surgir sous
 * le doigt — c'est l'apparition qui attend le calme), puis détruire un
 * instant plus tard, quand les vues ont rendu l'objet.
 *
 * ═══ Sans annonce (« no fill ») : on redemande, sans insister ═══
 *
 * Une absence d'annonce était définitive pour la session : l'emplacement
 * restait « demandé » et vide. Il est maintenant redemandé après
 * `delaiDeReprise` — une minute la première fois, deux ensuite — par une
 * seule minuterie pour toute la réserve. Jamais de boucle serrée : au plus
 * une requête par emplacement et par délai.
 *
 * ═══ L'expiration ═══
 *
 * Google demande qu'une annonce native soit montrée dans l'heure qui suit
 * son chargement. Une session longue, une application reprise après une
 * nuit : `rafraichir` détruit les annonces trop vieilles et remet leurs
 * emplacements en file ; `vider` fait de même quand on se déconnecte.
 */

import { Platform } from "react-native";
import { NativeAdEventType } from "react-native-google-mobile-ads";

import { abonnerSansPub, estSansPub, sansPubPret } from "@/lib/sans-pub";

import {
  chargerAnnonce,
  demarrerLaPublicite,
  type Autorisation,
  type NativeAd,
} from "../api/publicite.api";
import { delaiAvantCalme } from "../services/calme-tactile";
import { compterImpression } from "../services/journal-impressions";
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

/** Le laps laissé aux vues pour rendre une annonce retirée, avant de la détruire. */
export const DELAI_DESTRUCTION_MS = 250;

/**
 * L'attente avant de redemander un emplacement resté sans annonce : une
 * minute après le premier échec, deux minutes ensuite.
 */
export function delaiDeReprise(echecs: number): number {
  return echecs <= 1 ? 60_000 : 120_000;
}

/** Les emplacements restés sans annonce, et leur nombre d'échecs de suite. */
const sansAnnonce = new Map<number, number>();
/** Ceux qui attendent la prochaine reprise. */
const aReprendre = new Set<number>();
let reprise: ReturnType<typeof setTimeout> | null = null;

const REFUS: Autorisation = { peutDemander: false, personnalisees: false };

let instantane: ReadonlyMap<number, NativeAd> = new Map();
const abonnes = new Set<() => void>();

let publicationEnAttente: ReturnType<typeof setTimeout> | null = null;

/** Publie tout de suite, sans attendre le calme : pour un **retrait**. */
function publierMaintenant(): void {
  if (publicationEnAttente !== null) {
    clearTimeout(publicationEnAttente);
    publicationEnAttente = null;
  }
  instantane = new Map(annonces);
  abonnes.forEach((rappel) => rappel());
}

/** Détruit des annonces **déjà retirées** de la réserve, une fois les vues à jour. */
function detruireEnsuite(retirees: readonly NativeAd[]): void {
  if (retirees.length === 0) return;
  setTimeout(() => {
    for (const annonce of retirees) {
      try {
        annonce.destroy();
      } catch (cause) {
        console.warn("[karria] annonce non détruite", cause);
      }
    }
  }, DELAI_DESTRUCTION_MS);
}

/** Une seule minuterie : à l'échéance, les emplacements vides repartent en file. */
function programmerLaReprise(delai: number): void {
  if (reprise !== null) return;
  reprise = setTimeout(() => {
    reprise = null;
    if (bloc.mode === "coupe" || estSansPub()) {
      aReprendre.clear();
      return;
    }
    for (const emplacement of aReprendre) {
      // Toujours « demandé », plus servi : il retourne en file, une fois.
      if (demandes.has(emplacement) && !annonces.has(emplacement)) file.push(emplacement);
    }
    aReprendre.clear();
    void vider();
  }, delai);
}

/**
 * Publie l'instantané — mais jamais dans les deux secondes qui suivent un
 * toucher (`services/calme-tactile.ts`) : une annonce qui surgit dans le
 * fil sous le doigt est un clic accidentel garanti. Si ce n'est pas calme,
 * on réessaie quand ça le sera ; une seule attente à la fois.
 */
function publier(): void {
  const delai = delaiAvantCalme();
  if (delai > 0) {
    if (publicationEnAttente === null) {
      publicationEnAttente = setTimeout(() => {
        publicationEnAttente = null;
        publier();
      }, delai);
    }
    return;
  }
  instantane = new Map(annonces);
  abonnes.forEach((rappel) => rappel());
}

export function demarrer(): Promise<Autorisation> {
  if (bloc.mode === "coupe" || estSansPub()) return Promise.resolve(REFUS);
  // La dernière réponse connue du serveur d'abord : ni consentement ni SDK
  // pour quelqu'un qui était abonné au dernier lancement.
  return sansPubPret().then(() => {
    if (estSansPub()) return REFUS;
    autorisation ??= demarrerLaPublicite(bloc.mode === "test").then((reponse) => {
      if (!reponse.peutDemander) autorisation = null;
      return reponse;
    });
    return autorisation;
  });
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
      if (estSansPub() || !demandes.has(emplacement)) {
        // Pendant le chargement, la personne est passée sans pub, s'est
        // déconnectée, ou l'emplacement a été libéré : l'annonce n'a plus
        // sa place, on ne la pose pas.
        annonce?.destroy();
      } else if (annonce !== null) {
        // L'impression du fil, comptée sur l'événement du SDK — pas au
        // chargement, qui surestimerait (`services/journal-impressions.ts`).
        annonce.addAdEventListener(NativeAdEventType.IMPRESSION, () =>
          compterImpression("fil"),
        );
        sansAnnonce.delete(emplacement);
        annonces.set(emplacement, annonce);
        chargeesA.set(emplacement, Date.now());
        publier();
      } else {
        // Sans annonce pour l'instant : on redemandera, plus tard.
        const echecs = (sansAnnonce.get(emplacement) ?? 0) + 1;
        sansAnnonce.set(emplacement, echecs);
        aReprendre.add(emplacement);
        programmerLaReprise(delaiDeReprise(echecs));
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
  const retirees: NativeAd[] = [];
  for (const emplacement of perimes) {
    const annonce = annonces.get(emplacement);
    if (annonce !== undefined) retirees.push(annonce);
    annonces.delete(emplacement);
    chargeesA.delete(emplacement);
    demandes.delete(emplacement);
  }
  // Retirer, publier, **puis** détruire : aucune vue ne rend un objet détruit.
  publierMaintenant();
  detruireEnsuite(retirees);
  prechauffer(perimes);
}

/** Tout détruire (déconnexion) : les objets natifs sont libérés, la file vidée. */
export function liberer(): void {
  const retirees = [...annonces.values()];
  annonces.clear();
  chargeesA.clear();
  demandes.clear();
  file.length = 0;
  sansAnnonce.clear();
  aReprendre.clear();
  if (reprise !== null) {
    clearTimeout(reprise);
    reprise = null;
  }
  publierMaintenant();
  detruireEnsuite(retirees);
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
