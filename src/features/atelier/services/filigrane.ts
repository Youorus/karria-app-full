/**
 * Le filigrane des CV exportés : ce qu'on en dit, et quand on propose
 * l'abonnement (ADR-0040 de l'API, `docs/contrat-api-documents.md`).
 *
 * ═══ La règle est au serveur ═══
 *
 * Trois CV sans filigrane par mois civil pour un compte gratuit, puis la
 * ligne « réalisé avec Karria » ; un abonné n'en a jamais ; **aucun export
 * n'est refusé**. L'app ne compte rien : elle lit `/allowance` pour
 * prévenir, et `watermarked` sur l'export pour savoir ce qui est sorti.
 *
 * ═══ Une ligne discrète, jamais une alerte ═══
 *
 * `ligneFiligrane` rend au plus une phrase. Avant l'export (pendant que les
 * documents se génèrent) : ce qu'il reste, ou « Ce CV portera le filigrane
 * Karria ». Une fois le document là, la phrase dit ce qui **est** : un CV
 * sorti sans filigrane n'en « portera » pas un. Rien pour un abonné, rien
 * tant qu'on ne sait pas (serveur plus ancien, lecture en échec).
 *
 * ═══ La proposition, une fois par export ═══
 *
 * `doitProposer` : le document porte le filigrane, la personne n'est pas
 * abonnée, l'offre est ouverte ici, et cet export-là n'a pas déjà fait
 * monter la feuille. Les exports déjà proposés sont retenus pour la durée du
 * lancement — revenir sur Finaliser ne re-sollicite pas pour le même fichier.
 */

import type { DroitsFiligrane } from "../types/atelier.types";

export const TEXTES_FILIGRANE = {
  portera: "Ce CV portera le filigrane Karria",
  porte: "Ce CV porte le filigrane Karria",
  prochainPortera: "Ton prochain CV portera le filigrane Karria",
} as const;

/** « Il te reste 2 CV sans filigrane ce mois-ci ». */
export function phraseRestants(restants: number): string {
  return `Il te reste ${restants} CV sans filigrane ce mois-ci`;
}

/**
 * La ligne d'information.
 *
 * `exporte` : `null` tant que le document n'est pas là (avant l'export) ;
 * sinon ce que l'export dit de lui-même. `droits` : `null` quand on ne sait
 * pas — ou quand la lecture date d'avant cet export (`droitsAJour` faux).
 */
export function ligneFiligrane(
  droits: DroitsFiligrane | null,
  exporte: { filigrane: boolean } | null,
): string | null {
  if (droits?.abonne === true) return null;
  if (exporte !== null) {
    // Le fait prime : ce document-là porte, ou non, le filigrane.
    if (exporte.filigrane) return TEXTES_FILIGRANE.porte;
    if (droits === null) return null;
    return droits.restants > 0 && !droits.filigraneAuProchain
      ? phraseRestants(droits.restants)
      : TEXTES_FILIGRANE.prochainPortera;
  }
  if (droits === null) return null;
  return droits.restants > 0 && !droits.filigraneAuProchain
    ? phraseRestants(droits.restants)
    : TEXTES_FILIGRANE.portera;
}

/** Les exports pour lesquels la feuille est déjà montée, ce lancement-ci. */
const dejaProposes = new Set<string>();

export function doitProposer(options: {
  exporte: { id: string; filigrane: boolean } | null;
  /** Karria sans pub actif (`lib/sans-pub.ts`). */
  sansPub: boolean;
  /** Le paiement est ouvert sur cette plateforme (catalogue `enabled`). */
  offreOuverte: boolean;
}): boolean {
  const { exporte, sansPub, offreOuverte } = options;
  return (
    exporte !== null &&
    exporte.filigrane &&
    !sansPub &&
    offreOuverte &&
    !dejaProposes.has(exporte.id)
  );
}

/** La feuille est montée pour cet export : elle ne remontera pas pour lui. */
export function retenirProposition(exportId: string): void {
  dejaProposes.add(exportId);
}

/** Pour les tests : oublie les exports déjà proposés. */
export function oublierPropositions(): void {
  dejaProposes.clear();
}

/** Après l'abonnement : un CV sorti filigrané peut se refaire sans. */
export function peutRegenererSansFiligrane(
  exporte: { filigrane: boolean } | null,
  sansPub: boolean,
): boolean {
  return exporte !== null && exporte.filigrane && sansPub;
}
