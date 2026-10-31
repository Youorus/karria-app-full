/**
 * Un message de l'échange avec l'équipe — texte, vocal ou image.
 *
 * ═══ Deux voix humaines, deux côtés ═══
 *
 * Ce que la personne écrit est à droite, dans la bulle de l'application
 * (la même que pour Karria : c'est toujours « moi »). Ce que l'équipe
 * répond est à gauche, sur une carte, signé « L'équipe Karria » — pas le
 * symbole de Karria, ni l'orbe : ce sont des personnes qui répondent, et
 * l'écran ne doit jamais le faire oublier.
 *
 * ═══ Un envoi en route ═══
 *
 * Même bulle, estompée, avec « Envoi… » ; en échec, la raison en rouge et
 * deux gestes : réessayer (toucher la bulle) ou retirer.
 */

import { Image } from "expo-image";
import { useState } from "react";
import { Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { LecteurVocal } from "../hooks/use-lecteur-vocal";
import { formaterDuree } from "../services/fil";
import type { EnvoiLocal, MessageEquipe } from "../types/equipe.types";

/** La vignette d'une image dans le fil : assez grande pour lire une capture. */
const VIGNETTE = { width: 210, height: 280, borderRadius: 18 } as const;

/** Les hauteurs de l'onde d'un vocal, en classes du thème. */
const HAUTEURS = ["h-2", "h-3", "h-4", "h-5", "h-6", "h-4", "h-3"] as const;
const BARRES = 26;

/** Une onde propre à chaque vocal, stable d'un rendu à l'autre. */
function onde(graine: string): string[] {
  let h = 0;
  for (let i = 0; i < graine.length; i += 1) h = (h * 31 + graine.charCodeAt(i)) >>> 0;
  return Array.from({ length: BARRES }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) >>> 0;
    return HAUTEURS[h % HAUTEURS.length];
  });
}

function Vocal({
  id,
  dureeMs,
  joue,
  progression,
  onPress,
  moi,
}: {
  id: string;
  dureeMs: number | null;
  joue: boolean;
  progression: number;
  onPress?: () => void;
  moi: boolean;
}) {
  const couleurs = useCouleurs();
  const barres = onde(id);
  const jouees = Math.round(progression * BARRES);
  const encre = moi ? "text-bulle-foreground" : "text-foreground";
  return (
    <Pressable
      onPress={onPress}
      disabled={onPress === undefined}
      className="min-h-touch flex-row items-center gap-3"
      accessibilityRole="button"
      accessibilityLabel={`${joue ? "Mettre en pause" : "Écouter"} le message vocal de ${formaterDuree(dureeMs)}`}
    >
      <Icone nom={joue ? "pause" : "lecture"} couleur={couleurs.primaire} taille={20} />
      <HStack className="h-6 items-center gap-0.5" accessible={false}>
        {barres.map((hauteur, i) => (
          <Box
            // Les barres ne bougent jamais : leur rang est leur identité.
            key={i}
            className={`w-1 rounded-full ${hauteur} ${i < jouees ? "bg-primary" : "bg-foreground-faint"}`}
          />
        ))}
      </HStack>
      <Texte className={`text-footnote ${encre}`}>{formaterDuree(dureeMs)}</Texte>
    </Pressable>
  );
}

