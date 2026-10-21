/**
 * Le découpage de l'analyse de Karria en sections — `parseSummaryBlocks`
 * de la V1, à l'identique.
 *
 * L'IA rédige en Markdown léger : une ligne `**Titre**` ouvre une section,
 * une ligne `•`, `-` ou `*` est une puce, le reste est du texte ; les
 * filets (`---`) sont ignorés. On en fait des blocs que l'écran affiche
 * comme la V1 : titres en capitales bleues, puces en points.
 */

export interface ElementDAnalyse {
  type: "puce" | "texte";
  contenu: string;
}

export interface BlocDAnalyse {
  titre: string | null;
  elements: ElementDAnalyse[];
}

export function decouperAnalyse(texte: string): BlocDAnalyse[] {
  const lignes = texte
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const blocs: BlocDAnalyse[] = [];
  let courant: BlocDAnalyse = { titre: null, elements: [] };

  for (const ligne of lignes) {
    if (/^[-—_]{3,}$/.test(ligne)) continue;

    const titre = /^\*\*(.+?)\*\*$/.exec(ligne);
    if (titre) {
      if (courant.titre !== null || courant.elements.length > 0) blocs.push(courant);
      courant = { titre: titre[1]!.trim(), elements: [] };
      continue;
    }

    const puce = /^(?:•|-|\*)\s+(.+)$/.exec(ligne);
    if (puce) {
      courant.elements.push({ type: "puce", contenu: puce[1]!.trim() });
      continue;
    }
    courant.elements.push({ type: "texte", contenu: ligne });
  }
  if (courant.titre !== null || courant.elements.length > 0) blocs.push(courant);
  return blocs;
}
