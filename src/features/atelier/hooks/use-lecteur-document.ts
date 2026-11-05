/**
 * Le lecteur de documents : télécharge l'export dans le cache, l'affiche
 * (iOS) ou le confie au lecteur du téléphone (Android), et propose
 * Télécharger / Partager sur le fichier déjà là — sans le retélécharger.
 *
 * ═══ Un identifiant, et rien d'autre ═══
 *
 * La route ne porte que `id` : le document est relu dans la mémoire de
 * l'app (`documentMemorise`, posé par `useOuvrirLecteur`). Inconnu — lien
 * externe, redémarrage — : l'écran dit que le lien a expiré et ne
 * télécharge rien. Le titre, le sous-titre, le nom de fichier et le
 * retour sont dérivés du document mémorisé, jamais des paramètres.
 *
 * ═══ Pourquoi un fichier local et pas le lien signé ═══
 *
 * Une WebView sur le lien signé montrerait le PDF, mais chaque geste
 * suivant (partager, enregistrer) repartirait sur le réseau, et le faux
 * serveur n'a rien à servir. Le fichier est téléchargé **une fois**, à
 * l'ouverture ; ses cinq premiers octets sont vérifiés (`%PDF-`) avant tout
 * affichage, et l'écran fermé entre-temps n'ouvre rien ; il vit le temps de l'écran et il est effacé en le quittant
 * (`supprimerExport`) — un CV ne reste pas dans le cache.
 *
 * ═══ Android ═══
 *
 * La WebView d'Android ne rend pas les PDF, et on n'envoie pas un CV à un
 * service d'aperçu tiers. Le lecteur du téléphone s'ouvre de lui-même à
 * l'arrivée du fichier (`ACTION_VIEW`, URI de contenu, lecture seule) ;
 * s'il n'y en a aucun, l'écran le dit et garde Télécharger / Partager.
 */

import type { File } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import { ErreurApi } from "@/lib/http";

import { supprimerExport } from "../services/brouillon-atelier";
import {
  documentMemorise,
  estUnPdf,
  lienDeStockageSur,
  modeDAffichage,
  presentationDeLecture,
  TEXTES_LECTEUR,
  type FormatDocument,
  type GenreDocument,
} from "../services/lecteur";
import {
  enregistrerFichier,
  MIME,
  partagerFichier,
  premiersOctets,
  repertoireDesExports,
  telechargerFichier,
} from "../services/telechargement";

export type EtatLecture =
  | { etat: "chargement" }
  | { etat: "pret"; uri: string }
  | { etat: "erreur"; message: string };

export interface EcranLecteur {
  titre: string;
  sousTitre: string;
  retour: string;
  format: FormatDocument;
  genre: GenreDocument;
  mode: "apercu" | "lecteur-systeme" | "sans-apercu";
  lecture: EtatLecture;
  /** Le répertoire fixe des exports : la seule lecture permise à la WebView. */
  repertoire: string;
  /** Android : le lecteur du téléphone a pris le fichier, ou il n'y en a pas. */
  lecteurSysteme: "ouvert" | "absent" | null;
  /** Un geste de partage est en cours : les boutons attendent. */
  occupe: boolean;
  telecharger: () => void;
  partager: () => void;
  ouvrirAilleurs: () => void;
  reessayer: () => void;
  revenir: () => void;
}

function messageDe(cause: unknown): string {
  if (cause instanceof ErreurApi && cause.estReseau) return TEXTES_LECTEUR.erreurReseau;
  const texte = cause instanceof Error ? cause.message : String(cause);
  // Un lien signé expiré : le stockage répond 403 et le téléchargement le dit.
  return /403|expired|signature/i.test(texte)
    ? TEXTES_LECTEUR.erreurLien
    : TEXTES_LECTEUR.erreurReseau;
}