function ImageMessage({ uri, libelle }: { uri: string; libelle: string }) {
  const [grande, setGrande] = useState(false);
  const couleurs = useCouleurs();
  return (
    <>
      <Pressable
        onPress={() => setGrande(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${libelle}. Toucher pour agrandir.`}
      >
        <Image source={{ uri }} style={VIGNETTE} contentFit="cover" transition={160} />
      </Pressable>
      <Modal
        visible={grande}
        animationType="fade"
        onRequestClose={() => setGrande(false)}
        presentationStyle="fullScreen"
      >
        <Box style={{ flex: 1 }} className="bg-scrim">
          <SafeAreaView style={{ flex: 1 }}>
            <HStack className="justify-end px-4">
              <Pressable
                onPress={() => setGrande(false)}
                className="min-h-touch min-w-touch items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel="Fermer l'image"
              >
                <Icone nom="fermer" couleur={couleurs.surVoile} taille={22} />
              </Pressable>
            </HStack>
            <Image
              source={{ uri }}
              style={{ flex: 1 }}
              contentFit="contain"
              accessibilityLabel={libelle}
            />
          </SafeAreaView>
        </Box>
      </Modal>
    </>
  );
}

interface PropsMessage {
  message: MessageEquipe;
  heure: string;
  lecteur: LecteurVocal;
}

export function BulleEquipe({ message, heure, lecteur }: PropsMessage) {
  const moi = message.auteur === "moi";
  const contenu =
    message.sorte === "texte" ? (
      <Texte
        selectable
        className={`text-callout leading-6 ${moi ? "text-bulle-foreground" : "text-foreground"}`}
      >
        {message.texte}
      </Texte>
    ) : message.sorte === "vocal" ? (
      <Vocal
        id={message.id}
        dureeMs={message.piece?.dureeMs ?? null}
        joue={lecteur.courant === message.id && lecteur.joue}
        progression={lecteur.courant === message.id ? lecteur.progression : 0}
        onPress={() => lecteur.basculer(message)}
        moi={moi}
      />
    ) : message.piece !== null ? (
      <ImageMessage
        uri={message.piece.url}
        libelle={moi ? "Image que tu as envoyée" : "Image envoyée par l'équipe"}
      />
    ) : null;

  if (moi) {
    return (
      <VStack className="items-end gap-1">
        <Box
          className={`max-w-[85%] rounded-lg bg-bulle ${message.sorte === "image" ? "p-1" : "px-4 py-3"}`}
        >
          {contenu}
        </Box>
        <Texte className="px-1 text-caption text-foreground-faint">{heure}</Texte>
      </VStack>
    );
  }

  return (
    <VStack className="items-start gap-1">
      <Texte className="px-1 font-bold text-caption text-muted-foreground">
        {"L'équipe Karria"}
      </Texte>
      <Box
        className={`max-w-[88%] rounded-lg border border-border-subtle bg-card ${
          message.sorte === "image" ? "p-1" : "px-4 py-3"
        }`}
      >
        {contenu}
      </Box>
      <Texte className="px-1 text-caption text-foreground-faint">{heure}</Texte>
    </VStack>
  );
}

interface PropsEnvoi {
  envoi: EnvoiLocal;
  onReessayer: () => void;
  onRetirer: () => void;
}

export function BulleEnvoi({ envoi, onReessayer, onRetirer }: PropsEnvoi) {
  const echec = envoi.etat === "echec";
  const contenu =
    envoi.sorte === "texte" ? (
      <Texte className="text-callout leading-6 text-bulle-foreground">
        {envoi.texte}
      </Texte>
    ) : envoi.sorte === "vocal" ? (
      <Vocal id={envoi.cle} dureeMs={envoi.dureeMs} joue={false} progression={0} moi />
    ) : envoi.uri !== null ? (
      <Image source={{ uri: envoi.uri }} style={VIGNETTE} contentFit="cover" />
    ) : null;

  return (
    <VStack className="items-end gap-1">
      <Pressable
        onPress={echec ? onReessayer : undefined}
        disabled={!echec}
        className={`max-w-[85%] rounded-lg bg-bulle ${envoi.sorte === "image" ? "p-1" : "px-4 py-3"} ${
          echec ? "" : "opacity-60"
        }`}
        accessibilityRole={echec ? "button" : undefined}
        accessibilityLabel={
          echec ? "Envoi échoué. Toucher pour réessayer." : "Envoi en cours"
        }
      >
        {contenu}
      </Pressable>
      {echec ? (
        <HStack className="items-center gap-3 px-1">
          <Texte className="text-footnote text-destructive">{envoi.probleme}</Texte>
          <Pressable
            onPress={onRetirer}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Retirer ce message"
          >
            <Texte className="font-bold text-footnote text-muted-foreground">
              Retirer
            </Texte>
          </Pressable>
        </HStack>
      ) : (
        <Texte className="px-1 text-caption text-foreground-faint">Envoi…</Texte>
      )}
    </VStack>
  );
}

export function SeparateurJour({ libelle }: { libelle: string }) {
  return (
    <Texte className="py-2 text-center font-bold text-caption uppercase tracking-wide text-foreground-faint">
      {libelle}
    </Texte>
  );
}
