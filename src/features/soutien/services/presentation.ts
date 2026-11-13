/**
 * Les mots du soutien : ce que le profil et la feuille « sans pub » disent,
 * selon l'état.
 *
 * ═══ Le ton ═══
 *
 * Tutoiement, chaleur, honnêteté. On ne culpabilise pas, on ne vend rien de
 * trop : Karria reste gratuite avec de la publicité ; « sans pub » est un
 * confort qu'on paie au mois et qu'on arrête quand on veut ; un café ne
 * débloque rien, il dit merci à une petite équipe.
 *
 * ═══ Peu de mots, à leur place ═══
 *
 * Refonte du 2026-11-04 (Marc : « tout bourré en un ») : chaque surface
 * ne dit qu'une chose. L'entrée du profil donne le titre et le prix ; la
 * feuille, trois bénéfices et une promesse ; le café, un geste. La
 * rassurance Stripe s'écrit une fois.
 *
 * ═══ Dans un service, pas dans la vue ═══
 *
 * Un libellé choisi selon un nombre de tasses, une date ou un statut, c'est
 * de la règle (§3.1) — et c'est ce qui se teste sans écran. Les prix sont
 * ceux du serveur, formatés par `lib/monnaie.ts`.
 */

import { euros } from "@/lib/monnaie";

import type { Facturation, Formule, OffreDeCafe, Tasses } from "../types/soutien.types";

export const TEXTES = {
  // ── La section du profil ──
  sectionTitre: "Soutenir Karria",
  sectionPhrase:
    "Karria est gratuite grâce à quelques annonces. Si elle t'aide, voici deux façons de nous le rendre.",
  sectionSansPaiement:
    "Une petite équipe, une app gratuite grâce à quelques annonces. Merci d'être là.",

  // ── Sans pub ──
  /** La petite étiquette dorée, au-dessus du titre. */
  sansPubEtiquette: "Karria sans pub",
  sansPubTitre: "Ton fil, sans aucune annonce.",
  /** Sous le titre de l'entrée du profil. */
  sansPubAccroche: "Rien ne s'intercale plus entre toi et tes offres.",
  /** Sous le titre de la feuille. */
  sansPubPhrase: "Le même Karria, en plus calme. Tu gardes tout, on retire les annonces.",
  /** Le comparatif de la feuille : ce que chaque formule contient. */
  comparatifColonnes: { gratuit: "Gratuit", sansPub: "Sans pub" },
  comparatif: [
    { libelle: "Toutes les offres, l'atelier CV, les candidatures", gratuit: true },
    { libelle: "Aucune annonce dans ton fil", gratuit: false },
    { libelle: "Une petite équipe soutenue directement", gratuit: false },
  ],
  sansPubFormule: "Mensuel",
  formuleAnnuel: "Annuel",
  sansPubPromesse: "Sans engagement, résiliable à tout moment.",
  garanties: ["Sans engagement", "Arrêt en un geste", "Paiement Stripe"],
  sansPubMentions:
    "Renouvelé chaque mois. Tu l'arrêtes quand tu veux depuis ton profil. Paiement sécurisé par Stripe, dans ton navigateur.",
  sansPubBouton: "Passer sans pub",
  pasMaintenant: "Pas maintenant",
  /** Sous chaque annonce du fil : l'accès à l'offre, au moment de la gêne. */
  masquerAnnonces: "Masquer les annonces",
  sansPubActifTitre: "Tu es sans pub",
  sansPubActifMerci: "Merci. Ton fil est à toi, et l'équipe te doit un café.",
  sansPubGerer: "Gérer mon abonnement",
  /** Au-dessus du mini-fil : la rangée qui s'efface. */
  annonce: "Sponsorisé",
  /** L'annonce du dessin : générique, sans marque. */
  annoncePub: "L’appli dont tout le monde parle",
  annonceSousTitre: "Publicité",

  // ── Le café ──
  cafeTitre: "Nous offrir un café",
  /** Sous le titre replié. */
  cafeCourt: "Un merci, sans abonnement",
  cafeDetail: "Un merci qui compte. Ça ne débloque rien — ça nous donne de l'élan.",
  merciTitre: "Merci, vraiment.",
  merciTexte:
    "Ton café est bien arrivé. Il nous donne de l'élan pour rendre Karria encore meilleur. Bonne chance pour ta recherche.",
  encoreUn: "En offrir un autre",

  // ── Le merci qui arrive plus tard (achat revérifié par l'app) ──
  remerciementCafe: "Merci pour le café. Ton soutien est bien arrivé.",
  remerciementModele: "Ton modèle de CV est à toi.",
  remerciementSansPub: "Karria sans pub est actif. Merci.",
  remerciementVoir: "Voir",
  remerciementOuvrir: "Ouvrir",

  // ── Commun ──
  stripe: "Paiement sécurisé par Stripe, dans ton navigateur.",
  indisponible: "Le soutien n'est pas disponible dans cette version de l'app.",
  ouverture: "Ouverture…",
  attente: "On attend la confirmation du paiement…",
  nonConfirme:
    "Le paiement n'est pas encore confirmé. Si tu as bien payé, il apparaîtra ici dans quelques minutes.",
  erreurOuverture:
    "La page de paiement n'a pas pu s'ouvrir. Vérifie ta connexion, puis réessaie.",
  erreurPortail:
    "La gestion de l'abonnement n'a pas pu s'ouvrir. Réessaie dans un instant.",
} as const;

