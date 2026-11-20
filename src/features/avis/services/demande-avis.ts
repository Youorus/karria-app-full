/**
 * Demander une note sur le magasin, au bon moment — et seulement là.
 *
 * ═══ Ce que fait ce fichier ═══
 *
 * Il tient l'état (`regles-avis.ts` décide, ici on retient et on agit) :
 * les sessions et les succès, cumulés dans le magasin local ; ce qui s'est
 * passé pendant la session en cours, en mémoire. Puis il appelle l'invite
 * du système : `StoreReview.isAvailableAsync()`, puis `requestReview()`.
 *
 * ═══ Deux temps : le succès, puis la demande ═══
 *
 * `noterSucces` retient qu'une chose a réussi. `proposerAvis` arme la
 * demande, qui part `DELAI_DEMANDE_MS` plus tard : assez pour que la feuille
 * de partage ou la confirmation se referme, pas assez pour que le succès
 * soit oublié. Les deux sont séparés parce que certains succès ouvrent une
 * feuille (« As-tu candidaté ? ») : on note tout de suite, on propose quand
 * elle est fermée. `succesPuisAvis` enchaîne les deux quand rien ne suit.
 *
 * Ces fonctions ne s'appellent qu'après un succès **confirmé** — jamais
 * dans un `catch`, jamais « au cas où ».
 *
 * ═══ Aucun échec ne remonte ═══
 *
 * Une note demandée ne vaut pas une erreur à l'écran. Tout est avalé et
 * journalisé : magasin local illisible, module natif absent (une build
 * d'avant `expo-store-review` — voir `chargerLeModule`), invite refusée par
 * le système.
 *
 * ═══ Ce qu'on ne fait jamais ═══
 *
 * Ni pré-question (« tu aimes Karria ? »), ni bouton qui déclenche l'invite :
 * Apple l'interdit. Le lien « Noter Karria » des paramètres (`noterKarria`)
 * ouvre la fiche du magasin — c'est autre chose : la personne l'a demandé.
 */

import { AppState, Linking, Platform } from "react-native";

import { lireVersionConnue } from "@/features/demarrage/services/etat-version";
import { estBloquante } from "@/features/demarrage/services/version";
import { auMomentDUneErreur, type ErreurApi } from "@/lib/http";
import { ecrireLocal, lireLocal } from "@/lib/magasin-local";
import { derniereSollicitation } from "@/lib/sollicitations";
import { VERSION } from "@/lib/version";

import {
  adressesPourNoter,
  compterSession,
  compterSucces,
  DELAI_DEMANDE_MS,
  estUneErreurGenante,
  estUneNouvelleSession,
  estUnEtatAvis,
  ETAT_VIDE,
  noterDemande,
  refusDeDemander,
  type ContexteAvis,
  type EtatAvis,
  type Succes,
} from "./regles-avis";

const CLE = "karria.avis";

// ── L'état retenu ─────────────────────────────────────────────────────────

let etat: EtatAvis | null = null;
/** Les écritures s'enchaînent : deux succès rapprochés ne s'écrasent pas. */
let file: Promise<void> = Promise.resolve();

async function lireEtat(): Promise<EtatAvis> {
  etat ??= await lireLocal<EtatAvis>(CLE, ETAT_VIDE, estUnEtatAvis);
  return etat;
}

/** Applique `changer` à l'état et le retient. Ne lève jamais. */
function modifier(changer: (e: EtatAvis) => EtatAvis): Promise<void> {
  file = file
    .then(async () => {
      etat = changer(await lireEtat());
      await ecrireLocal(CLE, etat);
    })
    .catch((cause: unknown) => {
      console.warn("[karria] état de la demande d'avis non retenu", cause);
    });
  return file;
}

// ── La session en cours (en mémoire) ──────────────────────────────────────

let sessionOuverte = false;
/** Quand l'app a quitté le premier plan pour la dernière fois. */
let sortie: number | null = null;
let erreurDansLaSession = false;
/** Un succès attend sa demande. */
let enAttente = false;
let minuterie: ReturnType<typeof setTimeout> | null = null;

function surErreurApi(erreur: ErreurApi): void {
  if (estUneErreurGenante(erreur.statut, erreur.raison)) erreurDansLaSession = true;
}

/**
 * À l'ouverture de l'espace connecté et à chaque retour au premier plan :
 * compte une session si c'en est une nouvelle (lancement, ou retour après
 * une vraie pause), et repart alors d'une session sans erreur.
 */
