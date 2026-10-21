/**
 * Les mots de l'abonnement : ce que la carte du profil affiche selon l'état.
 *
 * ═══ Honnête d'abord ═══
 *
 * Tant que Karria est gratuit, la carte le dit tel quel — « tout est
 * inclus pour l'instant » — plutôt que de laisser croire à une formule
 * bridée. Les avantages « à venir » sont ceux qu'on sait pouvoir tenir ;
 * la liste se raccourcit avant de se rallonger.
 *
 * ═══ Dans un service, pas dans l'écran ═══
 *
 * Une date formatée, un libellé choisi selon un statut : de la règle, pas
 * de la vue (§3.1). Et c'est ce qui se teste sans écran.
 */

import type { NomIcone } from "@/components/icone";

import type { Abonnement } from "../types/abonnement.types";

export interface Avantage {
  icone: NomIcone;
  titre: string;
}

/** Ce que Premium apportera. Trois, pas dix : c'est une promesse. */
export const AVANTAGES_A_VENIR: readonly Avantage[] = [
  { icone: "envoye", titre: "Karria postule pour toi, aux offres que tu valides" },
  { icone: "etincelles", titre: "Modèles Pro et photo de portrait retouchée" },
  { icone: "eclair", titre: "Les nouvelles offres en priorité, avant tout le monde" },
];

export function libellePlan(abonnement: Abonnement): string {
  return abonnement.plan === "premium" ? "Karria Premium" : "Gratuit";
}

/** Le sous-titre de la carte : l'état en une phrase, sans jargon. */
export function phraseDEtat(
  abonnement: Abonnement,
  maintenant: Date = new Date(),
): string {
  if (abonnement.plan === "gratuit") {
    return "Tout est inclus pour l'instant. Premium arrive, sans rien t'enlever.";
  }
  const echeance =
    abonnement.renouvellement === null ? null : dateLisible(abonnement.renouvellement);
  switch (abonnement.statut) {
    case "essai":
      return echeance === null
        ? "Période d'essai en cours."
        : `Essai gratuit jusqu'au ${echeance}.`;
    case "annule":
      return echeance === null
        ? "Résilié. Tu gardes Premium jusqu'à la fin de la période."
        : `Résilié. Tu gardes Premium jusqu'au ${echeance}.`;
    case "expire":
      return "Ton abonnement est terminé. Tu peux le reprendre quand tu veux.";
    case "actif":
      if (echeance === null) return "Abonnement actif.";
      return new Date(abonnement.renouvellement ?? "") < maintenant
        ? "Renouvellement en cours."
        : `Renouvellement le ${echeance}.`;
  }
}

/** Le bouton de la carte, et s'il répond. */
export function actionDeLaCarte(abonnement: Abonnement): {
  libelle: string;
  active: boolean;
} {
  if (!abonnement.souscriptionDisponible) return { libelle: "Bientôt", active: false };
  return abonnement.plan === "premium"
    ? { libelle: "Gérer mon abonnement", active: true }
    : { libelle: "Découvrir Premium", active: true };
}

/** « 12 mars » — le jour et le mois suffisent, l'année se devine. */
export function dateLisible(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "bientôt";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(date);
}
