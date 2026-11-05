/**
 * Un CV mis en page, dans « Mes CV » — une feuille, pas une fiche.
 *
 * ═══ L'anatomie ═══
 *
 * À gauche, la vignette du modèle (celle de la galerie : on reconnaît le
 * dessin avant de lire le nom) dans un cadre de feuille ; à droite, le nom
 * du modèle et « Créé hier ». Toucher cette partie ouvre l'aperçu. Dessous,
 * les gestes : PDF et Word (les mêmes boutons que Finaliser), puis, à
 * droite, envoyer par e-mail et supprimer — deux ronds au ton de l'écran,
 * 40 pt, nommés pour le lecteur d'écran.
 *
 * Rien d'autre : pas de score, pas d'étiquette. On revient ici pour
 * retrouver **un** CV et l'envoyer ; un CV a déjà été jugé à Finaliser.
 *
 * ═══ Le mouvement ═══
 *
 * L'entrée du fil (fondu en montant, décalée par rang) ; « mouvement
 * réduit » la coupe.
 */

import { Image } from "expo-image";
import { Pressable } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Icone, type NomIcone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { Modele } from "@/features/modeles/types/modeles.types";
import { useCouleurs } from "@/theme/use-couleurs";

import { libelleDuModele, ligneDeCreation, TEXTES_MES_CV } from "../services/mes-cv";
import { TEXTES } from "../services/presentation";
import type { Format } from "../services/telechargement";
import type { Export } from "../types/atelier.types";
import { BoutonFormat } from "./bouton-format";

const LARGEUR_VIGNETTE = 56;
const HAUTEUR_VIGNETTE = Math.round(LARGEUR_VIGNETTE / 0.72);

function Vignette({ modele }: { modele: Modele | null }) {
  if (modele === null || modele.miniature === null) {
    return (
      <Box
        style={{ width: LARGEUR_VIGNETTE, height: HAUTEUR_VIGNETTE }}
        className="items-center justify-center rounded-[4px] border border-border-champ bg-background"
      >
        <SymboleKarria taille={18} />
      </Box>
    );
  }
  return (
    <Box className="overflow-hidden rounded-[4px] border border-border-champ">
      <Image
        source={{
          uri: modele.miniature,
          cacheKey: `modele-${modele.id}-v${modele.version}`,
        }}
        placeholder={modele.flou === null ? undefined : { blurhash: modele.flou }}
        cachePolicy="memory-disk"
        style={{ width: LARGEUR_VIGNETTE, height: HAUTEUR_VIGNETTE }}
        contentFit="cover"
        contentPosition="top"
        transition={200}
        accessible={false}
      />
    </Box>
  );
}

function Rond({
  icone,
  libelle,
  onPress,
  desactive,
}: {
  icone: NomIcone;
  libelle: string;
  onPress: () => void;
  desactive: boolean;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      hitSlop={4}
      className={`h-10 w-10 items-center justify-center rounded-full bg-remplissage active:opacity-80 ${
        desactive ? "opacity-40" : ""
      }`}
      accessibilityRole="button"
      accessibilityLabel={libelle}
      accessibilityState={{ disabled: desactive }}
    >
      <Icone nom={icone} couleur={couleurs.texte} taille={16} graisse="medium" />
    </Pressable>
  );
}

interface Props {
  exporte: Export;
  modele: Modele | null;
  rang: number;
  maintenant: Date;
  /** Le téléchargement en cours sur **cet** export, ou `null`. */
  telechargement: Format | null;
  /** Un téléchargement court ailleurs : on attend. */
  occupe: boolean;
  /** « Envoyé à … », si c'est celui-ci. */
  envoyeA: string | null;
  onOuvrir: () => void;
  onTelecharger: (format: Format) => void;
  onEnvoyer: () => void;
  onSupprimer: () => void;
  /** « Voir avec un autre modèle » : l'atelier libre, la feuille du modèle ouverte. */
  onAutreModele: () => void;
}

export function CarteExportCv({
  exporte,
  modele,
  rang,
  maintenant,
  telechargement,
  occupe,
  envoyeA,
  onOuvrir,
  onTelecharger,
  onEnvoyer,
  onSupprimer,
  onAutreModele,
}: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const libelle = libelleDuModele(exporte);
  return (
    <Animated.View
      entering={reduit ? undefined : FadeInDown.duration(380).delay(60 + rang * 50)}
    >
      <VStack className="gap-3 rounded-carte border border-border-subtle bg-card p-4">
        <Pressable
          onPress={onOuvrir}
          className="flex-row items-center gap-3 active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={`${TEXTES_MES_CV.ouvrir} le CV, modèle ${libelle}`}
        >
          <Vignette modele={modele} />
          <VStack className="flex-1 gap-0.5">
            <Texte className="font-bold text-body text-foreground" numberOfLines={1}>
              {libelle}
            </Texte>
            <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
              {ligneDeCreation(exporte, maintenant)}
            </Texte>
            {envoyeA !== null ? (
              <HStack
                className="items-center gap-1 pt-1"
                accessibilityLiveRegion="polite"
              >
                <Icone nom="coche" couleur={couleurs.succes} taille={11} graisse="bold" />
                <Texte className="text-caption text-success" numberOfLines={1}>
                  {TEXTES_MES_CV.envoye} à {envoyeA}
                </Texte>
              </HStack>
            ) : null}
          </VStack>
          <Icone
            nom="suivant"
            couleur={couleurs.estompe}
            taille={14}
            graisse="semibold"
          />
        </Pressable>
        <HStack className="items-center gap-2">
          {exporte.pdf !== null ? (
            <BoutonFormat
              format="pdf"
              enCours={telechargement === "pdf"}
              desactive={occupe}
              onPress={() => onTelecharger("pdf")}
            />
          ) : null}
          {exporte.docx !== null ? (
            <BoutonFormat
              format="docx"
              enCours={telechargement === "docx"}
              desactive={occupe}
              onPress={() => onTelecharger("docx")}
            />
          ) : null}
          <Box className="flex-1" />
          <Rond
            icone="modeles"
            libelle={TEXTES.autreModele}
            onPress={onAutreModele}
            desactive={occupe}
          />
          <Rond
            icone="lettre"
            libelle={TEXTES_MES_CV.envoyer}
            onPress={onEnvoyer}
            desactive={occupe}
          />
          <Rond
            icone="corbeille"
            libelle={TEXTES_MES_CV.supprimer}
            onPress={onSupprimer}
            desactive={occupe}
          />
        </HStack>
      </VStack>
    </Animated.View>
  );
}
