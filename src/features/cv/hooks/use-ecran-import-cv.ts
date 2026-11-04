/**
 * L'écran d'import : la source vient de la route, l'import démarre tout
 * seul, et l'on finit sur le CV.
 *
 * ═══ La source dans l'adresse ═══
 *
 * `/cv/importer?source=camera|galerie|fichier` : l'écran s'ouvre et lance
 * aussitôt le sélecteur voulu. Passer la source par l'adresse plutôt que
 * par un store, c'est ce qui rend l'écran rejouable (un lien, une reprise
 * après connexion) sans état caché. Sans source connue, c'est le fichier.
 *
 * ═══ Sortir ═══
 *
 * Renoncer au sélecteur, ou toucher « Voir mon CV », revient à l'écran
 * d'où l'on vient — l'onglet CV, qui relit le CV au focus. Si la pile ne
 * permet pas de revenir (lien direct), on va à l'onglet.
 */

import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { useImportCv, type PhaseImport } from "./use-import-cv";
import type { SourceImport } from "./use-choix-fichiers";

export interface EcranImportCv {
  phase: PhaseImport;
  /** Le libellé de ce qui part, pendant la lecture (« 2 pages photographiées »). */
  fermer: () => void;
  voirMonCv: () => void;
  reessayer: () => void;
  changerDeSource: (source: SourceImport) => void;
  creerDeZero: () => void;
  toutVoir: () => void;
}

const SOURCES: readonly SourceImport[] = ["camera", "galerie", "fichier"];

function sourceDepuis(param: string | string[] | undefined): SourceImport {
  const valeur = Array.isArray(param) ? param[0] : param;
  return SOURCES.find((s) => s === valeur) ?? "fichier";
}

export function useEcranImportCv(): EcranImportCv {
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();

  const fermer = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/cv");
  }, [router]);

  const importation = useImportCv(fermer);
  const demarre = useRef(false);
  useEffect(() => {
    if (demarre.current) return;
    demarre.current = true;
    importation.demarrer(sourceDepuis(source));
  }, [importation, source]);

  return {
    phase: importation.phase,
    fermer,
    voirMonCv: fermer,
    reessayer: importation.reessayer,
    changerDeSource: importation.demarrer,
    creerDeZero: () => router.replace("/cv/creer"),
    toutVoir: importation.toutVoir,
  };
}
