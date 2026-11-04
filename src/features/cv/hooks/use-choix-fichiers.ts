/**
 * Choisir ce qu'on importe : un fichier, des photos de la galerie, ou des
 * pages prises à l'appareil photo.
 *
 * ═══ Trois sources, une seule sortie ═══
 *
 * Quelle que soit la source, on rend une liste de `FichierCv` prête pour
 * `POST /cv/import` — ou `null` si la personne a renoncé (une annulation
 * n'est pas une erreur, rien ne s'affiche).
 *
 * ═══ L'appareil photo, page après page ═══
 *
 * Un CV papier fait souvent deux pages. Après chaque prise, on demande
 * « Ajouter une page ? » plutôt que de deviner : la personne sait combien
 * de pages elle tient. Dix pages au plus, comme le serveur. La qualité est
 * baissée (0,6) : une page de texte reste lisible, et trois photos de
 * téléphone à pleine taille dépasseraient la limite d'envoi.
 *
 * ═══ Les permissions, au geste ═══
 *
 * L'autorisation de l'appareil photo n'est demandée qu'au moment de s'en
 * servir, et son refus dit quoi faire (choisir une photo existante).
 */

import { getDocumentAsync } from "expo-document-picker";
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  type ImagePickerAsset,
} from "expo-image-picker";
import { useCallback } from "react";
import { Alert } from "react-native";

import type { FichierCv } from "../api/cv.api";
import { PAGES_MAX, TYPES_ACCEPTES } from "../services/import";

export type SourceImport = "camera" | "galerie" | "fichier";

const PHOTO = { mediaTypes: ["images" as const], quality: 0.6, allowsEditing: false };

function versFichier(asset: ImagePickerAsset, index: number): FichierCv {
  return {
    uri: asset.uri,
    nom: asset.fileName ?? `page-${index + 1}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
  };
}

/** « Ajouter une page ? » — vrai pour continuer, faux pour envoyer. */
function demanderUnePageDePlus(pages: number): Promise<boolean> {
  return new Promise((resoudre) => {
    Alert.alert(
      `${pages} page${pages > 1 ? "s" : ""} prise${pages > 1 ? "s" : ""}`,
      "Ton CV a-t-il une autre page ?",
      [
        { text: "C'est tout", style: "cancel", onPress: () => resoudre(false) },
        { text: "Ajouter une page", onPress: () => resoudre(true) },
      ],
      { cancelable: true, onDismiss: () => resoudre(false) },
    );
  });
}

export class ChoixImpossible extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChoixImpossible";
  }
}

export interface ChoixFichiers {
  /** Ouvre la source et rend les fichiers choisis, ou `null` si l'on renonce.
   *  Lève `ChoixImpossible` avec un message à afficher si la source est inaccessible. */
  choisir: (source: SourceImport) => Promise<FichierCv[] | null>;
}

async function photographier(): Promise<FichierCv[] | null> {
  const permission = await requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new ChoixImpossible(
      "Autorise l'appareil photo dans les réglages, ou choisis une photo existante.",
    );
  }
  const pages: FichierCv[] = [];
  while (pages.length < PAGES_MAX) {
    const prise = await launchCameraAsync(PHOTO);
    if (prise.canceled || prise.assets[0] === undefined) break;
    pages.push(versFichier(prise.assets[0], pages.length));
    if (pages.length >= PAGES_MAX) break;
    if (!(await demanderUnePageDePlus(pages.length))) break;
  }
  return pages.length === 0 ? null : pages;
}

async function depuisLaGalerie(): Promise<FichierCv[] | null> {
  const choix = await launchImageLibraryAsync({
    ...PHOTO,
    allowsMultipleSelection: true,
    selectionLimit: PAGES_MAX,
    orderedSelection: true,
  });
  if (choix.canceled || choix.assets.length === 0) return null;
  return choix.assets.map(versFichier);
}

async function depuisLesFichiers(): Promise<FichierCv[] | null> {
  const choix = await getDocumentAsync({
    type: [...TYPES_ACCEPTES],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const fichier = choix.canceled ? undefined : choix.assets[0];
  if (fichier === undefined) return null;
  return [{ uri: fichier.uri, nom: fichier.name, type: fichier.mimeType ?? null }];
}

export function useChoixFichiers(): ChoixFichiers {
  const choisir = useCallback(async (source: SourceImport) => {
    try {
      if (source === "camera") return await photographier();
      if (source === "galerie") return await depuisLaGalerie();
      return await depuisLesFichiers();
    } catch (cause: unknown) {
      if (cause instanceof ChoixImpossible) throw cause;
      console.warn("[karria] choix du fichier à importer en échec", cause);
      throw new ChoixImpossible(
        source === "camera"
          ? "L'appareil photo n'est pas disponible ici. Choisis une photo existante."
          : source === "galerie"
            ? "Impossible d'ouvrir tes photos."
            : "Impossible d'ouvrir tes fichiers.",
      );
    }
  }, []);

  return { choisir };
}
