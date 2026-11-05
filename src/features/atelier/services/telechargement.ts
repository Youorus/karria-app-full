/**
 * Télécharger un export et le remettre au téléphone — un seul geste, deux
 * écrans (Finaliser, « Mes CV »).
 *
 * Le fichier est enregistré dans `cache/atelier/exports/` sous son nom
 * lisible (« CV - Awa Diallo.pdf »), puis la feuille de partage du système
 * s'ouvre : Fichiers, AirDrop, Mail, WhatsApp — c'est le téléphone qui
 * décide où. Dès qu'elle rend la main, le fichier est **supprimé** : le
 * système a déjà sa copie là où la personne l'a mise, et un CV ne reste pas
 * dans le cache d'un téléphone qu'on peut prêter. Le répertoire est de toute
 * façon purgé avec la session (`brouillon-atelier.ts`).
 *
 * La fonction lève : c'est à l'appelant de dire quoi à l'écran, selon qu'il
 * a un état d'erreur ou une alerte.
 */

import { File } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { fichierDExport, supprimerExport } from "./brouillon-atelier";

export type Format = "pdf" | "docx";

const MIME: Record<Format, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const UTI: Record<Format, string> = {
  pdf: "com.adobe.pdf",
  docx: "org.openxmlformats.wordprocessingml.document",
};

/**
 * Télécharge `url` sous `nom`, ouvre la feuille de partage, puis efface le
 * fichier. Rend vrai si la feuille a pu s'ouvrir (faux : le partage n'est
 * pas disponible sur cet appareil — rien n'a été montré).
 */
export async function telechargerEtPartager(
  url: string,
  nom: string,
  format: Format,
): Promise<boolean> {
  let destination: File | null = null;
  try {
    destination = fichierDExport(nom);
    const fichier = await File.downloadFileAsync(url, destination);
    if (!(await Sharing.isAvailableAsync())) return false;
    await Sharing.shareAsync(fichier.uri, {
      mimeType: MIME[format],
      UTI: UTI[format],
      dialogTitle: nom,
    });
    return true;
  } finally {
    if (destination !== null) supprimerExport(destination);
  }
}
