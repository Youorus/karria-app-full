/**
 * La tuile de l'entreprise : son logo, ou ses initiales sur une teinte.
 *
 * Le logo vient du stockage de Karria (`storage.karria.fr`), jamais du site
 * d'origine : WebP carré, adressé par son empreinte, donc immuable — d'où
 * le cache mémoire + disque, sans revalidation. Il est posé sur une tuile
 * blanche (`fond-logo`) dans les deux modes : un logo transparent à texte
 * sombre resterait illisible sur le fond de nuit.
 *
 * Les initiales sur leur teinte sont **toujours** dessinées, et le logo
 * se pose par-dessus, sur sa tuile blanche, seulement une fois chargé
 * (`onLoad`). Trois cas sont ainsi couverts sans trou : pas de logo
 * (`null`), un logo qui ne se charge pas (`onError`), et un logo **en
 * cours** de chargement — avant, la tuile restait blanche et vide le temps
 * du réseau. Le cadre a une taille fixe : l'arrivée du logo ne déplace
 * rien autour.
 */

import { Image } from "expo-image";
import { useState } from "react";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";

import { initiales, teinteDeTuile } from "../services/presentation";

/** Le fondu d'apparition du logo, en millisecondes. */
const FONDU_MS = 180;

interface Props {
  logo: string | null;
  entreprise: string | null;
  /** Ce qui fait tourner la teinte des initiales (rang dans le fil, ou identifiant). */
  teinte: number | string;
  /** La carte (54 pt, rayon 18) ou le détail (68 pt, rayon 20). */
  taille: "carte" | "detail";
  /** Clé de recyclage dans une liste : l'identifiant de l'offre. */
  cle?: string;
}

export function TuileEntreprise({ logo, entreprise, teinte, taille, cle }: Props) {
  // L'issue du dernier chargement, liée à son URL : quand la cellule est
  // recyclée pour une autre offre, l'issue de l'ancienne ne vaut plus rien.
  const [issue, setIssue] = useState<{ url: string; charge: boolean } | null>(null);
  const issueActuelle = issue !== null && issue.url === logo ? issue : null;
  const tenteLogo = logo !== null && issueActuelle?.charge !== false;
  const logoVisible = issueActuelle?.charge === true;
  const cadre =
    taille === "carte"
      ? "h-[54px] w-[54px] rounded-tuile"
      : "h-[68px] w-[68px] rounded-[20px]";

  return (
    <Box
      className={`${cadre} shrink-0 items-center justify-center overflow-hidden border border-border-subtle`}
      // La teinte est calculée : une donnée, pas une valeur de charte.
      style={{ backgroundColor: teinteDeTuile(teinte) }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={entreprise ?? "Entreprise"}
    >
      <Texte
        className={`font-display text-on-scrim ${taille === "carte" ? "text-title-sm" : "text-title"}`}
      >
        {initiales(entreprise)}
      </Texte>
      {tenteLogo ? (
        <Box
          className={`absolute inset-0 p-1.5 ${logoVisible ? "bg-fond-logo" : ""}`}
          pointerEvents="none"
        >
          <Image
            source={{ uri: logo }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={FONDU_MS}
            recyclingKey={cle}
            onLoad={() => setIssue({ url: logo, charge: true })}
            onError={() => setIssue({ url: logo, charge: false })}
          />
        </Box>
      ) : null}
    </Box>
  );
}
