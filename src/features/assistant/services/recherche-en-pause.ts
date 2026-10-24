/**
 * La recherche mise en pause : ce qui permet de revenir à « Ma recherche »
 * après être passé à « Toutes les offres ».
 *
 * ═══ Pourquoi elle vit sur l'appareil ═══
 *
 * Le contrat (`docs/contrat-api-offres.md`) ne connaît que deux états :
 * une recherche existe et le fil la montre, ou aucune n'existe et le fil
 * montre tout. Il n'offre pas de « voir tout en gardant ma recherche ».
 * Pour que le passage soit réversible sans rien demander à la personne,
 * l'application garde ici la dernière recherche avant de la retirer du
 * serveur (`DELETE`), puis la repose (`PUT`) au retour. Le jour où l'API
 * saura montrer tout sans oublier la recherche, ce fichier disparaît et
 * le sélecteur reste le même.
 *
 * ═══ Ce que l'aller-retour perd ═══
 *
 * Les alertes cessent pendant la pause (c'est ce que `DELETE` fait), et
 * `PUT` reconstruit la phrase `query` à partir des intitulés. Rien que la
 * personne voit ; dit ici pour que personne ne le découvre en production.
 *
 * ═══ Pourquoi `SecureStore` ═══
 *
 * C'est le seul stockage persistant du projet (`lib/installation.ts`
 * y garde déjà la réponse aux notifications). Les critères tiennent en
 * quelques centaines d'octets, loin de la limite de 2 048 d'iOS.
 */

import * as SecureStore from "expo-secure-store";

import type { CorpsDeRecherche } from "../types/assistant.types";

const CLE = "karria.recherche_en_pause";

export async function mettreEnPause(corps: CorpsDeRecherche): Promise<void> {
  await SecureStore.setItemAsync(CLE, JSON.stringify(corps));
}

/** La recherche en pause, ou `null` s'il n'y en a pas (ou plus). */
export async function lireRechercheEnPause(): Promise<CorpsDeRecherche | null> {
  try {
    const texte = await SecureStore.getItemAsync(CLE);
    if (texte === null) return null;
    const corps: unknown = JSON.parse(texte);
    // Un contenu d'une ancienne version ne doit pas casser le fil : s'il
    // n'a plus la forme attendue, c'est comme s'il n'y avait rien.
    if (
      typeof corps === "object" &&
      corps !== null &&
      Array.isArray((corps as { job_titles?: unknown }).job_titles)
    ) {
      return corps as CorpsDeRecherche;
    }
    console.warn("[karria] recherche en pause illisible, ignorée");
    return null;
  } catch (cause) {
    console.warn("[karria] recherche en pause illisible", cause);
    return null;
  }
}

export async function oublierRechercheEnPause(): Promise<void> {
  await SecureStore.deleteItemAsync(CLE);
}
