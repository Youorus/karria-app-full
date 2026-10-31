/**
 * Le profil d'un invité : l'espace qui l'attend, et la porte pour y entrer.
 *
 * Même mise en scène que l'invitation à se connecter — l'orbe, une phrase à
 * la première personne, la liste de ce qu'un compte apporte — pour que les
 * deux se reconnaissent. Une seule action, en bleu plein : « Se connecter »
 * ouvre la feuille de connexion ; le reste du profil n'a rien à montrer à
 * quelqu'un qui n'a pas encore de compte.
 */

import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { BoutonAction } from "@/components/bouton-action";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { VStack } from "@/components/ui/vstack";
import { GAINS, textesDeLaPorte } from "@/features/auth/services/porte";

interface Props {
  onSeConnecter: () => void;
}

export function ProfilInvite({ onSeConnecter }: Props) {
  const reduit = useReducedMotion();
  const textes = textesDeLaPorte("profil");

  return (
    <VStack className="flex-1 items-center justify-center gap-7 px-6 pb-28">
      <OrbeVivante taille={110}>
        <SymboleKarria taille={40} teinte="reflet" />
      </OrbeVivante>

      <Animated.View entering={reduit ? undefined : FadeInDown.duration(500).delay(150)}>
        <VStack className="items-center gap-2">
          <Texte
            accessibilityRole="header"
            className="text-center font-display text-title-lg tracking-tight text-foreground"
          >
            {textes.titre}
          </Texte>
          <Texte className="px-2 text-center text-body leading-6 text-muted-foreground">
            {textes.phrase}
          </Texte>
        </VStack>
      </Animated.View>

      <Animated.View
        entering={reduit ? undefined : FadeInDown.duration(500).delay(300)}
        className="w-full"
      >
        <VStack className="gap-3 rounded-lg border border-border-subtle bg-card p-4">
          {GAINS.map((gain, i) => (
            <Texte
              key={gain}
              className={`text-body text-foreground ${i > 0 ? "border-t border-border-subtle pt-3" : ""}`}
            >
              {gain}
            </Texte>
          ))}
        </VStack>
      </Animated.View>

      <Animated.View
        entering={reduit ? undefined : FadeInDown.duration(500).delay(450)}
        className="w-full"
      >
        <BoutonAction libelle="Se connecter" onPress={onSeConnecter} />
      </Animated.View>
    </VStack>
  );
}
