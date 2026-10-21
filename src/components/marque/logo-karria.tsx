/**
 * Le mot-logo « Karria », celui de la V1.
 *
 * ═══ Pourquoi deux images et non une teinte ═══
 *
 * Le logo existe en deux fichiers — noir pour le mode clair, blanc pour
 * le sombre. On choisit le fichier selon le thème plutôt que de teinter
 * une seule image : `tintColor` repeint aussi les pixels semi-
 * transparents de l'anticrénelage, et les bords du « K » circuit
 * s'épaississent.
 *
 * Proportions d'origine : 577 × 203.
 */

import { Image } from "expo-image";

import { useCouleurs } from "@/theme/use-couleurs";

const SOURCES = {
  light: require("@/assets/branding/karria-mot-logo-clair.png"),
  dark: require("@/assets/branding/karria-mot-logo-sombre.png"),
} as const;

const RAPPORT = 577 / 203;

interface Props {
  hauteur?: number;
}

export function LogoKarria({ hauteur = 32 }: Props) {
  const { mode } = useCouleurs();
  return (
    <Image
      source={SOURCES[mode]}
      style={{ height: hauteur, width: hauteur * RAPPORT }}
      contentFit="contain"
      accessibilityLabel="Karria"
      accessibilityRole="image"
    />
  );
}
