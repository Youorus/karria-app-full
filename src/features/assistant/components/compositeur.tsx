/**
 * Le compositeur : la capsule où l'on écrit à Karria.
 *
 * ═══ Le verre ═══
 *
 * Sur iOS 26 et suivants, la capsule est en « Liquid Glass » natif : la
 * conversation et l'aura glissent dessous, déformées par le verre. C'est
 * le matériau que le système emploie lui-même pour ce qui flotte
 * au-dessus d'un contenu, et rien ne s'intègre mieux au téléphone. Ailleurs
 * — Android, iOS plus ancien —, une surface translucide (`bg-verre`) en
 * reprend l'esprit sans prétendre l'imiter.
 *
 * ═══ Le bouton d'envoi ═══
 *
 * Le seul élément bleu plein de l'écran, donc la seule action principale.
 * Désactivé — et estompé — tant qu'il n'y a rien à envoyer ou que Karria
 * répond : un envoi pendant la réponse croiserait deux fils.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Pressable, TextInput } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

interface Props {
  valeur: string;
  onChange: (texte: string) => void;
  onEnvoyer: () => void;
  peutEnvoyer: boolean;
}

/** Lu une fois : la disponibilité du verre ne change pas pendant la vie
 *  de l'application. */
const VERRE = isLiquidGlassAvailable();

function Fleche({ couleur }: { couleur: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19V5M5.5 11.5 12 5l6.5 6.5"
        stroke={couleur}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Capsule({ children }: { children: ReactNode }) {
  if (VERRE) {
    return (
      // Le rayon en style : `GlassView` dessine sa forme lui-même et ne
      // lit pas les classes.
      <GlassView glassEffectStyle="regular" isInteractive style={{ borderRadius: 30 }}>
        {children}
      </GlassView>
    );
  }
  return (
    <Box className="rounded-lg border border-border-subtle bg-verre">{children}</Box>
  );
}

export function Compositeur({ valeur, onChange, onEnvoyer, peutEnvoyer }: Props) {
  const couleurs = useCouleurs();

  return (
    <Capsule>
      <HStack className="min-h-champ items-end py-1.5 pl-5 pr-1.5">
        <TextInput
          value={valeur}
          onChangeText={onChange}
          placeholder="Dis-moi ce que tu cherches…"
          placeholderTextColor={couleurs.estompe}
          selectionColor={couleurs.primaire}
          multiline
          maxLength={2_000}
          className="max-h-32 flex-1 py-2.5 font-sans text-callout text-foreground"
          accessibilityLabel="Ton message pour Karria"
        />
        <Pressable
          onPress={onEnvoyer}
          disabled={!peutEnvoyer}
          hitSlop={6}
          className={`ml-2 h-11 w-11 items-center justify-center rounded-full bg-primary ${
            peutEnvoyer ? "" : "opacity-40"
          }`}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          accessibilityState={{ disabled: !peutEnvoyer }}
        >
          <Fleche couleur={couleurs.surPrimaire} />
        </Pressable>
      </HStack>
    </Capsule>
  );
}
