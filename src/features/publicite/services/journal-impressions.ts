/**
 * Le compteur d'impressions par emplacement.
 *
 * ═══ Ce qu'on compte, et d'où vient le signal ═══
 *
 * Une impression est ce que **Google** appelle une impression : l'événement
 * `IMPRESSION` que le SDK émet quand l'annonce a été réellement affichée
 * dans sa `NativeAdView`. Pas « l'annonce a été chargée », pas « la cellule
 * a été rendue » : ces deux-là surestiment, et un chiffre qui ne colle pas
 * à la console AdMob ne sert à rien.
 *
 * ═══ Ce qu'on garde ═══
 *
 * Par emplacement, un compteur par jour, sur les sept derniers jours. Rien
 * de plus : le magasin local (`lib/magasin-local.ts`) est fait pour des
 * compteurs, pas pour un journal qui grandit. C'est de quoi répondre à
 * « combien d'impressions la galerie fait-elle par jour ? » sans ouvrir la
 * console.
 *
 * ═══ Pas d'envoi au serveur (2026-11-05) ═══
 *
 * Aucune route de `karria_api_v2` ne reçoit ces compteurs ; ils restent
 * sur l'appareil. Le jour où une route existe (`POST /ads/impressions`,
 * par exemple), `lireImpressions()` donne la forme à envoyer, groupée par
 * jour — rien d'autre ne change.
 */

import { ecrireLocal, lireLocal } from "@/lib/magasin-local";

export type Emplacement =
  | "fil"
  | "detail_offre"
  | "galerie"
  | "cv"
  | "attente_import"
  | "candidatures"
  /** L'atelier : pendant que Karria adapte le CV, et pendant la génération des documents. */
  | "atelier_attente"
  | "finaliser"
  /** Finaliser, une fois les documents là : sous le score ATS, au-dessus des documents. */
  | "finaliser_score"
  /** « Mes CV » : une carte dans la liste après la deuxième, et une sous l'invitation de l'état vide. */
  | "mes_cv"
  | "mes_cv_vide";

/** Par emplacement, par jour (`AAAA-MM-JJ`), un nombre. */
export type Journal = Partial<Record<Emplacement, Record<string, number>>>;

const CLE = "karria.publicite.impressions";
const JOURS_GARDES = 7;

let journal: Journal = {};
let chargement: Promise<void> | null = null;

function estUnJournal(valeur: unknown): valeur is Journal {
  if (typeof valeur !== "object" || valeur === null) return false;
  return Object.values(valeur).every(
    (parJour) =>
      typeof parJour === "object" &&
      parJour !== null &&
      Object.values(parJour).every((n) => typeof n === "number"),
  );
}

export function jourDe(instant: number): string {
  return new Date(instant).toISOString().slice(0, 10);
}

/** Retire les jours au-delà des sept gardés. */
function elaguer(source: Journal, maintenant: number): Journal {
  const limite = jourDe(maintenant - (JOURS_GARDES - 1) * 24 * 60 * 60 * 1000);
  const resultat: Journal = {};
  for (const [emplacement, parJour] of Object.entries(source)) {
    const gardes = Object.fromEntries(
      Object.entries(parJour).filter(([jour]) => jour >= limite),
    );
    if (Object.keys(gardes).length > 0) resultat[emplacement as Emplacement] = gardes;
  }
  return resultat;
}

function charger(): Promise<void> {
  chargement ??= lireLocal<Journal>(CLE, {}, estUnJournal).then((lu) => {
    // Ce qui a été compté avant la lecture s'ajoute à ce qui était écrit.
    for (const [emplacement, parJour] of Object.entries(journal)) {
      const existant = lu[emplacement as Emplacement] ?? {};
      for (const [jour, n] of Object.entries(parJour)) {
        existant[jour] = (existant[jour] ?? 0) + n;
      }
      lu[emplacement as Emplacement] = existant;
    }
    journal = lu;
  });
  return chargement;
}

/** Une impression de plus pour cet emplacement, aujourd'hui. */
export function compterImpression(
  emplacement: Emplacement,
  maintenant: number = Date.now(),
): void {
  const jour = jourDe(maintenant);
  const parJour = journal[emplacement] ?? {};
  parJour[jour] = (parJour[jour] ?? 0) + 1;
  journal[emplacement] = parJour;
  if (__DEV__) {
    console.info(`[karria] impression « ${emplacement} » — ${parJour[jour]} aujourd'hui`);
  }
  void charger().then(() => {
    journal = elaguer(journal, maintenant);
    return ecrireLocal(CLE, journal);
  });
}

/** Les compteurs connus, par emplacement et par jour. */
export async function lireImpressions(): Promise<Journal> {
  await charger();
  return journal;
}

/** Pour les tests seulement. */
export function reinitialiserImpressionsPourLesTests(): void {
  journal = {};
  chargement = null;
}
