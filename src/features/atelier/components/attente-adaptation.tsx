/**
 * L'attente pendant que Karria adapte le CV — et l'échec, s'il vient.
 *
 * ═══ Immersive, honnête ═══
 *
 * L'orbe active au centre, une phrase qui dit **ce qui se passe** (l'offre
 * et le CV sont lus, des ajustements sont préparés), rien d'inventé : pas
 * de barre de progression, pas d'étapes pré-écrites. Dessous, une annonce
 * native quand il y en a une — l'attente est le seul moment de l'atelier
 * sans geste en cours, et aucun bouton n'est en dessous d'elle.
 *
 * ═══ L'échec ═══
 *
 * Le dossier existe, tel quel. Deux voies, comme toujours : relancer
 * Karria, ou continuer à la main. Le bouton bleu est « Réessayer » ; l'autre
 * est un contour.
 */

import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";

import { TEXTES } from "../services/presentation";

interface Props {
  etat: "en_cours" | "echouee";
  annonce: NativeAd | null;
  relance: boolean;
  onReessayer: () => void;
  onContinuer: () => void;
}

export function AttenteAdaptation({
  etat,
  annonce,
  relance,
  onReessayer,
  onContinuer,
}: Props) {
  const reduit = useReducedMotion();
  const enCours = etat === "en_cours";
  return (
    <Box style={{ flex: 1 }} className="justify-center gap-8 px-6 pb-8">
      <Animated.View entering={reduit ? undefined : FadeIn.duration(400)}>
        <VStack className="items-center gap-6">
          <OrbeVivante taille={120} active={enCours}>
            <SymboleKarria taille={44} teinte="reflet" />
          </OrbeVivante>
          <VStack className="items-center gap-2">
            <Texte
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              className="text-center font-display text-title-sm tracking-tight text-foreground"
            >
              {enCours ? TEXTES.attenteTitre : TEXTES.echecTitre}
            </Texte>
            <Texte className="text-center text-body leading-6 text-muted-foreground">
              {enCours ? TEXTES.attentePhrase : TEXTES.echecPhrase}
            </Texte>
          </VStack>
        </VStack>
      </Animated.View>

      {enCours && annonce !== null ? (
        <Animated.View entering={reduit ? undefined : FadeInDown.duration(380)}>
          <CarteAnnonce annonce={annonce} />
        </Animated.View>
      ) : null}

      {!enCours ? (
        <VStack className="gap-3">
          <BoutonAction
            libelle={TEXTES.reessayer}
            onPress={onReessayer}
            enCours={relance}
            libelleEnCours="Karria relit…"
          />
          <BoutonAction
            libelle={TEXTES.continuerALaMain}
            ton="secondaire"
            onPress={onContinuer}
          />
        </VStack>
      ) : null}
    </Box>
  );
}
