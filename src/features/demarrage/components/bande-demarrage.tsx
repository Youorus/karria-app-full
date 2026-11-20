/**
 * Une bande d'information posée en haut, par-dessus la navigation, qui ne
 * bloque rien : une phrase, une action, une croix.
 *
 * ═══ Deux usages, une bande ═══
 *
 * « Une amélioration est prête — Relancer » (mise à jour EAS téléchargée)
 * et « Une nouvelle version est disponible — Mettre à jour » (magasin).
 * Même forme que la bannière de notification (`banniere-notification.tsx`)
 * : la carte flottante en haut est déjà le langage de l'application pour
 * « quelque chose à savoir, pas à subir ». Elle glisse depuis le haut et
 * se retire de même ; mouvement réduit respecté.
 *
 * La croix est une cible de 48 pt : refuser doit être aussi facile
 * qu'accepter, sinon la bande devient une injonction.
 *
 * ═══ Un troisième usage : la connexion ═══
 *
 * « Pas de connexion », « Connexion instable », « Connexion rétablie »
 * (`components/bandeau-connexion.tsx`) : la même carte, sans action — il
 * n'y a rien à faire, seulement à savoir — et précédée d'une icône. Sans
 * bouton d'action, la carte perd sa marge verticale : elle fait à peu près la
 * hauteur de la croix. `libelleAction` et `onAction` vont ensemble ; sans
 * `onFermer`, pas de croix (un message qui s'efface seul).
 */

import { Pressable } from "react-native";
import Animated, { ReduceMotion, SlideInUp, SlideOutUp } from "react-native-reanimated";

import { Icone, type NomIcone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

interface Props {
  visible: boolean;
  phrase: string;
  /** Décorative, devant la phrase. */
  icone?: NomIcone;
  libelleAction?: string;
  onAction?: () => void;
  onFermer?: () => void;
  /** Le libellé de la croix pour un lecteur d'écran. */
  libelleFermer?: string;
}

export function BandeDemarrage({
  visible,
  phrase,
  icone,
  libelleAction,
  onAction,
  onFermer,
  libelleFermer = "Fermer",
}: Props) {
  const couleurs = useCouleurs();
  if (!visible) return null;
  const action = libelleAction !== undefined && onAction !== undefined;

  return (
    <Box className="absolute left-0 right-0 top-0 px-4 pt-safe" pointerEvents="box-none">
      <Animated.View
        entering={SlideInUp.duration(260).reduceMotion(ReduceMotion.System)}
        exiting={SlideOutUp.duration(200).reduceMotion(ReduceMotion.System)}
      >
        <HStack
          className={
            action
              ? "mt-2 items-center gap-3 rounded-carte border border-border-subtle bg-popover py-2 pl-4 pr-1"
              : onFermer === undefined
                ? "mt-2 min-h-touch items-center gap-3 rounded-carte border border-border-subtle bg-popover px-4 py-1"
                : "mt-2 min-h-touch items-center gap-3 rounded-carte border border-border-subtle bg-popover py-1 pl-4 pr-1"
          }
        >
          {icone === undefined ? null : (
            <Icone nom={icone} couleur={couleurs.estompe} taille={18} />
          )}
          <Texte
            className="flex-1 text-callout text-popover-foreground"
            numberOfLines={2}
            // Sur le texte, pas sur la carte : une vue qui n'est pas un
            // élément d'accessibilité ne porte aucun rôle, et les lecteurs
            // d'écran l'ignoraient (même choix que `message-erreur.tsx`).
            accessibilityRole="alert"
          >
            {phrase}
          </Texte>
          {action ? (
            <Pressable
              onPress={onAction}
              className="min-h-[40px] justify-center rounded-full bg-surface-primary px-3"
              accessibilityRole="button"
              accessibilityLabel={libelleAction}
            >
              <Texte className="font-bold text-callout text-primary" numberOfLines={1}>
                {libelleAction}
              </Texte>
            </Pressable>
          ) : null}
          {onFermer === undefined ? null : (
            <Pressable
              onPress={onFermer}
              className="h-12 w-12 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={libelleFermer}
            >
              <Icone nom="fermer" couleur={couleurs.estompe} taille={14} />
            </Pressable>
          )}
        </HStack>
      </Animated.View>
    </Box>
  );
}
