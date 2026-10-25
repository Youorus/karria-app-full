/**
 * La tuile de l'entreprise : son logo, ou ses initiales sur une teinte.
 *
 * Le logo vient du stockage de Karria (`storage.karria.fr`), jamais du site
 * d'origine : WebP carré, adressé par son empreinte, donc immuable — d'où
 * le cache mémoire + disque, sans revalidation. Il est posé sur une tuile
 * blanche (`fond-logo`) dans les deux modes : un logo transparent à texte
 * sombre resterait illisible sur le fond de nuit.
 *
 * Le repli sur les initiales couvre deux cas : pas de logo (`null`), et un
 * logo qui ne se charge pas (`onError`) — une tuile vide serait pire que
 * des initiales.
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
  // L'URL qui a échoué : si l'offre affichée change, son nouveau logo est retenté.
  const [echec, setEchec] = useState<string | null>(null);
  const afficheLogo = logo !== null && echec !== logo;
  const cadre =
    taille === "carte"
      ? "h-[54px] w-[54px] rounded-tuile"
      : "h-[68px] w-[68px] rounded-[20px]";

  return (
    <Box
      className={`${cadre} shrink-0 items-center justify-center overflow-hidden border border-border-subtle ${
        afficheLogo ? "bg-fond-logo p-1.5" : ""
      }`}
      // La teinte est calculée : une donnée, pas une valeur de charte.
      style={afficheLogo ? undefined : { backgroundColor: teinteDeTuile(teinte) }}
    >
      {afficheLogo ? (
        <Image
          source={{ uri: logo }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={FONDU_MS}
          recyclingKey={cle}
          onError={() => setEchec(logo)}
          accessibilityLabel={entreprise ?? "Logo de l'entreprise"}
        />
      ) : (
        <Texte
          className={`font-display text-on-scrim ${taille === "carte" ? "text-title-sm" : "text-title"}`}
        >
          {initiales(entreprise)}
        </Texte>
      )}
    </Box>
  );
}
