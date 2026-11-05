/**
 * Le lecteur de documents : télécharge l'export dans le cache, l'affiche
 * (iOS) ou le confie au lecteur du téléphone (Android), et propose
 * Télécharger / Partager sur le fichier déjà là — sans le retélécharger.
 *
 * ═══ Pourquoi un fichier local et pas le lien signé ═══
 *
 * Une WebView sur le lien signé montrerait le PDF, mais chaque geste
 * suivant (partager, enregistrer) repartirait sur le réseau, et le faux
 * serveur n'a rien à servir. Le fichier est téléchargé **une fois**, à
 * l'ouverture ; il vit le temps de l'écran et il est effacé en le
 * quittant (`supprimerExport`) — un CV ne reste pas dans le cache.
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
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

import { ErreurApi } from "@/lib/http";

import { supprimerExport } from "../services/brouillon-atelier";
import {
  formatDuLien,
  modeDAffichage,
  TEXTES_LECTEUR,
  type FormatDocument,
  type GenreDocument,
  type ParametresLecture,
} from "../services/lecteur";
import {
  enregistrerFichier,
  MIME,
  partagerFichier,
  telechargerFichier,
} from "../services/telechargement";

export type EtatLecture =
  | { etat: "chargement" }
  | { etat: "pret"; uri: string; repertoire: string }
  | { etat: "erreur"; message: string };

export interface EcranLecteur {
  titre: string;
  sousTitre: string;
  retour: string;
  format: FormatDocument;
  genre: GenreDocument;
  mode: "apercu" | "lecteur-systeme" | "sans-apercu";
  lecture: EtatLecture;
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
  const p = useLocalSearchParams<Partial<ParametresLecture>>();
  const router = useRouter();
  const url = p.url ?? "";
  const genre: GenreDocument = p.genre === "lettre" ? "lettre" : "cv";
  const format = formatDuLien(url);
  const fichierNom =
    p.fichier ?? (genre === "cv" ? `CV - Karria.${format}` : `Lettre - Karria.${format}`);
  const mode = modeDAffichage(Platform.OS, format);

  // Sans lien, rien à télécharger : l'état d'erreur est posé d'emblée,
  // pas dans l'effet.
  const [lecture, setLecture] = useState<EtatLecture>(() =>
    url === ""
      ? { etat: "erreur", message: TEXTES_LECTEUR.erreurLien }
      : { etat: "chargement" },
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
    if (url === "") return undefined;
    let vivant = true;
    telechargerFichier(url, fichierNom).then(
      (f) => {
        if (!vivant) {
          supprimerExport(f);
          return;
        }
        fichier.current = f;
        setLecture({
          etat: "pret",
          uri: f.uri,
          repertoire: f.uri.slice(0, f.uri.lastIndexOf("/") + 1),
        });
        if (mode === "lecteur-systeme") void ouvrirAilleurs(f);
      },
      (cause: unknown) => {
        console.warn("[karria] document illisible", cause);
        if (vivant) setLecture({ etat: "erreur", message: messageDe(cause) });
      },
    );
    return () => {
      vivant = false;
      if (fichier.current !== null) supprimerExport(fichier.current);
      fichier.current = null;
    };
  }, [url, fichierNom, mode, ouvrirAilleurs, tentative]);

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

  return {
    titre: p.titre ?? (genre === "cv" ? TEXTES_LECTEUR.monCv : TEXTES_LECTEUR.maLettre),
    sousTitre:
      p.sousTitre ?? (format === "pdf" ? TEXTES_LECTEUR.pdf : TEXTES_LECTEUR.word),
    retour: p.retour ?? TEXTES_LECTEUR.monCv,
    format,
    genre,
    mode,
    lecture,
    lecteurSysteme,
    occupe,
    telecharger: useCallback(
      () => geste((f) => enregistrerFichier(f, fichierNom, format)),
      [geste, fichierNom, format],
    ),
    partager: useCallback(
      () => geste((f) => partagerFichier(f, fichierNom, format, genre)),
      [geste, fichierNom, format, genre],
    ),
    ouvrirAilleurs: useCallback(() => {
      if (fichier.current !== null) void ouvrirAilleurs(fichier.current);
    }, [ouvrirAilleurs]),
    reessayer: useCallback(() => {
      setLecture({ etat: "chargement" });
      setTentative((t) => t + 1);
    }, []),
    revenir: useCallback(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/cv");
    }, [router]),
  };
}
