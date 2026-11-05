/**
 * Le stockage simulé : les fichiers que le faux serveur « héberge ».
 *
 * Le faux serveur (`atelier-simule.ts`, `candidatures-simule.ts`) donne
 * des liens `https://storage.karria.fr/simule/<id>.pdf` qui ne mènent
 * nulle part. Quand l'app veut le fichier — le lecteur, Télécharger,
 * Partager —, on écrit à la place un petit document valide : un PDF d'une
 * page qui dit ce qu'il est, un texte pour le Word. Tout le reste du
 * chemin (cache, feuille du système, suppression) est le vrai.
 *
 * Remplacé par `absent-en-production.ts` dans un paquet de production.
 */

import type { File } from "expo-file-system";

const PREFIXE = "https://storage.karria.fr/simule/";

export function estUnFichierSimule(url: string): boolean {
  return url.startsWith(PREFIXE);
}

/** Un PDF d'une page, Helvetica, avec `lignes` — table des objets exacte. */
export function pdfMinimal(lignes: readonly string[]): string {
  const texte = lignes
    .map(
      (l, i) =>
        `BT /F1 ${i === 0 ? 20 : 12} Tf 56 ${760 - i * 28} Td (${echapper(l)}) Tj ET`,
    )
    .join("\n");
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${texte.length} >>\nstream\n${texte}\nendstream`,
  ];
  let corps = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(corps.length);
    corps += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = corps.length;
  const table = positions
    .map((p) => `${String(p).padStart(10, "0")} 00000 n \n`)
    .join("");
  return (
    `${corps}xref\n0 ${objets.length + 1}\n0000000000 65535 f \n${table}` +
    `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  );
}

function echapper(texte: string): string {
  // Le PDF reste en ASCII : les accents n'ont pas de place dans une chaîne
  // WinAnsi écrite ainsi, on les ôte.
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/[\\()]/g, (c) => `\\${c}`);
}

/** Écrit dans `destination` le document que `url` représente, et le rend. */
export function ecrireFichierSimule(destination: File, url: string): File {
  const nom = url.slice(PREFIXE.length).replace(/\?.*$/, "");
  if (/\.docx$/i.test(nom)) {
    destination.write(
      `Document Word simulé — ${nom}\nCV réalisé avec Karria · karria.fr/app\n`,
    );
  } else {
    destination.write(
      pdfMinimal([
        "Document simule",
        `Le faux serveur tient lieu de ${nom}.`,
        "En production, c'est le vrai PDF du stockage Karria.",
        "",
        "CV realise avec Karria - karria.fr/app",
      ]),
    );
  }
  return destination;
}
