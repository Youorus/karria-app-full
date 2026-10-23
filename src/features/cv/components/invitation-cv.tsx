/**
 * L'invitation : l'onglet CV quand il n'y a pas encore de CV.
 *
 * ═══ Donner envie, pas expliquer ═══
 *
 * Derrière l'orbe, trois pages de CV flottent, encore vides — des lignes
 * grises qui attendent d'être écrites. On voit ce qu'on va obtenir avant
 * d'avoir rien fait, et l'orbe au premier plan dit qui va l'écrire. Une
 * seule phrase, une seule action : le reste (durée, voix, pause) tient en
 * une ligne, parce que c'est ce qui rassure.
 *
 * « J'ai déjà un CV » est la seconde porte, en retrait : Karria lit le
 * fichier et pré-remplit la conversation, mais c'est toujours la même
 * conversation qui suit — rien n'est validé sans qu'on l'ait relu.
 *
 * Mouvement réduit : les pages restent immobiles.
 */

import { useEffect } from "react";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

/** Trois pages : décalage, inclinaison, phase de flottaison. */
const PAGES = [
  { x: -78, y: 14, angle: -9, phase: 0 },
  { x: 78, y: 10, angle: 8, phase: 0.33 },
  { x: 0, y: -18, angle: 0, phase: 0.66 },
] as const;

const LIGNES = ["w-1/2", "w-3/4", "w-full", "w-5/6", "w-2/3", "w-full", "w-3/5"];

function Page({
  temps,
  page,
}: {
  temps: SharedValue<number>;
  page: (typeof PAGES)[number];
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: page.x },
      { translateY: page.y + Math.sin((temps.value + page.phase) * Math.PI * 2) * 6 },
      { rotate: `${page.angle}deg` },
    ],
  }));
  return (
    <Animated.View style={style} className="absolute">
      <VStack className="h-[176px] w-[128px] gap-2 rounded-tuile border border-border-subtle bg-card p-3">
        <Box className="mb-1 h-6 w-6 rounded-full bg-remplissage" />
        {LIGNES.map((largeur, i) => (
          <Box key={i} className={`h-1.5 rounded-full bg-remplissage ${largeur}`} />
        ))}
      </VStack>
    </Animated.View>
  );
}

interface Props {
  reprendre: boolean;
  onCreer: () => void;
  onImporter: () => void;
  /** Le fichier est en route vers Karria. */
  importation: boolean;
  /** Pourquoi l'import a échoué, et quoi faire. */
  probleme: string | null;
}

export function InvitationCv({
  reprendre,
  onCreer,
  onImporter,
  importation,
  probleme,
}: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const temps = useSharedValue(0);

  useEffect(() => {
    if (reduit) return;
    temps.set(withRepeat(withTiming(1, { duration: 6_000, easing: Easing.linear }), -1));
  }, [reduit, temps]);

  return (
    <VStack className="flex-1 items-center justify-center gap-8 px-6 pb-28">
      <Box className="h-[230px] w-full items-center justify-center">
        {PAGES.map((p) => (
          <Page key={p.phase} temps={temps} page={p} />
        ))}
        <OrbeVivante taille={84}>
          <SymboleKarria taille={32} teinte="reflet" />
        </OrbeVivante>
      </Box>

      <Animated.View entering={reduit ? undefined : FadeInDown.duration(500).delay(150)}>
        <VStack className="items-center gap-2">
          <Texte
            accessibilityRole="header"
            className="text-center font-display text-title-lg tracking-tight text-foreground"
          >
            {reprendre ? "On reprend ton CV ?" : "Ton CV, en parlant."}
          </Texte>
          <Texte className="text-center text-body leading-6 text-muted-foreground">
            {reprendre
              ? "Tout ce que tu m'as dit est gardé. On continue là où on s'était arrêtés."
              : "Quelques questions, quelques minutes. Je l'écris, tu valides."}
          </Texte>
        </VStack>
      </Animated.View>

      <Animated.View
        entering={reduit ? undefined : FadeInDown.duration(500).delay(300)}
        className="w-full gap-3"
      >
        <BoutonAction
          libelle={reprendre ? "Reprendre mon CV" : "Créer mon CV avec Karria"}
          onPress={onCreer}
          desactive={importation}
          icone={<Icone nom="micro" couleur={couleurs.surPrimaire} taille={16} />}
        />
        <BoutonAction
          libelle="J'ai déjà un CV"
          libelleEnCours="Je lis ton CV…"
          ton="secondaire"
          onPress={onImporter}
          enCours={importation}
          icone={<Icone nom="importer" couleur={couleurs.texte} taille={16} />}
        />
        {probleme !== null ? (
          <Texte className="text-center text-footnote text-destructive">{probleme}</Texte>
        ) : (
          <Texte className="text-center text-caption text-foreground-faint">
            À l&apos;écrit ou à la voix · tu peux t&apos;arrêter quand tu veux
          </Texte>
        )}
      </Animated.View>
    </VStack>
  );
}
