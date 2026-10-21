/**
 * L'en-tête des onglets — le `KarriaHeader` de la V1.
 *
 * Un grand titre (30, très gras, serré), un sous-titre en petites
 * capitales espacées, un badge facultatif (« Mise à jour », « Karria :
 * <requête> »), et une zone à droite pour les boutons. Il entre comme dans
 * la V1 : fondu de 400 ms et montée de 10 pt en ressort.
 *
 * Partagé par tous les onglets — Offres, Dossiers, CV, Modèles, Profil —
 * pour qu'ils parlent tous la même langue visuelle.
 */

import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, { FadeInUp, useReducedMotion } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

export interface BadgeEnTete {
  libelle: string;
  /** Un point qui pulse : quelque chose est en cours. */
  point?: boolean;
  /** Rend le badge fermable (×). */
  onFermer?: () => void;
}

interface Props {
  titre: string;
  sousTitre?: string;
  badge?: BadgeEnTete;
  droite?: ReactNode;
}

export function EnTeteKarria({ titre, sousTitre, badge, droite }: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();

  return (
    <Animated.View entering={reduit ? undefined : FadeInUp.duration(400).springify()}>
      <HStack space="md" className="items-center justify-between px-4 py-2">
        <VStack className="flex-1">
          <Texte
            accessibilityRole="header"
            className="font-display text-title-lg tracking-tighter text-foreground"
            numberOfLines={1}
          >
            {titre}
          </Texte>
          {sousTitre !== undefined ? (
            <Texte
              className="font-bold text-caption uppercase tracking-wide text-muted-foreground"
              numberOfLines={1}
            >
              {sousTitre}
            </Texte>
          ) : null}
        </VStack>
        {badge !== undefined ? (
          <Pressable
            onPress={badge.onFermer}
            disabled={badge.onFermer === undefined}
            className="flex-row items-center gap-1.5 rounded-full border border-primary bg-surface-primary px-3 py-1.5"
            accessibilityRole={badge.onFermer ? "button" : "text"}
            accessibilityLabel={
              badge.onFermer ? `${badge.libelle}, retirer` : badge.libelle
            }
          >
            {badge.point ? <Box className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
            <Texte className="font-bold text-caption text-primary" numberOfLines={1}>
              {badge.libelle}
            </Texte>
            {badge.onFermer ? (
              <Icone nom="fermer" couleur={couleurs.primaire} taille={12} />
            ) : null}
          </Pressable>
        ) : null}
        {droite}
      </HStack>
    </Animated.View>
  );
}

/** Le bouton rond des en-têtes (`HeaderIconButton` de la V1) : 40 pt,
 *  fond teinté, enfoncement à la pression, point rouge facultatif. */
export function BoutonEnTeteRond({
  onPress,
  libelle,
  children,
  point = false,
}: {
  onPress: () => void;
  libelle: string;
  children: ReactNode;
  point?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      className="h-10 w-10 items-center justify-center rounded-full bg-remplissage active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={libelle}
    >
      {children}
      {point ? (
        <Box className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive" />
      ) : null}
    </Pressable>
  );
}
