/**
 * Une carte sert d'abord à retrouver et ouvrir le CV réellement exporté.
 * Les autres gestes sont dans une feuille nommée, à l'écart de l'ouverture.
 */

import { Image } from "expo-image";
import { BoutonAction } from "@/components/bouton-action";
import { Pressable } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { Modele } from "@/features/modeles/types/modeles.types";
import { useCouleurs } from "@/theme/use-couleurs";

import { useSuiteApresFeuille } from "../hooks/use-suite-apres-feuille";
import { libelleDuModele, ligneDeCreation, TEXTES_MES_CV } from "../services/mes-cv";
import type { Format } from "../services/telechargement";
import type { Export } from "../types/atelier.types";
import { FeuilleBasse } from "./feuille-basse";
import { FormatsExport } from "./formats-export";

const LARGEUR_VIGNETTE = 56;
const HAUTEUR_VIGNETTE = Math.round(LARGEUR_VIGNETTE / 0.72);

function Vignette({
  modele,
  apercu,
  id,
}: {
  modele: Modele | null;
  apercu: string | null;
  id: string;
}) {
  // La vraie première page de **ce** CV quand le serveur l'a rendue ; sinon
  // la vignette du modèle, comme avant.
  if (apercu !== null) {
    return (
      <Box
        className="overflow-hidden rounded-[4px] border border-border-champ"
        style={{ backgroundColor: "#ffffff" }}
      >
        <Image
          source={{ uri: apercu, cacheKey: `export-${id}-0` }}
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
}: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const actions = useSuiteApresFeuille();
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
          accessibilityLabel={`${TEXTES_MES_CV.ouvrir} le CV, modèle ${libelle}. ${ligneDeCreation(exporte, maintenant)}`}
        >
          <Vignette modele={modele} apercu={exporte.apercus[0] ?? null} id={exporte.id} />
          <VStack className="flex-1 gap-0.5">
            <HStack className="items-center gap-2">
              {exporte.couleur !== null ? (
                <Box
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: exporte.couleur }}
                  accessibilityLabel={`Couleur ${exporte.couleur}`}
                />
              ) : null}
              <Texte className="shrink font-bold text-body text-foreground">
                {libelle}
              </Texte>
            </HStack>
            <Texte className="text-footnote text-muted-foreground">
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
        <BoutonAction
          libelle="Actions sur ce CV"
          ton="discret"
          multiligne
          desactive={occupe}
          enCours={telechargement !== null}
          libelleEnCours="Téléchargement…"
          onPress={actions.ouvrir}
        />
        <FeuilleBasse
          visible={actions.visible}
          titre="Actions sur ce CV"
          sousTitre={`${libelle} · ${ligneDeCreation(exporte, maintenant)}`}
          onFermer={actions.fermer}
          apresFermeture={actions.apresFermeture}
        >
          <FormatsExport
            pdf={exporte.pdf !== null}
            word={exporte.docx !== null}
            onTelecharger={(format) => actions.terminer(() => onTelecharger(format))}
          />
          <BoutonAction
            libelle={TEXTES_MES_CV.envoyer}
            ton="secondaire"
            multiligne
            onPress={() => actions.terminer(onEnvoyer)}
          />
          <BoutonAction
            libelle={TEXTES_MES_CV.supprimer}
            ton="discret"
            multiligne
            onPress={() => actions.terminer(onSupprimer)}
          />
        </FeuilleBasse>
      </VStack>
    </Animated.View>
  );
}