/** Le nom lu par le lecteur d'écran, et sous la tuile : « Deux cafés ». */
export function nomDesTasses(tasses: Tasses): string {
  const noms: Record<Tasses, string> = {
    1: "Un café",
    2: "Deux cafés",
    3: "Trois cafés",
    5: "Cinq cafés",
  };
  return noms[tasses];
}

/** Sous le chiffre de la tuile : « café » ou « cafés ». */
export function motCafe(tasses: Tasses): string {
  return tasses > 1 ? "cafés" : "café";
}

/** « 4,99 € / mois ». */
export function prixMensuel(centimes: number): string {
  return `${euros(centimes)} / mois`;
}

/** « 4,99 € par mois », pour une phrase. */
export function prixParMois(centimes: number): string {
  return `${euros(centimes)} par mois`;
}

/** Le bouton de la feuille : « S'abonner pour 4,99 € / mois ». */
export function libelleAbonnement(centimes: number): string {
  return `S'abonner pour ${prixMensuel(centimes)}`;
}

/** « 49,90 € / an ». */
export function prixAnnuel(centimes: number): string {
  return `${euros(centimes)} / an`;
}

/** L'annuel ramené au mois : « moins de 4,16 € par mois ». */
export function annuelParMois(centimes: number): string {
  const exact = centimes % 12 === 0;
  return `${exact ? "soit" : "moins de"} ${euros(Math.ceil(centimes / 12))} par mois`;
}

/**
 * « 2 mois offerts » : ce que l'annuel épargne, compté en mois de mensuel
 * entiers. `null` quand il n'épargne pas au moins un mois : on n'annonce
 * pas une économie qui n'existe pas.
 */
export function moisOfferts(mensuel: number, annuel: number): string | null {
  if (mensuel <= 0) return null;
  const mois = Math.floor((mensuel * 12 - annuel) / mensuel + 1e-9);
  if (mois < 1) return null;
  return `${mois} mois offert${mois > 1 ? "s" : ""}`;
}

/** Le bouton de la feuille, selon la formule choisie. */
export function libelleAbonnementFormule(
  formule: Formule,
  mensuel: number,
  annuel: number | null,
): string {
  return formule === "annuel" && annuel !== null
    ? `S'abonner pour ${prixAnnuel(annuel)}`
    : libelleAbonnement(mensuel);
}

/**
 * Le prix ramené au jour, sur trente jours : « moins de 0,17 € par jour ».
 * Arrondi au centime supérieur, d'où « moins de » ; « soit » quand le
 * compte tombe juste. Une vérité arithmétique, pas une promotion.
 */
export function prixParJour(centimes: number): string {
  const exact = centimes % 30 === 0;
  const parJour = Math.ceil(centimes / 30);
  return `${exact ? "soit" : "moins de"} ${euros(parJour)} par jour`;
}

/** « Tu nous as déjà offert trois cafés. Merci ! » — rien sous un café. */
export function cafesDejaOfferts(nombre: number): string | null {
  if (nombre <= 0) return null;
  const quantite = nombre === 1 ? "un café" : `${nombre} cafés`;
  return `Tu nous as déjà offert ${quantite}. Merci !`;
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