export function ouvrirSessionAvis(maintenant: number = Date.now()): Promise<void> {
  // Le témoin des erreurs d'API : posé une fois, reposé sans dommage.
  auMomentDUneErreur(surErreurApi);
  // Déjà ouverte : seule une vraie pause hors de l'app en ouvre une autre.
  if (sessionOuverte && (sortie === null || !estUneNouvelleSession(sortie, maintenant))) {
    sortie = null;
    return Promise.resolve();
  }
  sessionOuverte = true;
  sortie = null;
  erreurDansLaSession = false;
  return modifier((e) => compterSession(e, maintenant));
}

/** L'app quitte le premier plan : la pause commence. */
export function quitterSessionAvis(maintenant: number = Date.now()): void {
  if (sortie === null) sortie = maintenant;
}

/** Une erreur gênante vue ailleurs que par le client HTTP. */
export function noterErreurDeSession(): void {
  erreurDansLaSession = true;
}

// ── Le succès, puis la demande ────────────────────────────────────────────

/** Retient un succès confirmé. Ne lève jamais. */
export function noterSucces(succes: Succes): Promise<void> {
  return modifier((e) => {
    const resultat = compterSucces(e, succes);
    if (resultat.compte) enAttente = true;
    return resultat.etat;
  });
}

function contexte(): ContexteAvis {
  return {
    version: VERSION,
    erreurDansLaSession,
    miseAJourBloquante: estBloquante(lireVersionConnue()),
    consentementPubMontre: derniereSollicitation("consentement-pub") !== null,
    derniereProposition: derniereSollicitation("proposition-abonnement"),
  };
}

/**
 * Le module natif, chargé **à la demande**. Un `import` en tête de fichier
 * exécuterait `requireNativeModule("ExpoStoreReview")` au chargement de tout
 * écran qui note un succès — et lèverait sur une build d'avant
 * `expo-store-review`. Ici, l'absence du module est une erreur comme une
 * autre de `demander` : avalée, journalisée. `require` et non `import()` :
 * c'est la forme que Metro et Jest résolvent tous deux sans réglage.
 */
function chargerLeModule(): typeof import("expo-store-review") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- chargé à la demande, voir ci-dessus : un `import` lèverait sans le module natif
  return require("expo-store-review") as typeof import("expo-store-review");
}

async function demander(): Promise<void> {
  try {
    if (!enAttente) return;
    enAttente = false;
    // Une feuille de partage encore ouverte, l'app en arrière-plan : pas maintenant.
    if (AppState.currentState !== "active") return;
    await file;
    const maintenant = Date.now();
    const refus = refusDeDemander(await lireEtat(), contexte(), maintenant);
    if (refus !== null) {
      if (__DEV__) console.info(`[karria] pas de demande d'avis : ${refus}`);
      return;
    }
    const StoreReview = chargerLeModule();
    if (!(await StoreReview.isAvailableAsync())) return;
    // Retenue **avant** l'appel : les plafonds tiennent même si l'invite
    // échoue ou si l'app s'arrête pendant qu'elle est à l'écran.
    await modifier((e) => noterDemande(e, VERSION, maintenant));
    await StoreReview.requestReview();
  } catch (cause) {
    console.warn("[karria] demande d'avis impossible", cause);
  }
}

/**
 * Arme la demande, qui partira dans `DELAI_DEMANDE_MS` si un succès
 * l'attend. À appeler feuilles fermées. Une seule à la fois : un second
 * appel pendant l'attente ne fait rien.
 */
export function proposerAvis(): void {
  if (minuterie !== null) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    void demander();
  }, DELAI_DEMANDE_MS);
}

/** Un succès que rien ne suit : on le note, puis on propose. */
export function succesPuisAvis(succes: Succes): void {
  void noterSucces(succes).then(proposerAvis);
}

// ── « Noter Karria », à la demande ────────────────────────────────────────

/**
 * Ouvre la fiche de Karria sur le magasin, pour y écrire un avis. Sur
 * Android, l'app Google Play d'abord, puis la page web si elle manque.
 * Rend faux si rien n'a pu s'ouvrir.
 */
export async function noterKarria(): Promise<boolean> {
  for (const adresse of adressesPourNoter(Platform.OS)) {
    try {
      await Linking.openURL(adresse);
      return true;
    } catch (cause) {
      console.warn("[karria] fiche du magasin impossible à ouvrir", adresse, cause);
    }
  }
  return false;
}

/** Pour les tests : comme un nouveau lancement, sur un magasin intact. */
export function redemarrerAvisPourTest(): void {
  etat = null;
  file = Promise.resolve();
  sessionOuverte = false;
  sortie = null;
  erreurDansLaSession = false;
  enAttente = false;
  if (minuterie !== null) clearTimeout(minuterie);
  minuterie = null;
}
