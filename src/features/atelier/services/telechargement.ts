/**
 * Télécharger un export et le remettre au téléphone — un seul geste, trois
 * écrans (Finaliser, « Mes CV », le lecteur).
 *
 * Le fichier est enregistré dans `cache/atelier/exports/` sous son nom
 * lisible (« CV - Awa Diallo.pdf »), puis la feuille du système s'ouvre :
 * Fichiers, AirDrop, Mail, WhatsApp — c'est le téléphone qui décide où.
 * Dès qu'elle rend la main, le fichier est **supprimé** : le système a
 * déjà sa copie là où la personne l'a mise, et un CV ne reste pas dans le
 * cache d'un téléphone qu'on peut prêter. Le répertoire est de toute façon
 * purgé avec la session (`brouillon-atelier.ts`).
 *
 * ═══ Le partage porte Karria ═══
 *
 * Sur iOS, `Share.share({ url, message })` envoie le fichier **et** une
 * phrase (`messageDePartageDocument`) : Messages, Mail, WhatsApp montrent
 * les deux, « Enregistrer dans Fichiers » ne garde que le fichier. Sur
 * Android, `Share.share` ne sait pas joindre un fichier : `expo-sharing`
 * le remet seul, et c'est le pied de page du document (« réalisé avec
 * Karria · karria.fr/app ») qui porte la référence — on ne double pas le
 * geste d'une deuxième feuille.
 *
 * `enregistrerFichier` est la feuille sans message, pour « Télécharger »
 * dans le lecteur : la personne veut le fichier, rien d'autre.
 *
 * Les fonctions lèvent : c'est à l'appelant de dire quoi à l'écran.
 *
 * ═══ En simulation ═══
 *
 * Les liens du faux serveur (`storage.karria.fr/simule/…`) ne mènent nulle
 * part : `lib/dev/stockage-simule.ts` écrit un petit document à la place,
 * et le reste du chemin — feuille, lecteur, suppression — est le vrai.
 */

import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";

import { SIMULATION } from "@/lib/config";
import { ecrireFichierSimule, estUnFichierSimule } from "@/lib/dev/stockage-simule";

import { fichierDExport, supprimerExport } from "./brouillon-atelier";
import { nomDeFichierSur } from "./lecteur";
import { messageDePartageDocument } from "./presentation";

export type Format = "pdf" | "docx";
export type Genre = "cv" | "lettre";

export const MIME: Record<Format, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const UTI: Record<Format, string> = {
  pdf: "com.adobe.pdf",
  docx: "org.openxmlformats.wordprocessingml.document",
};

/** Le genre d'après le nom que `nomDeFichier` a donné — pour les appelants
 *  qui ne le passent pas. */
export function genreDuNomDeFichier(nom: string): Genre {
  return /^lettre/i.test(nom.trim()) ? "lettre" : "cv";
}

/** Le répertoire des exports téléchargés — fixe, sous le cache de l'app. */
export function repertoireDesExports(): Directory {
  return new Directory(Paths.cache, "atelier", "exports");
}

/**
 * Télécharge `url` dans le cache sous `nom` ; en simulation, écrit un
 * document factice. Le nom doit être un nom de fichier simple portant
 * l'extension du format (`nomDeFichierSur`), et le fichier résolu doit
 * rester sous le répertoire des exports — sinon rien n'est écrit. Le
 * fichier est à supprimer par l'appelant.
 */
export async function telechargerFichier(
  url: string,
  nom: string,
  format: Format,
): Promise<File> {
  if (!nomDeFichierSur(nom, format)) throw new Error("[karria] nom de fichier refusé");
  const destination = fichierDExport(nom);
  const racine = repertoireDesExports().uri.replace(/\/+$/, "");
  if (
    !destination.uri.startsWith(`${racine}/`) ||
    destination.uri.slice(racine.length + 1).includes("/")
  )
    throw new Error("[karria] fichier hors du répertoire des exports");
  if (SIMULATION && estUnFichierSimule(url)) return ecrireFichierSimule(destination, url);
  return File.downloadFileAsync(url, destination);
}

/** Les premiers octets d'un fichier (au moins `n` s'il les a), sans le
 *  lire en entier : le flux est fermé après le premier morceau. */
export async function premiersOctets(fichier: File, n: number): Promise<Uint8Array> {
  const lecteur = fichier.readableStream().getReader();
  try {
    const morceaux: Uint8Array[] = [];
    let total = 0;
    while (total < n) {
      const { value, done } = await lecteur.read();
      if (done || value === undefined) break;
      morceaux.push(value);
      total += value.length;
    }
    const tout = new Uint8Array(total);
    let position = 0;
    for (const m of morceaux) {
      tout.set(m, position);
      position += m.length;
    }
    return tout.subarray(0, n);
  } finally {
    await lecteur.cancel().catch(() => undefined);
  }
}

/** La feuille du système, le fichier seul. Faux si le partage est indisponible. */
export async function enregistrerFichier(
  fichier: File,
  nom: string,
  format: Format,
): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(fichier.uri, {
    mimeType: MIME[format],
    UTI: UTI[format],
    dialogTitle: nom,
  });
  return true;
}

/** Le fichier avec la phrase Karria (iOS), ou le fichier seul (Android). */
export async function partagerFichier(
  fichier: File,
  nom: string,
  format: Format,
  genre: Genre,
): Promise<boolean> {
  if (Platform.OS !== "ios") return enregistrerFichier(fichier, nom, format);
  await Share.share(
    { url: fichier.uri, message: messageDePartageDocument(genre) },
    { subject: nom },
  );
  return true;
}

/**
 * Télécharge `url` sous `nom`, ouvre la feuille de partage (avec la phrase
 * Karria sur iOS), puis efface le fichier. Rend vrai si la feuille a pu
 * s'ouvrir (faux : le partage n'est pas disponible sur cet appareil —
 * rien n'a été montré).
 */
export async function telechargerEtPartager(
  url: string,
  nom: string,
  format: Format,
  genre: Genre = genreDuNomDeFichier(nom),
): Promise<boolean> {
  let fichier: File | null = null;
  try {
    fichier = await telechargerFichier(url, nom, format);
    return await partagerFichier(fichier, nom, format, genre);
  } finally {
    if (fichier !== null) supprimerExport(fichier);
  }
}
