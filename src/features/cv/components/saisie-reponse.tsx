/**
 * Répondre à Karria : écrire, ou parler.
 *
 * ═══ Le micro d'abord ═══
 *
 * Champ vide, le gros bouton est le **micro** : parler est plus facile
 * qu'écrire pour beaucoup de gens, et c'est à eux que Karria s'adresse
 * d'abord. Dès qu'on tape une lettre, il devient la flèche d'envoi.
 *
 * ═══ Pendant l'écoute ═══
 *
 * Le champ cède la place à une onde qui suit la voix (le niveau du micro,
 * lu toutes les 80 ms) et le bouton devient « arrêter ». Sans onde, on
 * ne sait pas si le téléphone écoute.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, type ReactNode } from "react";
import { Pressable, TextInput } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

const VERRE = isLiquidGlassAvailable();

/** Le profil de l'onde : le centre bouge plus que les bords. */
const BARRES = [0.35, 0.55, 0.8, 1, 0.7, 0.9, 0.6, 1, 0.75, 0.5, 0.85, 0.45, 0.3];

function Capsule({ children }: { children: ReactNode }) {
  if (VERRE) {
    return (
      // Le rayon en style : `GlassView` dessine sa forme et ne lit pas les classes.
      <GlassView glassEffectStyle="regular" isInteractive style={{ borderRadius: 30 }}>
        {children}
      </GlassView>
    );
  }
  return (
    <Box className="rounded-lg border border-border-subtle bg-verre">{children}</Box>
  );
}

function Barre({ niveau, poids }: { niveau: SharedValue<number>; poids: number }) {
  const style = useAnimatedStyle(() => ({
    height: 4 + niveau.value * 26 * poids,
  }));
  return <Animated.View style={style} className="w-[3px] rounded-full bg-primary" />;
}

function Onde({ niveau }: { niveau: number }) {
  const anime = useSharedValue(0);
  useEffect(() => {
    anime.set(withTiming(niveau, { duration: 90 }));
  }, [niveau, anime]);
  return (
    <HStack className="h-9 flex-1 items-center justify-center gap-[5px]">
      {BARRES.map((poids, i) => (
        <Barre key={i} niveau={anime} poids={poids} />
      ))}
    </HStack>
  );
}

interface Props {
  valeur: string;
  onChange: (t: string) => void;
  onEnvoyer: () => void;
  onMicro: () => void;
  ecoute: boolean;
  niveau: number;
  occupe: boolean;
  enCorrection: boolean;
}

export function SaisieReponse({
  valeur,
  onChange,
  onEnvoyer,
  onMicro,
  ecoute,
  niveau,
  occupe,
  enCorrection,
}: Props) {
  const couleurs = useCouleurs();
  const ecrit = valeur.trim() !== "";

  return (
    <Capsule>
      <HStack className="min-h-champ items-end py-1.5 pl-5 pr-1.5">
        {ecoute ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            className="flex-1 flex-row items-center gap-3"
          >
            <Onde niveau={niveau} />
            <Texte className="text-caption text-muted-foreground">
              Je t&apos;écoute…
            </Texte>
          </Animated.View>
        ) : (
          <TextInput
            value={valeur}
            onChangeText={onChange}
            editable={!occupe}
            placeholder={enCorrection ? "Ce qui ne va pas…" : "Écris ou parle-moi…"}
            placeholderTextColor={couleurs.estompe}
            selectionColor={couleurs.primaire}
            multiline
            maxLength={1_500}
            className="max-h-32 flex-1 py-2.5 font-sans text-callout text-foreground"
            accessibilityLabel="Ta réponse pour Karria"
          />
        )}
        <Pressable
          onPress={ecrit && !ecoute ? onEnvoyer : onMicro}
          disabled={occupe}
          hitSlop={6}
          className={`ml-2 h-11 w-11 items-center justify-center rounded-full ${
            ecoute ? "bg-destructive" : "bg-primary"
          } ${occupe ? "opacity-40" : ""}`}
          accessibilityRole="button"
          accessibilityLabel={
            ecoute ? "Arrêter et envoyer" : ecrit ? "Envoyer" : "Répondre à la voix"
          }
          accessibilityState={{ disabled: occupe }}
        >
          <Icone
            nom={ecoute ? "arreter" : ecrit ? "envoyer" : "micro"}
            couleur={couleurs.surPrimaire}
            taille={ecoute ? 15 : 18}
            graisse="bold"
          />
        </Pressable>
      </HStack>
    </Capsule>
  );
}
