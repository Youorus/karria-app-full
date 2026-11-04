/**
 * « Nous offrir un café » : un geste chaleureux, à part de l'abonnement.
 *
 * ═══ Choisir sa tasse doit être un plaisir ═══
 *
 * Quatre tuiles, une par palier du serveur (1, 2, 3, 5) : un grand chiffre,
 * le mot « café(s) » et le prix. La tuile choisie se pose sur la crème, se
 * cerne de caramel et **respire** d'un ressort court — le mouvement répond
 * au doigt, il ne décore pas. Pas d'émoji : la matière est la typographie
 * et l'icône de tasse du système.
 *
 * Un seul bouton, caramel plein (`ton="chaleur"`) : « Offrir deux cafés ·
 * 4,99 € ». Deux gestes depuis le profil : la tasse, puis le bouton.
 *
 * ═══ Après le café ═══
 *
 * Le cœur caramel, un merci, et « En offrir un autre » — en fondu, le
 * temps de lire. Mouvement réduit : tout est là d'un coup.
 */

import { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { euros } from "@/lib/monnaie";
import { CHALEUR, SUR_CHALEUR } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import { libelleDOffre, motCafe, nomDesTasses, TEXTES } from "../services/presentation";
import type { OffreDeCafe } from "../types/soutien.types";

function Tuile({
  offre,
  choisie,
  reduit,
  onPress,
}: {
  offre: OffreDeCafe;
  choisie: boolean;
  reduit: boolean;
  onPress: () => void;
}) {
  const echelle = useSharedValue(1);
  useEffect(() => {
    echelle.value = reduit
      ? 1
      : withSpring(choisie ? 1.06 : 1, { damping: 14, stiffness: 260 });
  }, [choisie, reduit, echelle]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, style]}>
      <Pressable
        onPress={onPress}
        className={`h-[88px] items-center justify-center rounded-tuile border-[1.5px] ${
          choisie ? "border-chaleur bg-card" : "border-transparent bg-remplissage-doux"
        }`}
        accessibilityRole="radio"
        accessibilityState={{ selected: choisie, checked: choisie }}
        accessibilityLabel={`${nomDesTasses(offre.tasses)}, ${euros(offre.prixCentimes)}`}
      >
        <Texte
          className={`font-display text-title leading-7 ${choisie ? "text-chaleur" : "text-foreground"}`}
        >
          {offre.tasses}
        </Texte>
        <Texte className="text-caption text-muted-foreground">
          {motCafe(offre.tasses)}
        </Texte>
        <Texte
          className={`pt-1 font-bold text-footnote ${choisie ? "text-chaleur" : "text-muted-foreground"}`}
          numberOfLines={1}
        >
          {euros(offre.prixCentimes)}
        </Texte>
      </Pressable>
    </Animated.View>
  );
}

export function SurfaceCafe({ soutien }: { soutien: Soutien }) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const chaleur = CHALEUR[couleurs.mode];
  const { catalogue, choix, offreChoisie, phase } = soutien;
  if (catalogue === null) return null;

  if (soutien.merci) {
    return (
      <Animated.View entering={reduit ? undefined : FadeIn.duration(320)}>
        <VStack className="items-center gap-3 rounded-carte border border-border-chaleur bg-surface-chaleur px-5 py-7">
          <Icone nom="coeurPlein" couleur={chaleur} taille={30} />
          <Texte
            accessibilityRole="header"
            className="text-center font-display text-title-sm text-foreground"
          >
            {TEXTES.merciTitre}
          </Texte>
          <Texte className="text-center text-body leading-6 text-muted-foreground">
            {TEXTES.merciTexte}
          </Texte>
          <BoutonAction
            libelle={TEXTES.encoreUn}
            ton="discret"
            onPress={soutien.recommencer}
          />
        </VStack>
      </Animated.View>
    );
  }

  const enCours = phase !== "repos" && soutien.cafeEnCours;
  return (
    <VStack className="gap-4 rounded-carte border border-border-chaleur bg-surface-chaleur p-5">
      <HStack className="items-center gap-2.5">
        <Icone nom="tasse" couleur={chaleur} taille={18} />
        <Texte
          accessibilityRole="header"
          className="flex-1 font-display text-title-sm text-foreground"
        >
          {TEXTES.cafeTitre}
        </Texte>
      </HStack>
      <Texte className="text-footnote leading-5 text-muted-foreground">
        {TEXTES.cafeDetail}
      </Texte>

      <HStack className="gap-2 py-1" accessibilityRole="radiogroup">
        {catalogue.cafes.map((offre) => (
          <Tuile
            key={offre.tasses}
            offre={offre}
            choisie={offre.tasses === choix}
            reduit={reduit}
            onPress={() => soutien.choisir(offre.tasses)}
          />
        ))}
      </HStack>

      <BoutonAction
        libelle={libelleDOffre(offreChoisie)}
        ton="chaleur"
        icone={<Icone nom="tasse" couleur={SUR_CHALEUR[couleurs.mode]} taille={16} />}
        enCours={enCours}
        libelleEnCours={phase === "confirmation" ? TEXTES.attente : TEXTES.ouverture}
        desactive={phase !== "repos" || offreChoisie === null}
        onPress={soutien.offrir}
      />
    </VStack>
  );
}
