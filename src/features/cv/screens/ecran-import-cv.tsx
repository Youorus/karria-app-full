/**
 * Importer un CV existant — plein écran, Karria lit puis raconte.
 *
 * ═══ La mise en scène ═══
 *
 * L'orbe au centre, active pendant la lecture. Dessous, une seule phrase
 * honnête (« Je lis ton CV… », avec ce qui est parti), puis les notes de
 * lecture qui apparaissent une à une — chacune vient du compte rendu du
 * serveur, rien n'est inventé. À la fin : « Ton CV est importé », la
 * consigne de vérification (coordonnées d'abord), et « Voir mon CV ».
 *
 * Sobre et minimal : pas de barre de progression factice, pas de liste
 * d'étapes pré-écrites.
 */

import { Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { BoutonEnTeteRond } from "@/components/en-tete-karria";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";
import { useCouleurs } from "@/theme/use-couleurs";

import { NotesDeLecture } from "../components/notes-de-lecture";
import { useEcranImportCv } from "../hooks/use-ecran-import-cv";

export function EcranImportCv() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const e = useEcranImportCv();
  const { phase } = e;
  const lit = phase.nom === "lecture" || phase.nom === "choix";

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <HStack className="items-center justify-end px-5 pb-2 pt-2">
          <BoutonEnTeteRond libelle="Fermer" onPress={e.fermer}>
            <Icone nom="fermer" couleur={couleurs.texte} taille={15} graisse="semibold" />
          </BoutonEnTeteRond>
        </HStack>

        <ScrollView
          contentContainerClassName="grow justify-center gap-8 px-6 pb-8"
          showsVerticalScrollIndicator={false}
        >
          <Box className="items-center">
            <OrbeVivante taille={120} active={lit}>
              <SymboleKarria taille={44} teinte="reflet" />
            </OrbeVivante>
          </Box>

          {phase.nom === "choix" ? (
            <Texte className="text-center text-body text-muted-foreground">
              Choisis ton CV…
            </Texte>
          ) : null}

          {phase.nom === "lecture" ? (
            <Animated.View entering={reduit ? undefined : FadeIn.duration(300)}>
              <VStack className="items-center gap-2">
                <Texte className="text-center font-display text-title text-foreground">
                  Je lis ton CV…
                </Texte>
                <Texte className="text-center text-body text-muted-foreground">
                  {phase.type} est bien arrivé. Quelques secondes.
                </Texte>
              </VStack>
            </Animated.View>
          ) : null}

          {/* L'attente est le seul moment de cet écran sans bouton : l'annonce
              s'y pose, sous la phrase, et s'en va avec elle. */}
          {phase.nom === "lecture" && e.annonce !== null ? (
            <CarteAnnonce annonce={e.annonce} />
          ) : null}

          {phase.nom === "notes" ? (
            <Pressable
              onPress={e.toutVoir}
              accessibilityRole="button"
              accessibilityHint="Tout afficher"
            >
              <NotesDeLecture lignes={phase.lignes.slice(0, phase.visibles)} />
            </Pressable>
          ) : null}

          {phase.nom === "fini" ? (
            <Animated.View entering={reduit ? undefined : FadeInDown.duration(400)}>
              <VStack className="gap-6">
                <NotesDeLecture lignes={[]} resume={phase.resultat} />
                <VStack className="items-center gap-2">
                  <Texte className="text-center font-display text-title text-foreground">
                    Ton CV est importé.
                  </Texte>
                  <Texte className="text-center text-body leading-6 text-muted-foreground">
                    Vérifie d&apos;abord tes coordonnées, puis que tes expériences et tes
                    formations sont à jour.
                  </Texte>
                </VStack>
                <BoutonAction libelle="Voir mon CV" onPress={e.voirMonCv} />
              </VStack>
            </Animated.View>
          ) : null}

          {phase.nom === "erreur" ? (
            <Animated.View entering={reduit ? undefined : FadeIn.duration(300)}>
              <VStack className="gap-5">
                <Texte className="text-center text-body leading-6 text-foreground">
                  {phase.message}
                </Texte>
                <VStack className="gap-3">
                  {phase.fichiers !== null ? (
                    <BoutonAction libelle="Réessayer" onPress={e.reessayer} />
                  ) : null}
                  <BoutonAction
                    libelle="Choisir un fichier"
                    ton={phase.fichiers === null ? "principal" : "secondaire"}
                    onPress={() => e.changerDeSource("fichier")}
                    icone={
                      <Icone
                        nom="importer"
                        couleur={
                          phase.fichiers === null ? couleurs.surPrimaire : couleurs.texte
                        }
                        taille={16}
                      />
                    }
                  />
                  <BoutonAction
                    libelle="Prendre en photo"
                    ton="secondaire"
                    onPress={() => e.changerDeSource("camera")}
                    icone={<Icone nom="camera" couleur={couleurs.texte} taille={16} />}
                  />
                  <Pressable
                    onPress={e.creerDeZero}
                    className="min-h-touch items-center justify-center"
                    accessibilityRole="button"
                  >
                    <Texte className="font-medium text-footnote text-muted-foreground">
                      Créer de zéro
                    </Texte>
                  </Pressable>
                </VStack>
              </VStack>
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}
