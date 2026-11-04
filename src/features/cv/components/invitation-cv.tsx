/**
 * L'invitation : l'onglet CV quand il n'y a pas encore de CV.
 *
 * ═══ L'import d'abord ═══
 *
 * Décision de Marc (2026-11-04, essai sur appareil) : répondre à toutes les
 * questions est long, et la plupart des gens ont déjà un CV. La porte
 * principale est donc **importer ou photographier** son CV : Karria en fait
 * un CV compatible ATS, sur ses modèles, plus vite qu'en répondant. « Créer
 * de zéro » reste là, en retrait, pour qui n'a rien.
 *
 * Le texte est court et sans emphase : une promesse, une comparaison, deux
 * boutons. Derrière l'orbe, trois pages de CV flottent, encore vides.
 *
 * Mouvement réduit : les pages restent immobiles.
 */

import { useEffect } from "react";
import { Pressable } from "react-native";
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
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { SourceImport } from "../hooks/use-choix-fichiers";

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
  onImporter: (source: SourceImport) => void;
}

/** Les trois façons d'apporter son CV, dans l'ordre où on les propose. */
const SOURCES: {
  source: SourceImport;
  libelle: string;
  icone: "camera" | "importer" | "galerie";
}[] = [
  { source: "camera", libelle: "Photographier", icone: "camera" },
  { source: "fichier", libelle: "PDF ou Word", icone: "importer" },
  { source: "galerie", libelle: "Mes photos", icone: "galerie" },
];

export function InvitationCv({ reprendre, onCreer, onImporter }: Props) {
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
            {reprendre ? "On reprend ton CV ?" : "Ton CV, refait par Karria."}
          </Texte>
          <Texte className="text-center text-body leading-6 text-muted-foreground">
            {reprendre
              ? "Tout ce que tu m'as dit est gardé. On continue là où on s'était arrêtés."
              : "Importe ou photographie ton CV actuel : j'en fais un CV compatible ATS, sur les modèles Karria. Plus rapide que de répondre à mes questions."}
          </Texte>
        </VStack>
      </Animated.View>

      <Animated.View
        entering={reduit ? undefined : FadeInDown.duration(500).delay(300)}
        className="w-full gap-3"
      >
        {reprendre ? (
          <BoutonAction
            libelle="Reprendre mon CV"
            onPress={onCreer}
            icone={<Icone nom="micro" couleur={couleurs.surPrimaire} taille={16} />}
          />
        ) : null}
        <HStack className="gap-2">
          {SOURCES.map((s, i) => (
            <Pressable
              key={s.source}
              onPress={() => onImporter(s.source)}
              className={`min-h-[72px] flex-1 items-center justify-center gap-1.5 rounded-carte px-2 py-3 ${
                i === 0 && !reprendre
                  ? "bg-primary"
                  : "border border-border-champ bg-card"
              }`}
              accessibilityRole="button"
              accessibilityLabel={`Importer mon CV : ${s.libelle}`}
            >
              <Icone
                nom={s.icone}
                couleur={i === 0 && !reprendre ? couleurs.surPrimaire : couleurs.texte}
                taille={18}
              />
              <Texte
                className={`text-center font-bold text-footnote ${
                  i === 0 && !reprendre ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {s.libelle}
              </Texte>
            </Pressable>
          ))}
        </HStack>
        {reprendre ? null : (
          <Pressable
            onPress={onCreer}
            className="min-h-touch items-center justify-center"
            accessibilityRole="button"
          >
            <Texte className="font-medium text-footnote text-muted-foreground">
              Pas de CV ? Créer de zéro, en parlant
            </Texte>
          </Pressable>
        )}
      </Animated.View>
    </VStack>
  );
}
