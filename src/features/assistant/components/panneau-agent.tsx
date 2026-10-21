/**
 * Le panneau de l'agent : Karria, en conversation.
 *
 * ═══ Le parti pris ═══
 *
 * L'agent s'ouvre à la demande, depuis la barre « Demander à Karria… »
 * du fil : `RideauAgent` balaie le fil et fait apparaître ce panneau, puis
 * le referme pour y revenir. Le panneau reste monté entre deux
 * ouvertures — la conversation n'est pas perdue quand on revient aux
 * offres. Tout ce
 * que la V1 demandait en quinze écrans — métier, ville, contrat, niveau —
 * se dit ici, en une phrase, comme à quelqu'un. C'est l'immersion que
 * proposent ChatGPT, Claude ou Meta AI, appliquée à un seul métier : te
 * trouver le bon job.
 *
 * ═══ Deux visages ═══
 *
 * - **vierge** : l'orbe au centre, une salutation, quatre suggestions. Le
 *   champ vide n'intimide pas : on sait quoi dire.
 * - **en conversation** : le fil, la réponse qui se déroule, l'aura qui
 *   s'anime quand Karria réfléchit et parle.
 *
 * ═══ La liste est inversée ═══
 *
 * `inverted` pose le dernier message en bas et y garde la vue quand un
 * message arrive, sans effet ni défilement programmé. C'est le montage de
 * toutes les messageries, et le seul qui ne saute pas quand le clavier
 * s'ouvre.
 */

import { FlatList, KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Aura } from "@/components/aura";
import { LogoKarria, SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { BulleMessage } from "./bulle-message";
import { Compositeur } from "./compositeur";
import { Reflexion } from "./reflexion";
import { Suggestions } from "./suggestions";
import { useEcranAssistant } from "../hooks/use-ecran-assistant";

function IconeFermer({ couleur }: { couleur: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9.5l6 6 6-6"
        stroke={couleur}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PanneauAgent({ onFermer }: { onFermer: () => void }) {
  const couleurs = useCouleurs();
  const {
    fil,
    brouillon,
    changerBrouillon,
    envoyer,
    reflechit,
    erreur,
    peutEnvoyer,
    salutation,
    suggestions,
    vierge,
    active,
    fermer,
  } = useEcranAssistant(onFermer);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura active={active} assise={!vierge} />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <HStack className="items-center justify-between px-5 pb-1">
            <LogoKarria hauteur={22} />
            <Pressable
              onPress={fermer}
              className="h-touch w-touch items-center justify-center rounded-full border border-border-subtle bg-verre"
              accessibilityRole="button"
              accessibilityLabel="Fermer la conversation"
              accessibilityHint="Revient à tes offres"
            >
              <IconeFermer couleur={couleurs.texte} />
            </Pressable>
          </HStack>

          {vierge ? (
            <VStack space="xl" className="flex-1 items-center justify-center px-6">
              {/* La boîte de l'orbe déborde de moitié (halo, particules) :
                  la marge négative rend l'espace au titre. */}
              <Box className="-my-12">
                <OrbeVivante taille={110} active={active}>
                  <SymboleKarria taille={44} teinte="reflet" />
                </OrbeVivante>
              </Box>
              <Texte
                accessibilityRole="header"
                className="text-center font-display text-title-lg text-foreground"
              >
                {`${salutation}.\n`}
                <Texte className="font-display text-title-lg text-primary">
                  Qu&apos;est-ce que tu cherches ?
                </Texte>
              </Texte>
              <Suggestions suggestions={suggestions} onChoisir={envoyer} />
            </VStack>
          ) : (
            <FlatList
              inverted
              data={fil}
              keyExtractor={(message) => message.id}
              renderItem={({ item }) => <BulleMessage message={item} />}
              // Inversée, la liste rend son en-tête… en bas : c'est là que
              // la réponse va apparaître.
              ListHeaderComponent={reflechit ? <Reflexion /> : null}
              contentContainerClassName="gap-5 px-5 py-4"
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          {erreur !== null ? (
            <Box className="px-4 pb-2">
              <MessageErreur message={erreur} />
            </Box>
          ) : null}

          <Box className="px-3 pb-2 pt-1">
            <Compositeur
              valeur={brouillon}
              onChange={changerBrouillon}
              onEnvoyer={() => envoyer()}
              peutEnvoyer={peutEnvoyer}
            />
          </Box>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}
