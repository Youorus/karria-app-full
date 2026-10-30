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
 * ═══ L'accord sur l'IA, avant le sélecteur ═══
 *
 * Le fichier part chez un modèle tiers : la feuille de consentement se
 * montre avant même de choisir le fichier (`useActionIa`) — on ne fait pas
 * chercher un document pour l'arrêter ensuite. Un `403 ai_consent_required`
 * du serveur rouvre la feuille et rejoue l'envoi du même fichier.
 *
 * ═══ Le sélecteur ne filtre pas plus que le serveur ═══
 *
 * Les types proposés sont ceux que le serveur accepte (`TYPES_ACCEPTES`) :
 * on ne laisse pas choisir un fichier pour le refuser ensuite. Une
 * annulation n'est pas une erreur : rien ne s'affiche.
 */

import { getDocumentAsync } from "expo-document-picker";
import { useCallback, useEffect, useRef, useState } from "react";

import { useActionIa } from "@/features/auth/hooks/use-action-ia";

import { importerCv, type FichierCv } from "../api/cv.api";
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
  const { avecConsentement, rejouerSiConsentementRequis } = useActionIa();
  // Le rejeu après l'accord passe par une référence : `envoyer` se cite.
  const rejouer = useRef<(fichier: FichierCv) => void>(() => undefined);

  const envoyer = useCallback(
    (fichier: FichierCv) => {
      setEnCours(true);
      importerCv(fichier)
        .then((brouillon) => suite.current(brouillon))
        .catch((cause: unknown) => {
          console.warn("[karria] import de CV en échec", cause);
          if (
            rejouerSiConsentementRequis(cause, "cv_import", () =>
              rejouer.current(fichier),
            )
          ) {
            return;
          }
          setProbleme(messageDImport(cause));
        })
        .finally(() => setEnCours(false));
    },
    [rejouerSiConsentementRequis],
  );

  useEffect(() => {
    rejouer.current = envoyer;
  }, [envoyer]);

  const choisirEtEnvoyer = useCallback(() => {
    setEnCours(true);
    getDocumentAsync({
      type: [...TYPES_ACCEPTES],
      copyToCacheDirectory: true,
      multiple: false,
    })
      .then((choix) => {
        const fichier = choix.canceled ? undefined : choix.assets[0];
        setEnCours(false);
        if (fichier === undefined) return;
        envoyer({ uri: fichier.uri, nom: fichier.name, type: fichier.mimeType ?? null });
      })
      .catch((cause: unknown) => {
        console.warn("[karria] sélecteur de fichier en échec", cause);
        setEnCours(false);
        setProbleme(messageDImport(cause));
      });
  }, [envoyer]);

  const importer = useCallback(() => {
    if (enCours) return;
    setProbleme(null);
    avecConsentement("cv_import", choisirEtEnvoyer);
  }, [enCours, avecConsentement, choisirEtEnvoyer]);

  return { importer, enCours, probleme };
}
