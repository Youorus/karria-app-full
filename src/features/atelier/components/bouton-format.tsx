/**
 * « PDF » / « Word » : le bouton d'un format à télécharger — dans Finaliser
 * et dans « Mes CV », le même, pour que le geste se reconnaisse.
 *
 * Un contour, pas un plein : l'action principale de l'écran est ailleurs.
 * Pendant le téléchargement, le mot cède la place à « … » et les deux
 * boutons se désactivent — un seul fichier à la fois dans la feuille de
 * partage.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";
import type { Format } from "../services/telechargement";

export function BoutonFormat({
  format,
  enCours,
  desactive,
  onPress,
}: {
  format: Format;
  enCours: boolean;
  desactive: boolean;
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      className={`h-10 flex-row items-center gap-1.5 rounded-full border-[1.5px] border-border-champ px-3.5 ${
        desactive ? "opacity-40" : ""
      }`}
      accessibilityRole="button"
      accessibilityLabel={`${TEXTES.telecharger} en ${format === "pdf" ? "PDF" : "Word"}`}
      accessibilityState={{ busy: enCours, disabled: desactive }}
    >
      <Icone nom="importer" couleur={couleurs.texte} taille={13} graisse="semibold" />
      <Texte className="font-bold text-footnote text-foreground">
        {enCours ? "…" : format === "pdf" ? "PDF" : "Word"}
      </Texte>
    </Pressable>
  );
}
