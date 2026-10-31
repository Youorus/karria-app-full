/**
 * Le compositeur de l'échange avec l'équipe : écrire, parler, montrer.
 *
 * ═══ Un seul bouton bleu, qui change de rôle ═══
 *
 * Champ vide : le micro (laisser un vocal). Dès qu'on écrit : la flèche
 * (envoyer). Pendant un enregistrement : la flèche encore, qui arrête et
 * envoie. C'est l'unique action principale de l'écran, toujours au même
 * endroit sous le pouce — la convention des messageries que tout le monde
 * connaît.
 *
 * À gauche, deux gestes discrets, sans fond : une image de la galerie (une
 * capture d'écran, le plus souvent), ou une photo prise sur le moment.
 *
 * ═══ Pendant l'enregistrement ═══
 *
 * Le champ laisse la place à la durée qui court et à une onde qui suit la
 * voix : sans retour visible, on ne sait pas si le téléphone écoute. La
 * croix jette le vocal.
 */

import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { ReactNode } from "react";
import { Pressable, TextInput } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { formaterDuree, TEXTE_MAX } from "../services/fil";

const VERRE = isLiquidGlassAvailable();

/** Le nombre de barres de l'onde du micro. */
const BARRES_MICRO = 18;
const HAUTEURS_MICRO = ["h-1", "h-2", "h-3", "h-4", "h-5", "h-6"] as const;

interface Props {
  texte: string;
  onChangeTexte: (texte: string) => void;
  peutEnvoyer: boolean;
  onEnvoyer: () => void;
  enregistre: boolean;
  dureeMs: number;
  niveau: number;
  onDemarrerVocal: () => void;
  onEnvoyerVocal: () => void;
  onAnnulerVocal: () => void;
  onImage: (source: "camera" | "galerie") => void;
}

function Capsule({ children }: { children: ReactNode }) {
  if (VERRE) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive style={{ borderRadius: 30 }}>
        {children}
      </GlassView>
    );
  }
  return (
    <Box className="rounded-lg border border-border-subtle bg-verre">{children}</Box>
  );
}

function OndeMicro({ niveau }: { niveau: number }) {
  // Une onde centrée : les barres du milieu montent le plus haut, et toutes
  // suivent le niveau du micro. Recalculée à chaque mesure (100 ms).
  return (
    <HStack className="h-6 flex-1 items-center gap-1" accessible={false}>
      {Array.from({ length: BARRES_MICRO }, (_, i) => {
        const centre = 1 - Math.abs(i - (BARRES_MICRO - 1) / 2) / (BARRES_MICRO / 2);
        const rang = Math.round(niveau * centre * (HAUTEURS_MICRO.length - 1));
        return (
          <Box
            key={i}
            className={`w-1 rounded-full bg-primary ${HAUTEURS_MICRO[Math.max(0, rang)]}`}
          />
        );
      })}
    </HStack>
  );
}

export function CompositeurEquipe({
  texte,
  onChangeTexte,
  peutEnvoyer,
  onEnvoyer,
  enregistre,
  dureeMs,
  niveau,
  onDemarrerVocal,
  onEnvoyerVocal,
  onAnnulerVocal,
  onImage,
}: Props) {
  const couleurs = useCouleurs();

  const boutonPrincipal = enregistre ? (
    <Pressable
      onPress={onEnvoyerVocal}
      hitSlop={6}
      className="ml-2 h-11 w-11 items-center justify-center rounded-full bg-primary"
      accessibilityRole="button"
      accessibilityLabel="Arrêter et envoyer le message vocal"
    >
      <Icone nom="envoyer" couleur={couleurs.surPrimaire} taille={18} graisse="bold" />
    </Pressable>
  ) : peutEnvoyer ? (
    <Pressable
      onPress={onEnvoyer}
      hitSlop={6}
      className="ml-2 h-11 w-11 items-center justify-center rounded-full bg-primary"
      accessibilityRole="button"
      accessibilityLabel="Envoyer à l'équipe"
    >
      <Icone nom="envoyer" couleur={couleurs.surPrimaire} taille={18} graisse="bold" />
    </Pressable>
  ) : (
    <Pressable
      onPress={onDemarrerVocal}
      hitSlop={6}
      className="ml-2 h-11 w-11 items-center justify-center rounded-full bg-primary"
      accessibilityRole="button"
      accessibilityLabel="Enregistrer un message vocal"
    >
      <Icone nom="micro" couleur={couleurs.surPrimaire} taille={18} />
    </Pressable>
  );

  return (
    <Capsule>
      <HStack className="min-h-champ items-end py-1.5 pl-1.5 pr-1.5">
        {enregistre ? (
          <HStack className="min-h-11 flex-1 items-center gap-3 pl-1">
            <Pressable
              onPress={onAnnulerVocal}
              className="h-11 w-11 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Jeter le message vocal"
            >
              <Icone nom="fermer" couleur={couleurs.estompe} taille={18} />
            </Pressable>
            <Texte
              className="font-bold text-callout text-foreground"
              accessibilityLiveRegion="polite"
              accessibilityLabel={`Enregistrement, ${formaterDuree(dureeMs)}`}
            >
              {formaterDuree(dureeMs)}
            </Texte>
            <OndeMicro niveau={niveau} />
          </HStack>
        ) : (
          <>
            <Pressable
              onPress={() => onImage("galerie")}
              hitSlop={4}
              className="h-11 w-10 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Joindre une image ou une capture d'écran"
            >
              <Icone nom="galerie" couleur={couleurs.estompe} taille={20} />
            </Pressable>
            <Pressable
              onPress={() => onImage("camera")}
              hitSlop={4}
              className="h-11 w-10 items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel="Prendre une photo"
            >
              <Icone nom="camera" couleur={couleurs.estompe} taille={20} />
            </Pressable>
            <TextInput
              value={texte}
              onChangeText={onChangeTexte}
              placeholder="Écris à l'équipe…"
              placeholderTextColor={couleurs.estompe}
              selectionColor={couleurs.primaire}
              multiline
              maxLength={TEXTE_MAX}
              className="max-h-32 flex-1 py-2.5 pl-1 font-sans text-callout text-foreground"
              accessibilityLabel="Ton message pour l'équipe Karria"
            />
          </>
        )}
        {boutonPrincipal}
      </HStack>
    </Capsule>
  );
}
