/**
 * Créer son CV avec Karria — plein écran, une question à la fois.
 *
 * ═══ La mise en scène ═══
 *
 * - en haut, la frise (où on en est) et le mini-CV (ce qu'on a déjà) ;
 * - au centre, Karria : l'orbe et sa question, puis ce qu'il a compris ;
 * - en bas, la réponse : le micro d'abord, l'écrit toujours possible, et
 *   « Passer » pour les chapitres facultatifs.
 *
 * Rien d'autre à l'écran : pas d'onglets, pas de menu. Comme une
 * conversation, on ne regarde qu'une chose à la fois.
 */

import { KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { BoutonEnTeteRond } from "@/components/en-tete-karria";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { Suggestions } from "@/features/assistant/components/suggestions";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteJet } from "../components/carte-jet";
import { EtapePhoto } from "../components/etape-photo";
import { FriseChapitres } from "../components/frise-chapitres";
import { MiniCv } from "../components/mini-cv";
import { ParoleKarria } from "../components/parole-karria";
import { SaisieReponse } from "../components/saisie-reponse";
import { useCreationCv } from "../hooks/use-creation-cv";

function Revelation({ onVoir }: { onVoir: () => void }) {
  const reduit = useReducedMotion();
  return (
    <VStack className="flex-1 items-center justify-center gap-6 px-8">
      <OrbeVivante taille={120} active>
        <SymboleKarria taille={44} teinte="reflet" />
      </OrbeVivante>
      <Animated.View entering={reduit ? undefined : FadeInDown.duration(500).delay(300)}>
        <VStack className="items-center gap-2">
          <Texte className="text-center font-display text-title text-foreground">
            Ton CV est prêt !
          </Texte>
          <Texte className="text-center text-body text-muted-foreground">
            Tout ce que tu m&apos;as dit est rangé, mis en forme, prêt à être envoyé.
          </Texte>
        </VStack>
      </Animated.View>
      <Animated.View
        entering={reduit ? undefined : FadeIn.duration(400).delay(700)}
        className="w-full"
      >
        <BoutonAction libelle="Voir mon CV" onPress={onVoir} />
      </Animated.View>
    </VStack>
  );
}

