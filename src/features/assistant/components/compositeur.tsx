/**
 * Le compositeur : la capsule où l'on écrit — ou dicte — à Karria.
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
 * ═══ Un bouton, deux visages ═══
 *
 * Champ vide, le bouton bleu est le **micro** : parler est plus facile
 * qu'écrire pour beaucoup, et c'est à eux que Karria s'adresse d'abord. Dès
 * qu'il y a du texte, il devient la flèche d'envoi — le seul élément bleu
 * plein de l'écran, donc la seule action principale. Désactivée tant que
 * Karria répond : un envoi pendant la réponse croiserait deux fils.
 *
 * ═══ Pendant la dictée ═══
 *
 * Le champ cède la place à la zone d'écoute (`ZoneDictee`) : le texte qui
 * s'écrit, l'orbe qui suit la voix, annuler / terminer. « Terminer » pose le
 * texte dans le champ ; l'utilisateur le relit, le corrige, puis envoie.
 * Rien ne part tout seul.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Pressable, TextInput } from "react-native";

import { Icone } from "@/components/icone";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { ZoneDictee } from "@/features/dictee/components/zone-dictee";
import type { Dictee } from "@/features/dictee/hooks/use-dictee";
import { useCouleurs } from "@/theme/use-couleurs";

interface Props {
  valeur: string;
  onChange: (texte: string) => void;
  onEnvoyer: () => void;
  peutEnvoyer: boolean;
  dictee: Dictee;
}

/** Lu une fois : la disponibilité du verre ne change pas pendant la vie
 *  de l'application. */
const VERRE = isLiquidGlassAvailable();

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

export function Compositeur({ valeur, onChange, onEnvoyer, peutEnvoyer, dictee }: Props) {
  const couleurs = useCouleurs();
  const ecrit = valeur.trim() !== "";

  if (dictee.ouverte) {
    return (
      <Capsule>
        <ZoneDictee dictee={dictee} />
      </Capsule>
    );
  }

  const bloque = ecrit && !peutEnvoyer;

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
          onPress={ecrit ? onEnvoyer : dictee.demarrer}
          disabled={bloque}
          hitSlop={6}
          className={`ml-2 h-11 w-11 items-center justify-center rounded-full bg-primary ${
            bloque ? "opacity-40" : ""
          }`}
          accessibilityRole="button"
          accessibilityLabel={ecrit ? "Envoyer" : "Dicter mon message"}
          accessibilityHint={
            ecrit
              ? undefined
              : "Le texte s'écrit pendant que tu parles, à relire avant d'envoyer"
          }
          accessibilityState={{ disabled: bloque }}
        >
          <Icone
            nom={ecrit ? "envoyer" : "micro"}
            couleur={couleurs.surPrimaire}
            taille={18}
            graisse="bold"
          />
        </Pressable>
      </HStack>
    </Capsule>
  );
}
