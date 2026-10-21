/**
 * La carte d'abonnement du profil — la « carte abonnement r32 » de la V1,
 * poussée vers le premium.
 *
 * ═══ Ce qu'elle montre ═══
 *
 * Une couronne et « KARRIA PREMIUM » en petites capitales dorées, le plan
 * courant en grand, une phrase d'état honnête, les trois avantages à
 * venir, et un bouton. Tant que le paiement n'est pas ouvert, le bouton
 * dit « Bientôt » et ne répond pas : on ne vend rien qu'on ne peut pas
 * encaisser.
 *
 * ═══ Le dégradé ═══
 *
 * Un voile bleu → violet, très léger, posé derrière le contenu : la
 * signature de l'aura, en version carte. Il est dessiné en SVG parce que
 * `react-native-svg` ne lit pas de classe ; ses couleurs viennent de
 * `theme/index.ts`, l'exception prévue par §3.3. Son opacité est plus
 * forte en sombre, comme celle de l'aura — la même valeur paraît deux
 * fois plus faible sur fond nuit.
 */

import type { ReactNode } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { AURA, PREMIUM } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import {
  actionDeLaCarte,
  AVANTAGES_A_VENIR,
  libellePlan,
  phraseDEtat,
} from "../services/presentation";
import type { Abonnement } from "../types/abonnement.types";

const VOILE = { light: 0.1, dark: 0.22 } as const;

/** Le fond de la carte : bordure, surface, et le voile en dégradé. */
function Enveloppe({ children }: { children: ReactNode }) {
  const { mode } = useCouleurs();
  return (
    <Box className="overflow-hidden rounded-lg border border-border-subtle bg-card">
      <Svg
        // Plein cadre, en style : un SVG absolu n'a pas de classe à lire.
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        width="100%"
        height="100%"
        accessible={false}
      >
        <Defs>
          <LinearGradient id="voile-premium" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={AURA.bleu} stopOpacity={VOILE[mode]} />
            <Stop offset="0.55" stopColor={AURA.violet} stopOpacity={VOILE[mode] * 0.6} />
            <Stop offset="1" stopColor={AURA.glacier} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#voile-premium)" />
      </Svg>
      <VStack className="gap-4 p-5">{children}</VStack>
    </Box>
  );
}

interface Props {
  /** `null` : on charge encore, la carte montre un squelette. */
  abonnement: Abonnement | null;
  /** Le geste du bouton quand il répond — ouvrir l'offre ou la gestion. */
  onAction?: () => void;
}

export function CarteAbonnement({ abonnement, onAction }: Props) {
  const couleurs = useCouleurs();
  const or = PREMIUM[couleurs.mode];

  if (abonnement === null) {
    return (
      <Enveloppe>
        <Box className="h-3 w-28 rounded-full bg-remplissage" />
        <Box className="h-7 w-40 rounded-full bg-remplissage" />
        <Box className="h-4 w-full rounded-full bg-remplissage-doux" />
      </Enveloppe>
    );
  }

  const action = actionDeLaCarte(abonnement);

  return (
    <Enveloppe>
      <HStack className="items-start justify-between gap-3">
        <VStack className="flex-1 gap-1">
          <HStack className="items-center gap-1.5">
            <Icone nom="couronne" couleur={or} taille={13} graisse="semibold" />
            <Texte className="font-bold text-caption uppercase tracking-widest text-premium">
              Karria Premium
            </Texte>
          </HStack>
          <Texte className="font-display text-title tracking-tight text-foreground">
            {libellePlan(abonnement)}
          </Texte>
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {phraseDEtat(abonnement)}
          </Texte>
        </VStack>
        <Box className="rounded-pastille bg-surface-primary px-2.5 py-1">
          <Texte className="font-bold text-caption text-primary">
            {abonnement.plan === "premium" ? "Premium" : "Inclus"}
          </Texte>
        </Box>
      </HStack>

      <VStack className="gap-2.5">
        <Texte className="font-bold text-caption uppercase tracking-wide text-foreground-faint">
          {abonnement.plan === "premium" ? "Tes avantages" : "Bientôt dans Premium"}
        </Texte>
        {AVANTAGES_A_VENIR.map((avantage) => (
          <HStack key={avantage.icone} className="items-center gap-3">
            <Box className="h-8 w-8 items-center justify-center rounded-full bg-remplissage">
              <Icone nom={avantage.icone} couleur={couleurs.primaire} taille={14} />
            </Box>
            <Texte className="flex-1 text-footnote text-foreground">
              {avantage.titre}
            </Texte>
          </HStack>
        ))}
      </VStack>

      <BoutonAction
        libelle={action.libelle}
        ton="secondaire"
        desactive={!action.active}
        onPress={action.active ? onAction : undefined}
        accessibilityHint={
          action.active ? undefined : "Le paiement n'est pas encore ouvert."
        }
      />
    </Enveloppe>
  );
}
