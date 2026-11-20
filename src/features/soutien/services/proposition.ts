/**
 * La proposition d'abonnement faite au moment où une limite du compte
 * gratuit se voit : un CV sorti avec le filigrane, les portraits du mois
 * épuisés (ADR-0040 et ADR-0038 de l'API).
 *
 * ═══ Jamais une barrière ═══
 *
 * La proposition ne retient rien : le CV filigrané se télécharge et se
 * partage, la photo d'origine reste. C'est une feuille qu'on ferme d'un
 * geste, avec un bouton qui dit clairement « non merci ». Elle n'apparaît
 * que là où l'offre est ouverte (`offreSansPub`) et jamais à un abonné.
 *
 * ═══ Le prix vient du serveur ═══
 *
 * « 4,99 € » n'est écrit nulle part ici : la phrase se compose avec le prix
 * du catalogue (`GET /payments/catalog`). Sans prix connu, la phrase se
 * passe du montant plutôt que d'en inventer un.
 *
 * ═══ Ailleurs, rien ═══
 *
 * La recherche d'offres et l'assistant restent gratuits : aucune
 * proposition n'y est faite.
 */

import { euros } from "@/lib/monnaie";

export interface TextesProposition {
  titre: string;
  texte: string;
  /** Le bouton principal : il ouvre le parcours d'abonnement. */
  accepter: string;
  /** Le bouton secondaire : il ferme, et rien ne change. */
  refuser: string;
}

/** « 4,99 € par mois », ou `null` sans prix connu. */
function parMois(prixCentimes: number | null): string | null {
  return prixCentimes === null ? null : `${euros(prixCentimes)} par mois`;
}

/** Après un export dont le document porte le filigrane. */
export function propositionFiligrane(prixCentimes: number | null): TextesProposition {
  const prix = parMois(prixCentimes);
  return {
    titre: "Ton CV est prêt",
    texte:
      prix === null
        ? "Il porte le filigrane Karria. Pour le retirer et soutenir Karria, passe à Karria sans pub, sans engagement."
        : `Il porte le filigrane Karria. Pour le retirer et soutenir Karria, passe à Karria sans pub : ${prix}, sans engagement.`,
    accepter:
      prixCentimes === null
        ? "Retirer le filigrane"
        : `Retirer le filigrane — ${euros(prixCentimes)}/mois`,
    refuser: "Garder mon CV avec le filigrane",
  };
}

/** Quand les portraits retravaillés du mois sont épuisés. */
export function propositionPortraits(
  /** La limite que le serveur annonce ; `null` s'il ne l'a pas dite. */
  limite: number | null,
  prixCentimes: number | null,
): TextesProposition {
  const prix = parMois(prixCentimes);
  const utilises =
    limite === null
      ? "Tu as utilisé tes portraits IA du mois."
      : `Tu as utilisé tes ${limite} portraits IA du mois.`;
  return {
    titre: "Limite atteinte",
    texte:
      prix === null
        ? `${utilises} Karria sans pub lève la limite.`
        : `${utilises} Karria sans pub lève la limite : ${prix}.`,
    accepter: "Voir Karria sans pub",
    refuser: "Fermer",
  };
}

/** Après l'abonnement, sur un CV sorti avec le filigrane. */
export const REGENERER_SANS_FILIGRANE = "Régénérer sans filigrane";
