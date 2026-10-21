/**
 * Karria qui parle : l'orbe vivante, et sa phrase qui se déroule.
 *
 * Les mots apparaissent l'un après l'autre (35 ms d'écart), comme une
 * voix : on lit au rythme où Karria « dit », et chaque nouvelle question
 * se remarque sans qu'on ait à chercher ce qui a changé. La phrase est la
 * clé du bloc : une nouvelle phrase rejoue l'animation, la même non.
 *
 * Pendant que Karria réfléchit, l'orbe accélère — la même orbe que le
 * bouton du fil et que l'agent : un seul personnage partout.
 */

import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

interface Props {
  parole: string;
  aide: string | null;
  reflechit: boolean;
}

export function ParoleKarria({ parole, aide, reflechit }: Props) {
  const reduit = useReducedMotion();
  const mots = parole.split(" ");

  return (
    <VStack className="items-center gap-3 px-6">
      {/* La boîte de l'orbe fait deux fois la sphère : on rogne le halo
          pour garder la phrase près d'elle. */}
      <Box className="-my-9">
        <OrbeVivante taille={72} active={reflechit}>
          <SymboleKarria taille={28} teinte="reflet" />
        </OrbeVivante>
      </Box>

      <HStack
        key={parole}
        className="flex-wrap justify-center"
        accessible
        accessibilityLabel={parole}
        accessibilityLiveRegion="polite"
      >
        {mots.map((mot, i) => (
          <Animated.View
            // Deux mots identiques dans la phrase : l'index les distingue.
            key={`${i}-${mot}`}
            entering={reduit ? undefined : FadeIn.duration(260).delay(i * 35)}
          >
            <Texte className="font-display text-title-sm leading-8 text-foreground">
              {mot}
              {i < mots.length - 1 ? " " : ""}
            </Texte>
          </Animated.View>
        ))}
      </HStack>

      {aide !== null ? (
        <Animated.View
          key={`aide-${parole}`}
          entering={
            reduit ? undefined : FadeIn.duration(320).delay(mots.length * 35 + 120)
          }
        >
          <Texte className="text-center text-footnote leading-5 text-muted-foreground">
            {aide}
          </Texte>
        </Animated.View>
      ) : null}
    </VStack>
  );
}
