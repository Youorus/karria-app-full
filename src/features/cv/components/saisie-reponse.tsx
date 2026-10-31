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
 * Le champ cède la place à la zone d'écoute partagée avec l'agent
 * (`ZoneDictee`) : le texte qui s'écrit au fil de la parole, l'orbe qui suit
 * la voix, annuler / terminer. « Terminer » pose le texte **ici**, dans le
 * champ : on le relit, on le corrige, et c'est la flèche qui l'envoie. La V1
 * envoyait la transcription telle quelle ; on ne fait plus parler à la place
 * des gens.
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

const VERRE = isLiquidGlassAvailable();

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

interface Props {
  valeur: string;
  onChange: (t: string) => void;
  onEnvoyer: () => void;
  dictee: Dictee;
  occupe: boolean;
  enCorrection: boolean;
}

export function SaisieReponse({
  valeur,
  onChange,
  onEnvoyer,
  dictee,
  occupe,
  enCorrection,
}: Props) {
  const couleurs = useCouleurs();
  const ecrit = valeur.trim() !== "";

  if (dictee.ouverte) {
    return (
      <Capsule>
        <ZoneDictee dictee={dictee} />
      </Capsule>
    );
  }

  return (
    <Capsule>
      <HStack className="min-h-champ items-end py-1.5 pl-5 pr-1.5">
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
        <Pressable
          onPress={ecrit ? onEnvoyer : dictee.demarrer}
          disabled={occupe}
          hitSlop={6}
          className={`ml-2 h-11 w-11 items-center justify-center rounded-full bg-primary ${
            occupe ? "opacity-40" : ""
          }`}
          accessibilityRole="button"
          accessibilityLabel={ecrit ? "Envoyer" : "Répondre à la voix"}
          accessibilityHint={
            ecrit
              ? undefined
              : "Le texte s'écrit pendant que tu parles, à relire avant d'envoyer"
          }
          accessibilityState={{ disabled: occupe }}
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
