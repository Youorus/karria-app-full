/**
 * « J'ai déjà un CV » : choisir un fichier, le faire lire par Karria.
 *
 * ═══ Un seul hook pour deux écrans ═══
 *
 * L'invitation de l'onglet CV et le début du parcours de création
 * proposent le même geste. Ce qui diffère est ce qui se passe après —
 * ouvrir le parcours, ou le recharger — d'où `onImporte`, que chaque
 * appelant fournit. Le choix du fichier, l'envoi et les messages d'échec
 * ne s'écrivent qu'une fois.
 *
 * ═══ Le sélecteur ne filtre pas plus que le serveur ═══
 *
 * Les types proposés sont ceux que le serveur accepte (`TYPES_ACCEPTES`) :
 * on ne laisse pas choisir un fichier pour le refuser ensuite. Une
 * annulation n'est pas une erreur : rien ne s'affiche.
 */

import { getDocumentAsync } from "expo-document-picker";
import { useCallback, useEffect, useRef, useState } from "react";

import { importerCv } from "../api/cv.api";
import { messageDImport, TYPES_ACCEPTES } from "../services/import";
import type { Brouillon } from "../types/cv.types";

export interface ImportCv {
  /** Ouvre le sélecteur, puis envoie le fichier choisi. */
  importer: () => void;
  enCours: boolean;
  probleme: string | null;
}

export function useImportCv(onImporte: (brouillon: Brouillon) => void): ImportCv {
  const [enCours, setEnCours] = useState(false);
  const [probleme, setProbleme] = useState<string | null>(null);
  // Le rappel le plus récent, sans relancer `importer` à chaque rendu de
  // l'appelant : un import en cours appelle toujours la bonne suite.
  const suite = useRef(onImporte);
  useEffect(() => {
    suite.current = onImporte;
  }, [onImporte]);

  const importer = useCallback(() => {
    if (enCours) return;
    setProbleme(null);
    setEnCours(true);
    getDocumentAsync({
      type: [...TYPES_ACCEPTES],
      copyToCacheDirectory: true,
      multiple: false,
    })
      .then((choix) => {
        const fichier = choix.canceled ? undefined : choix.assets[0];
        if (fichier === undefined) return null;
        return importerCv({
          uri: fichier.uri,
          nom: fichier.name,
          type: fichier.mimeType ?? null,
        });
      })
      .then((brouillon) => {
        if (brouillon !== null) suite.current(brouillon);
      })
      .catch((cause: unknown) => {
        console.warn("[karria] import de CV en échec", cause);
        setProbleme(messageDImport(cause));
      })
      .finally(() => setEnCours(false));
  }, [enCours]);

  return { importer, enCours, probleme };
}
