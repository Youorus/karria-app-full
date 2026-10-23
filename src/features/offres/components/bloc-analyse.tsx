/**
 * « Description — L'annonce » : `KarriaSummaryBlock` de la V1, reproduit
 * à l'identique (`detail-components.tsx`), mais il porte le **texte de
 * l'annonce** : la V2 ne génère pas (encore) d'analyse par offre
 * (`docs/contrat-api-offres.md`). Le jour où elle arrivera, c'est ce bloc
 * qui l'accueillera, avec le même chargeur.
 *
 * ═══ Le chargeur : `AIVortexLoader` ═══
 *
 * Trois points de 10 pt (opacités 1 / 0,7 / 0,5) déphasés de 120°. Sur une
 * boucle de 2,5 s, courbe `bezier(0.4, 0, 0.2, 1)`, chacun tourne d'un tour
 * complet pendant que le tourbillon s'écarte puis se resserre (±15 pt),
 * que les points grossissent ×1,4 et s'allument (0,4 → 1) à mi-course.
 * Dessous, trois lignes fantômes (85 / 95 / 70 %, hauteur 14). Mêmes
 * valeurs, même interpolation que la V1 — mais sur le fil natif, par
 * Reanimated, là où la V1 passait par l'`Animated` historique.
 *
 * ═══ La bulle ═══
 *
 * Rayon 24, coin haut-gauche 4 (c'est Karria qui parle), ombre bleue qui
 * s'intensifie pendant la génération (0,08 contre 0,03 au repos).
 *
 * ═══ Le texte ═══
 *
 * Découpé en sections (`services/analyse.ts`) : titres en capitales
 * bleues 13/900, puces en points bleus à demi-opacité, texte 16/25. Plus
 * l'état d'erreur et « Analyse non disponible. » de la V1.
 */

import { useEffect, useMemo } from "react";
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { PRIMAIRE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { EtatDescription } from "../hooks/use-detail-offre";
import { decouperAnalyse } from "../services/analyse";

/** La courbe de la V1 (`Easing.bezier(0.4, 0, 0.2, 1)`). */
const COURBE = Easing.bezier(0.4, 0, 0.2, 1);

function Point({
  progression,
  phase,
  opacite,
}: {
  progression: SharedValue<number>;
  phase: number;
  opacite: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = progression.value;
    return {
      position: "absolute",
      opacity: interpolate(p, [0, 0.5, 1], [0.4, 1, 0.4]),
      transform: [
        { rotate: `${phase + p * 360}deg` },
        { translateX: interpolate(p, [0, 0.5, 1], [15, -15, 15]) },
        { scale: interpolate(p, [0, 0.5, 1], [1, 1.4, 1]) },
      ],
    };
  });
  return (
    <Animated.View style={style}>
      <Box className={`h-2.5 w-2.5 rounded-full bg-primary ${opacite}`} />
    </Animated.View>
  );
}

function Vortex() {
  const reduit = useReducedMotion();
  const progression = useSharedValue(0);

  useEffect(() => {
    if (reduit) return;
    progression.set(withRepeat(withTiming(1, { duration: 2_500, easing: COURBE }), -1));
  }, [reduit, progression]);

  return (
    <VStack
      className="items-center gap-6 py-6"
      accessibilityLabel="Karria analyse l'offre"
    >
      <Box className="h-10 w-[60px] items-center justify-center">
        <Point progression={progression} phase={0} opacite="opacity-100" />
        <Point progression={progression} phase={120} opacite="opacity-70" />
        <Point progression={progression} phase={240} opacite="opacity-50" />
      </Box>
      <VStack className="w-full gap-3">
        {["w-[85%]", "w-[95%]", "w-[70%]"].map((largeur) => (
          <Box
            key={largeur}
            className={`h-3.5 self-center rounded-[7px] bg-remplissage opacity-60 ${largeur}`}
          />
        ))}
      </VStack>
    </VStack>
  );
}

function Sections({ texte }: { texte: string }) {
  const blocs = useMemo(() => decouperAnalyse(texte), [texte]);
  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <VStack className="gap-5">
        {blocs.map((bloc, i) => (
          <VStack key={i} className="gap-2.5">
            {bloc.titre !== null ? (
              <Texte className="mb-0.5 font-display text-footnote uppercase tracking-[1.2px] text-primary">
                {bloc.titre}
              </Texte>
            ) : null}
            <VStack className="gap-3">
              {bloc.elements.map((el, j) => (
                <HStack key={j} className="items-start gap-3">
                  {el.type === "puce" ? (
                    <Box className="mt-[9px] h-[5px] w-[5px] rounded-full bg-primary opacity-50" />
                  ) : null}
                  <Texte className="flex-1 text-body leading-[25px] text-muted-foreground">
                    {el.contenu}
                  </Texte>
                </HStack>
              ))}
            </VStack>
          </VStack>
        ))}
      </VStack>
    </Animated.View>
  );
}

interface Props {
  etat: EtatDescription;
  texte: string | null;
}

export function BlocAnalyse({ etat, texte }: Props) {
  const couleurs = useCouleurs();
  const enCours = etat === "chargement" && texte === null;

  return (
    <VStack className="gap-3">
      <VStack className="px-1">
        <Texte className="font-display text-callout tracking-tight text-foreground">
          Description
        </Texte>
        <Texte className="font-bold text-caption uppercase tracking-[0.8px] text-foreground-faint">
          L&apos;annonce
        </Texte>
      </VStack>
      <Box
        className="rounded-carte rounded-tl-xs bg-card p-5"
        // L'ombre teintée de bleu de la V1 : une API native (`shadowColor`)
        // qu'aucune classe ne porte.
        style={{
          shadowColor: PRIMAIRE[couleurs.mode],
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: enCours ? 0.08 : 0.03,
          shadowRadius: 15,
          elevation: 2,
        }}
      >
        {enCours ? (
          <Vortex />
        ) : texte !== null && texte !== "" ? (
          <Sections texte={texte} />
        ) : etat === "erreur" ? (
          <VStack className="items-center gap-3 py-2">
            <Icone nom="alerte" couleur={couleurs.destructif} taille={24} />
            <Texte className="text-center text-footnote text-muted-foreground">
              Le texte de l&apos;annonce n&apos;a pas pu être chargé. Réessaie plus tard.
            </Texte>
          </VStack>
        ) : (
          <HStack className="items-center justify-center gap-2.5 py-2">
            <Icone nom="info" couleur={couleurs.estompe} taille={16} />
            <Texte className="text-footnote italic text-foreground-faint">
              Cette annonce n&apos;a pas de texte.
            </Texte>
          </HStack>
        )}
      </Box>
    </VStack>
  );
}
