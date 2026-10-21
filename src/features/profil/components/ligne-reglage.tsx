/**
 * Une ligne de réglage, et le groupe qui les empile.
 *
 * ═══ Pourquoi un composant ═══
 *
 * L'écran des paramètres aligne huit lignes qui se ressemblent : une
 * icône dans une tuile, un titre, parfois un état, et à droite une
 * action — un chevron, un mot bleu, rien. Les écrire huit fois, c'est huit
 * hauteurs de tuile à garder égales. Le groupe pose les séparateurs entre
 * elles, pour que personne n'ait à compter « sauf la dernière ».
 *
 * ═══ Le ton ═══
 *
 * `destructif` passe l'icône et le titre en rouge : la déconnexion et la
 * suppression se repèrent avant d'être lues. Le reste est neutre.
 */

import { Children, type ReactNode } from "react";
import { Pressable } from "react-native";

import { Icone, type NomIcone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

interface Props {
  icone: NomIcone;
  titre: string;
  /** L'état courant, sous le titre (« Activées », « v2.0.0 »). */
  detail?: string | null;
  /** Le mot à droite (« Activer »). Sans lui, un chevron si la ligne répond. */
  action?: string | null;
  onPress?: () => void;
  ton?: "neutre" | "destructif";
}

export function LigneReglage({
  icone,
  titre,
  detail,
  action,
  onPress,
  ton = "neutre",
}: Props) {
  const couleurs = useCouleurs();
  const rouge = ton === "destructif";
  const repond = onPress !== undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={!repond}
      className="min-h-touch flex-row items-center gap-3 px-4 py-3 active:opacity-70"
      accessibilityRole={repond ? "button" : "text"}
      accessibilityLabel={detail ? `${titre}, ${detail}` : titre}
      accessibilityHint={action ?? undefined}
    >
      <Box
        className={`h-9 w-9 items-center justify-center rounded-pastille ${
          rouge ? "bg-surface-destructive" : "bg-remplissage"
        }`}
      >
        <Icone
          nom={icone}
          couleur={rouge ? couleurs.destructif : couleurs.primaire}
          taille={16}
        />
      </Box>
      <VStack className="flex-1 gap-0.5">
        <Texte
          className={`font-bold text-body ${rouge ? "text-destructive" : "text-foreground"}`}
        >
          {titre}
        </Texte>
        {detail ? (
          <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
            {detail}
          </Texte>
        ) : null}
      </VStack>
      {action ? (
        <Texte className="font-bold text-footnote text-primary">{action}</Texte>
      ) : repond && !rouge ? (
        <Icone nom="suivant" couleur={couleurs.estompe} taille={13} graisse="semibold" />
      ) : null}
    </Pressable>
  );
}

/** Un titre en petites capitales et une carte qui empile ses lignes. */
export function GroupeReglages({
  titre,
  children,
}: {
  titre?: string;
  children: ReactNode;
}) {
  const lignes = Children.toArray(children);
  return (
    <VStack className="gap-2">
      {titre ? (
        <Texte className="px-1 font-bold text-caption uppercase tracking-wide text-foreground-faint">
          {titre}
        </Texte>
      ) : null}
      <VStack className="overflow-hidden rounded-carte border border-border-subtle bg-card">
        {lignes.map((ligne, i) => (
          <Box key={i}>
            {i > 0 ? <Box className="ml-16 h-px bg-border-subtle" /> : null}
            {ligne}
          </Box>
        ))}
      </VStack>
    </VStack>
  );
}
