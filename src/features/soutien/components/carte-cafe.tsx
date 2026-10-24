/**
 * La carte « offrir un café » du profil — elle remplace la carte
 * d'abonnement : Karria reste gratuit, et l'on peut soutenir l'équipe.
 *
 * ═══ Ce qu'elle montre ═══
 *
 * Une tasse et « OFFRIR UN CAFÉ » en petites capitales dorées, une
 * promesse en grand (« Karria reste gratuit »), l'invitation, trois
 * tailles de café à choisir, et un seul bouton. Tant que l'achat intégré
 * n'est pas branché, le bouton dit « Bientôt » et ne répond pas.
 *
 * Après un café : un cœur, un merci sincère, et « En offrir un autre »
 * en discret — le merci occupe la carte, il ne disparaît pas tout seul.
 *
 * ═══ Le dégradé ═══
 *
 * Le voile de l'aura, comme l'ancienne carte Premium, mais réchauffé d'or
 * vers le bas : le café. Dessiné en SVG parce que `react-native-svg` ne
 * lit pas de classe ; ses couleurs viennent de `theme/index.ts`,
 * l'exception prévue par §3.3. Plus opaque en sombre, comme l'aura.
 *
 * ═══ Les tasses en émoji ═══
 *
 * « ☕ / ☕☕ / ☕☕☕ » se lit d'un coup d'œil, partout, sans icône à
 * dessiner. Elles sont masquées au lecteur d'écran, qui lit « Deux
 * cafés » à la place.
 */

import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { AURA, PREMIUM } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import {
  libelleDOffre,
  nomDesTasses,
  tassesDessinees,
  TEXTES,
} from "../services/presentation";

const VOILE = { light: 0.1, dark: 0.22 } as const;

/** Le fond de la carte : bordure, surface, et le voile en dégradé. */
function Enveloppe({ children }: { children: ReactNode }) {
  const { mode } = useCouleurs();
  return (
    <Box className="overflow-hidden rounded-lg border border-border-subtle bg-card">
      {/* Le SVG remplit un cadre absolu mesuré par la carte : posé seul en
          absolu, il gardait sa hauteur du premier rendu et le voile
          s'arrêtait net à mi-carte. */}
      <Box className="absolute inset-0" pointerEvents="none">
        <Svg width="100%" height="100%" accessible={false}>
          <Defs>
            <LinearGradient id="voile-cafe" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={AURA.bleu} stopOpacity={VOILE[mode]} />
              <Stop
                offset="0.5"
                stopColor={AURA.violet}
                stopOpacity={VOILE[mode] * 0.5}
              />
              <Stop
                offset="1"
                stopColor={PREMIUM[mode]}
                stopOpacity={VOILE[mode] * 0.8}
              />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#voile-cafe)" />
        </Svg>
      </Box>
      <VStack className="gap-4 p-5">{children}</VStack>
    </Box>
  );
}

export function CarteCafe({ soutien }: { soutien: Soutien }) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const or = PREMIUM[couleurs.mode];
  const { catalogue, choix, offreChoisie, envoi, merci, erreur } = soutien;

  if (catalogue === null) {
    return (
      <Enveloppe>
        <Box className="h-3 w-28 rounded-full bg-remplissage" />
        <Box className="h-7 w-48 rounded-full bg-remplissage" />
        <Box className="h-4 w-full rounded-full bg-remplissage-doux" />
      </Enveloppe>
    );
  }

  if (merci) {
    return (
      <Enveloppe>
        <Animated.View entering={reduit ? undefined : FadeIn.duration(320)}>
          <VStack className="items-center gap-3 py-2">
            <Box className="h-16 w-16 items-center justify-center rounded-full bg-surface-primary">
              <Icone nom="coeurPlein" couleur={couleurs.primaire} taille={28} />
            </Box>
            <Texte className="text-center font-display text-title tracking-tight text-foreground">
              {TEXTES.merciTitre}
            </Texte>
            <Texte className="text-center text-body leading-6 text-muted-foreground">
              {TEXTES.merciTexte}
            </Texte>
          </VStack>
        </Animated.View>
        <BoutonAction
          libelle={TEXTES.encoreUn}
          ton="discret"
          onPress={soutien.recommencer}
        />
      </Enveloppe>
    );
  }

  const disponible = catalogue.disponible;

  return (
    <Enveloppe>
      <VStack className="gap-1">
        <HStack className="items-center gap-1.5">
          <Icone nom="tasse" couleur={or} taille={13} graisse="semibold" />
          <Texte className="font-bold text-caption uppercase tracking-widest text-premium">
            {TEXTES.surtitre}
          </Texte>
        </HStack>
        <Texte className="font-display text-title tracking-tight text-foreground">
          {TEXTES.titre}
        </Texte>
      </VStack>

      <Texte className="text-body leading-6 text-muted-foreground">
        {TEXTES.invitation}
      </Texte>

      <HStack className="gap-2" accessibilityRole="radiogroup">
        {catalogue.offres.map((offre) => {
          const actif = offre.tasses === choix;
          return (
            <Pressable
              key={offre.produitId}
              onPress={() => soutien.choisir(offre.tasses)}
              className={`min-h-20 flex-1 items-center justify-center gap-1 rounded-md border px-2 py-3 ${
                actif
                  ? "border-primary bg-surface-primary"
                  : "border-border-subtle bg-remplissage-doux"
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected: actif }}
              accessibilityLabel={
                offre.prix === null
                  ? nomDesTasses(offre.tasses)
                  : `${nomDesTasses(offre.tasses)}, ${offre.prix}`
              }
            >
              <Texte className="text-callout" accessible={false}>
                {tassesDessinees(offre.tasses)}
              </Texte>
              <Texte
                className={`font-bold text-caption ${actif ? "text-primary" : "text-foreground"}`}
                numberOfLines={1}
              >
                {offre.prix ?? nomDesTasses(offre.tasses)}
              </Texte>
            </Pressable>
          );
        })}
      </HStack>

      <VStack className="gap-2">
        <BoutonAction
          libelle={libelleDOffre(offreChoisie, disponible)}
          ton="secondaire"
          enCours={envoi}
          desactive={!disponible}
          onPress={disponible ? soutien.offrir : undefined}
          accessibilityHint={disponible ? undefined : TEXTES.bientot}
        />
        {erreur !== null ? (
          <Texte className="text-center text-footnote text-destructive">{erreur}</Texte>
        ) : null}
        <Texte className="text-center text-footnote text-foreground-faint">
          {disponible ? TEXTES.promesse : `${TEXTES.bientot} ${TEXTES.promesse}`}
        </Texte>
      </VStack>
    </Enveloppe>
  );
}
