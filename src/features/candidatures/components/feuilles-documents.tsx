/**
 * Les feuilles d'un dossier : un CV, une lettre — dessinés, pas étiquetés.
 *
 * ═══ Ce qu'une pochette contient se voit ═══
 *
 * Deux petites feuilles de papier aux coins arrondis, chacune avec ses
 * lignes de texte suggérées : la première porte le CV (une ligne plus
 * épaisse pour le nom, puis trois lignes), la seconde la lettre (quatre
 * lignes égales). On comprend au premier regard ce que le dossier
 * contient, sans lire « CV » et « LM » dans deux pastilles. La lettre
 * absente ne laisse pas de trou : la feuille est en pointillé, vide —
 * « il manque quelque chose » se lit aussi.
 *
 * Décoratives à l'écran, dites au lecteur d'écran par un seul libellé.
 */

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

interface Props {
  lettre: boolean;
  /** `carte` (22 × 28) ou `grande` (44 × 56, pour l'état vide). */
  taille?: "carte" | "grande";
}

function Feuille({
  lignes,
  grande,
  vide = false,
}: {
  /** La largeur relative de chaque ligne (0–1) ; la première est épaisse. */
  lignes: number[];
  grande: boolean;
  vide?: boolean;
}) {
  const cadre = grande ? "h-14 w-11 rounded-[6px] p-2" : "h-7 w-[22px] rounded-[4px] p-1";
  return (
    <VStack
      className={`${cadre} justify-start gap-[3px] border bg-background ${
        vide ? "border-dashed border-border-champ" : "border-border-champ"
      }`}
    >
      {vide
        ? null
        : lignes.map((largeur, i) => (
            <Box
              key={i}
              className={`rounded-full ${i === 0 ? "bg-foreground-faint" : "bg-border-champ"} ${
                grande ? (i === 0 ? "h-[3px]" : "h-[2px]") : i === 0 ? "h-[2px]" : "h-px"
              }`}
              // La largeur de chaque ligne est une proportion du dessin, pas
              // une valeur de charte.
              style={{ width: `${largeur * 100}%` }}
            />
          ))}
    </VStack>
  );
}

export function FeuillesDocuments({ lettre, taille = "carte" }: Props) {
  const grande = taille === "grande";
  return (
    <HStack
      className={grande ? "items-end gap-3" : "items-end gap-1.5"}
      accessibilityLabel={lettre ? "CV adapté et lettre" : "CV adapté, sans lettre"}
    >
      <Feuille lignes={[0.7, 1, 0.85, 0.6]} grande={grande} />
      <Feuille lignes={[0.5, 1, 1, 0.8]} grande={grande} vide={!lettre} />
    </HStack>
  );
}