export function EcranCreationCv() {
  const couleurs = useCouleurs();
  const c = useCreationCv();
  const { phase, chapitre } = c;
  const occupe =
    phase.nom === "reflexion" || phase.nom === "envoi" || phase.nom === "finalisation";
  const photo =
    phase.nom.startsWith("photo") || (phase.nom === "envoi" && chapitre.cle === "photo");
  const parle =
    phase.nom === "question" || phase.nom === "ecoute" || phase.nom === "reflexion";
  const surLaQuestion = c.parole === chapitre.question;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        {phase.nom === "termine" ? (
          <Revelation onVoir={c.fermer} />
        ) : (
          <KeyboardAvoidingView
            // `flex: 1` en style : l'évitement du clavier mesure sa propre
            // hauteur et ne lit pas les classes.
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <HStack className="items-center gap-4 px-5 pb-3 pt-2">
              <Box className="flex-1">
                <FriseChapitres progression={c.progression} />
              </Box>
              <BoutonEnTeteRond
                libelle="Fermer, je reprendrai plus tard"
                onPress={c.fermer}
              >
                <Icone
                  nom="fermer"
                  couleur={couleurs.texte}
                  taille={15}
                  graisse="semibold"
                />
              </BoutonEnTeteRond>
            </HStack>
            <MiniCv valides={c.valides} />

            {phase.nom === "chargement" || phase.nom === "finalisation" ? (
              <Box className="flex-1 items-center justify-center">
                <ChargeurKarria />
              </Box>
            ) : phase.nom === "erreur" ? (
              <Box className="flex-1 justify-center px-5">
                <MessageErreur
                  message={phase.message}
                  action={c.recommencer}
                  libelleAction="Réessayer"
                />
              </Box>
            ) : (
              <>
                <ScrollView
                  contentContainerClassName="grow justify-center gap-8 px-5 py-6"
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  showsVerticalScrollIndicator={false}
                >
                  <ParoleKarria
                    parole={
                      phase.nom === "encore" ? (chapitre.encore ?? c.parole) : c.parole
                    }
                    aide={parle && surLaQuestion ? chapitre.aide : null}
                    reflechit={occupe}
                  />

                  {phase.nom === "reflexion" && phase.reponse !== "" ? (
                    <Animated.View entering={FadeIn.duration(200)} className="items-end">
                      <Box className="max-w-[85%] rounded-lg rounded-br-xs bg-bulle px-4 py-3">
                        <Texte className="text-callout text-bulle-foreground">
                          {phase.reponse}
                        </Texte>
                      </Box>
                    </Animated.View>
                  ) : null}

                  {phase.nom === "question" &&
                  surLaQuestion &&
                  chapitre.suggestions.length > 0 ? (
                    <Suggestions
                      suggestions={chapitre.suggestions}
                      onChoisir={c.toucherSuggestion}
                    />
                  ) : null}

                  {c.importation.possible ? (
                    <Pressable
                      onPress={c.importation.importer}
                      disabled={c.importation.enCours}
                      className="min-h-touch flex-row items-center justify-center gap-2"
                      accessibilityRole="button"
                      accessibilityHint="Karria lit ton CV et pré-remplit la conversation"
                      accessibilityState={{ busy: c.importation.enCours }}
                    >
                      <Icone nom="importer" couleur={couleurs.primaire} taille={14} />
                      <Texte className="font-bold text-footnote text-primary">
                        {c.importation.enCours ? "Je lis ton CV…" : "J'ai déjà un CV"}
                      </Texte>
                    </Pressable>
                  ) : null}

                  {phase.nom === "envoi" ? (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <Texte className="text-center text-footnote text-muted-foreground">
                        Je range ça dans ton CV…
                      </Texte>
                    </Animated.View>
                  ) : null}

                  {phase.nom === "jet" ? (
                    <CarteJet
                      jet={phase.jet}
                      relance={phase.relance}
                      occupe={false}
                      onValider={c.valider}
                      onCorriger={c.corriger}
                    />
                  ) : null}

                  {phase.nom === "encore" ? (
                    <VStack className="gap-3">
                      <BoutonAction
                        libelle="Oui, j'en ajoute une"
                        onPress={() => c.encore(true)}
                      />
                      <BoutonAction
                        libelle="Non, c'est tout"
                        ton="secondaire"
                        onPress={() => c.encore(false)}
                      />
                    </VStack>
                  ) : null}

                  {photo ? (
                    <EtapePhoto
                      phase={phase}
                      occupe={occupe}
                      onVouloir={c.photo.vouloir}
                      onChoisir={c.photo.choisir}
                      onAmeliorer={c.photo.ameliorer}
                      onGarder={c.photo.garder}
                    />
                  ) : null}
                </ScrollView>

                <VStack className="gap-2 px-4 pb-2">
                  {c.probleme !== null ? (
                    <Texte className="text-center text-footnote text-destructive">
                      {c.probleme}
                    </Texte>
                  ) : null}
                  {parle ? (
                    <SaisieReponse
                      valeur={c.texte}
                      onChange={c.setTexte}
                      onEnvoyer={c.envoyer}
                      onMicro={c.basculerMicro}
                      ecoute={phase.nom === "ecoute"}
                      niveau={c.niveauMicro}
                      occupe={phase.nom === "reflexion"}
                      enCorrection={c.enCorrection}
                    />
                  ) : null}
                  {parle && chapitre.facultatif && !c.enCorrection ? (
                    <Pressable
                      onPress={c.passer}
                      disabled={occupe}
                      className="min-h-touch items-center justify-center"
                      accessibilityRole="button"
                    >
                      <Texte className="font-medium text-footnote text-muted-foreground">
                        {chapitre.boucle && c.elements.length > 0
                          ? "Chapitre suivant"
                          : "Passer cette question"}
                      </Texte>
                    </Pressable>
                  ) : null}
                </VStack>
              </>
            )}
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Box>
  );
}