export function useLecteurDocument(): EcranLecteur {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  // Le document, relu une fois : la mémoire peut être vidée pendant l'écran.
  const document = useMemo(() => documentMemorise(id), [id]);
  const presentation = useMemo(
    () => (document === null ? null : presentationDeLecture(document)),
    [document],
  );
  const genre: GenreDocument = document?.genre ?? "cv";
  const format: FormatDocument = presentation?.format ?? "pdf";
  const mode = modeDAffichage(Platform.OS, format);
  const connu =
    document !== null && presentation !== null && lienDeStockageSur(document.url);

  // Sans document connu, rien à télécharger : l'erreur est posée d'emblée.
  const [lecture, setLecture] = useState<EtatLecture>(() =>
    connu
      ? { etat: "chargement" }
      : { etat: "erreur", message: TEXTES_LECTEUR.erreurLien },
  );
  const [lecteurSysteme, setLecteurSysteme] =
    useState<EcranLecteur["lecteurSysteme"]>(null);
  const [occupe, setOccupe] = useState(false);
  const fichier = useRef<File | null>(null);
  const [tentative, setTentative] = useState(0);

  const ouvrirAilleurs = useCallback(async (f: File) => {
    try {
      const contenu = await getContentUriAsync(f.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: contenu,
        type: MIME.pdf,
        // FLAG_GRANT_READ_URI_PERMISSION : le lecteur lit, ne modifie pas.
        flags: 1,
      });
      setLecteurSysteme("ouvert");
    } catch (cause) {
      console.warn("[karria] aucun lecteur PDF", cause);
      setLecteurSysteme("absent");
    }
  }, []);

  useEffect(() => {
    if (!connu) return undefined;
    let vivant = true;
    (async () => {
      const f = await telechargerFichier(document.url, presentation.fichier, format);
      if (!vivant) {
        supprimerExport(f);
        return;
      }
      if (format === "pdf") {
        const octets = await premiersOctets(f, 5);
        // L'écran a pu se fermer pendant la lecture : rien ne s'ouvre alors.
        if (!vivant) {
          supprimerExport(f);
          return;
        }
        if (!estUnPdf(octets)) {
          supprimerExport(f);
          setLecture({ etat: "erreur", message: TEXTES_LECTEUR.erreurContenu });
          return;
        }
      }
      fichier.current = f;
      setLecture({ etat: "pret", uri: f.uri });
      if (mode === "lecteur-systeme") void ouvrirAilleurs(f);
    })().catch((cause: unknown) => {
      console.warn("[karria] document illisible", cause);
      if (vivant) setLecture({ etat: "erreur", message: messageDe(cause) });
    });
    return () => {
      vivant = false;
      if (fichier.current !== null) supprimerExport(fichier.current);
      fichier.current = null;
    };
  }, [connu, document, presentation, format, mode, ouvrirAilleurs, tentative]);

  const geste = useCallback(
    (action: (f: File) => Promise<boolean>) => {
      const f = fichier.current;
      if (f === null || occupe) return;
      setOccupe(true);
      action(f)
        .then((montre) => {
          if (!montre) Alert.alert(TEXTES_LECTEUR.partageIndisponible);
        })
        .catch((cause: unknown) => {
          console.warn("[karria] partage du document en échec", cause);
          Alert.alert(TEXTES_LECTEUR.erreurTitre, TEXTES_LECTEUR.reessayer);
        })
        .finally(() => setOccupe(false));
    },
    [occupe],
  );

  const nomDuFichier = presentation?.fichier ?? `CV - Karria.${format}`;

  return {
    titre:
      presentation?.titre ??
      (genre === "cv" ? TEXTES_LECTEUR.monCv : TEXTES_LECTEUR.maLettre),
    sousTitre: presentation?.sousTitre ?? TEXTES_LECTEUR.pdf,
    retour: presentation?.retour ?? TEXTES_LECTEUR.monCv,
    format,
    genre,
    mode,
    lecture,
    repertoire: repertoireDesExports().uri,
    lecteurSysteme,
    occupe,
    telecharger: useCallback(
      () => geste((f) => enregistrerFichier(f, nomDuFichier, format)),
      [geste, nomDuFichier, format],
    ),
    partager: useCallback(
      () => geste((f) => partagerFichier(f, nomDuFichier, format, genre)),
      [geste, nomDuFichier, format, genre],
    ),
    ouvrirAilleurs: useCallback(() => {
      if (fichier.current !== null) void ouvrirAilleurs(fichier.current);
    }, [ouvrirAilleurs]),
    reessayer: useCallback(() => {
      if (!connu) return;
      setLecture({ etat: "chargement" });
      setTentative((t) => t + 1);
    }, [connu]),
    revenir: useCallback(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/cv");
    }, [router]),
  };
}
