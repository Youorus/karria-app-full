/**
 * Les mots du soutien : ce que la carte du profil dit, selon l'état.
 *
 * ═══ Le ton ═══
 *
 * Tutoiement, chaleur, honnêteté. On ne culpabilise pas, on ne vend rien de
 * trop : Karria reste gratuite avec de la publicité ; « sans pub » est un
 * confort qu'on paie 4,99 € par mois et qu'on arrête quand on veut ; un café
 * ne débloque rien, il dit merci à une petite équipe.
 *
 * ═══ Dans un service, pas dans la vue ═══
 *
 * Un libellé choisi selon un nombre de tasses, une date ou un statut, c'est
 * de la règle (§3.1) — et c'est ce qui se teste sans écran. Les prix sont
 * ceux du serveur, formatés par `lib/monnaie.ts`.
 */

import { euros } from "@/lib/monnaie";

import type { Facturation, OffreDeCafe, Tasses } from "../types/soutien.types";

export const TEXTES = {
  surtitre: "Un mot de l'équipe",
  message:
    "Karria, c'est une toute petite équipe qui y met beaucoup de cœur. L'app restera gratuite, avec quelques annonces pour la faire vivre. Si elle t'aide dans ta recherche, tu peux nous donner un coup de main — de deux façons.",
  signature: "— L'équipe Karria",
  sansPubTitre: "Profiter de Karria sans pub",
  sansPubDetail:
    "Plus aucune annonce dans ton fil. Sans engagement, résiliable à tout moment.",
  sansPubBouton: "Passer sans pub",
  sansPubActifTitre: "Tu es sans pub",
  sansPubGerer: "Gérer mon abonnement",
  cafeTitre: "Nous offrir un café",
  cafeDetail: "Un merci qui compte, et qui nous donne de l'élan.",
  merciTitre: "Merci, vraiment.",
  merciTexte:
    "Ton café est bien arrivé. Il nous donne de l'élan pour rendre Karria encore meilleur. Bonne chance pour ta recherche.",
  encoreUn: "En offrir un autre",
  stripe: "Paiement sécurisé par Stripe, dans ton navigateur.",
  indisponible: "Le soutien n'est pas disponible dans cette version de l'app.",
  attente: "On attend la confirmation du paiement…",
  nonConfirme:
    "Le paiement n'est pas encore confirmé. Si tu as bien payé, il apparaîtra ici dans quelques minutes.",
  erreurOuverture:
    "La page de paiement n'a pas pu s'ouvrir. Vérifie ta connexion, puis réessaie.",
  erreurPortail:
    "La gestion de l'abonnement n'a pas pu s'ouvrir. Réessaie dans un instant.",
} as const;

/** « ☕☕ » : les tasses dessinées, masquées au lecteur d'écran. */
export function tassesDessinees(tasses: Tasses): string {
  return "☕".repeat(Math.min(tasses, 3)) + (tasses > 3 ? "+" : "");
}

/** Le nom lu par le lecteur d'écran. */
export function nomDesTasses(tasses: Tasses): string {
  const noms: Record<Tasses, string> = {
    1: "Un café",
    2: "Deux cafés",
    3: "Trois cafés",
    5: "Cinq cafés",
  };
  return noms[tasses];
}

/** « 4,99 € / mois ». */
export function prixMensuel(centimes: number): string {
  return `${euros(centimes)} / mois`;
}

/** « Offrir deux cafés · 4,99 € ». */
export function libelleDOffre(offre: OffreDeCafe | null): string {
  if (offre === null) return "Offrir un café";
  return `Offrir ${nomDesTasses(offre.tasses).toLowerCase()} · ${euros(offre.prixCentimes)}`;
}

/** « 12 novembre 2026 », en français. */
export function dateLisible(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** La phrase sous « Tu es sans pub », selon l'état de l'abonnement. */
export function etatSansPub(f: Facturation["sansPub"]): {
  texte: string;
  alerte: boolean;
} {
  if (f.statut === "impaye") {
    return {
      texte:
        f.jusquAu === null
          ? "Le dernier paiement n'est pas passé. Mets ta carte à jour pour garder le sans pub."
          : `Le dernier paiement n'est pas passé. Tu restes sans pub jusqu'au ${dateLisible(f.jusquAu)} : mets ta carte à jour d'ici là.`,
      alerte: true,
    };
  }
  if (f.resiliationEnFinDePeriode) {
    return {
      texte:
        f.jusquAu === null
          ? "Ton abonnement s'arrête à la fin de la période en cours."
          : `Ton abonnement s'arrête le ${dateLisible(f.jusquAu)}. Jusque-là, aucune annonce.`,
      alerte: false,
    };
  }
  return {
    texte:
      f.jusquAu === null
        ? "Aucune annonce dans ton fil. Merci de soutenir Karria."
        : `Aucune annonce dans ton fil. Prochain renouvellement le ${dateLisible(f.jusquAu)}.`,
    alerte: false,
  };
}
