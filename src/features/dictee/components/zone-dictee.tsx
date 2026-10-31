/**
 * La zone d'écoute : ce qui remplace le champ pendant qu'on dicte.
 *
 * ═══ Ce qu'on voit ═══
 *
 * En haut, le texte qui s'écrit au fil de la parole — le confirmé en plein,
 * ce qui est encore en train d'être entendu en estompé. En bas, une ligne :
 * annuler à gauche, l'orbe vivante au centre qui suit la voix, la minuterie
 * à côté, terminer à droite en bleu plein. C'est la grammaire des dictées
 * de ChatGPT ou de Siri — l'état « j'écoute » se lit sans mot, la sortie est
 * à un geste —, dans l'univers de Karria : l'orbe est la seule animation,
 * pas d'onde décorative, pas de pastille.
 *
 * ═══ Rien ne part d'ici ═══
 *
 * « Terminer » pose le texte dans le champ, où l'utilisateur le relit et le
 * corrige avant d'envoyer. Ce composant ne connaît pas l'envoi.
 *
 * ═══ Le mouvement ═══
 *
 * L'orbe lit le niveau de la voix sur le fil d'interface (valeur partagée) :
 * aucun rendu React par mesure du micro. L'entrée et la sortie en fondu sont
 * coupées par « réduire les animations » ; l'orbe s'y fige d'elle-même.
 */

import { useRef } from "react";
import { Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Dictee } from "../hooks/use-dictee";
import { formaterDuree, presqueFini } from "../services/dictee";

interface Props {
  dictee: Dictee;
}

/** Ce que dit la zone quand il n'y a pas encore de texte. */
function invite(dictee: Dictee): string {
  switch (dictee.etat.nom) {
    case "demarrage":
      return "J'ouvre le micro…";
    case "transcription":
      return "Je transcris…";
    case "cloture":
      return "Un instant…";
    default:
      return dictee.mode === "serveur"
        ? "Je t'écoute… Le texte s'écrira à la fin."
        : "Je t'écoute…";
  }
}

export function ZoneDictee({ dictee }: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const defilement = useRef<ScrollView>(null);
  const vide = dictee.confirme === "" && dictee.partiel === "";
  const alerte = presqueFini(dictee.dureeMs);

  return (
    <Animated.View
      entering={reduit ? undefined : FadeIn.duration(220)}
      exiting={reduit ? undefined : FadeOut.duration(160)}
      className="w-full pb-1.5 pt-2"
    >
      <ScrollView
        ref={defilement}
        className="max-h-36 px-3.5"
        // Le dernier mot entendu reste visible : on suit la parole.
        onContentSizeChange={() => defilement.current?.scrollToEnd({ animated: !reduit })}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Texte
          className="py-2 font-sans text-callout leading-6 text-foreground"
          accessibilityLiveRegion="polite"
        >
          {vide ? (
            <Texte className="text-muted-foreground">{invite(dictee)}</Texte>
          ) : (
            <>
              {dictee.confirme}
              {dictee.partiel !== "" ? (
                <Texte className="text-muted-foreground">
                  {dictee.confirme !== "" ? " " : ""}
                  {dictee.partiel}
                </Texte>
              ) : null}
            </>
          )}
        </Texte>
      </ScrollView>

      <HStack className="items-center px-1.5 pt-1">
        <Pressable
          onPress={dictee.annuler}
          hitSlop={6}
          className="h-11 w-11 items-center justify-center rounded-full border border-border-champ"
          accessibilityRole="button"
          accessibilityLabel="Annuler la dictée"
          accessibilityHint="Ne garde rien de ce qui a été dit"
        >
          <Icone nom="fermer" couleur={couleurs.texte} taille={14} graisse="semibold" />
        </Pressable>

        <HStack className="flex-1 items-center justify-center gap-2">
          {/* La boîte de l'orbe fait deux fois la sphère : on rogne le halo
              pour tenir dans la ligne des boutons. */}
          <Box className="-my-5">
            <OrbeVivante
              taille={40}
              ecoute={dictee.ecoute}
              active={dictee.attente}
              niveauAudio={dictee.niveau}
            />
          </Box>
          <Texte
            className={`min-w-[40px] font-medium text-footnote tabular-nums ${
              alerte ? "text-warning" : "text-muted-foreground"
            }`}
            accessibilityLabel={`${formaterDuree(dictee.dureeMs)} de dictée`}
          >
            {formaterDuree(dictee.dureeMs)}
          </Texte>
        </HStack>

        <Pressable
          onPress={dictee.terminer}
          disabled={!dictee.ecoute}
          hitSlop={6}
          className={`h-11 w-11 items-center justify-center rounded-full bg-primary ${
            dictee.ecoute ? "" : "opacity-40"
          }`}
          accessibilityRole="button"
          accessibilityLabel="Terminer et relire"
          accessibilityHint="Pose le texte dans le champ, à corriger avant d'envoyer"
          accessibilityState={{ disabled: !dictee.ecoute, busy: dictee.attente }}
        >
          <Icone nom="coche" couleur={couleurs.surPrimaire} taille={16} graisse="bold" />
        </Pressable>
      </HStack>
    </Animated.View>
  );
}
