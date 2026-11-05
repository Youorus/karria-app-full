/**
 * « Karria et l'IA » — l'information sur l'IA, lisible **avant** de se
 * connecter, depuis la phrase « en continuant » de la feuille de connexion.
 *
 * ═══ La même feuille, sans le bouton d'accord ═══
 *
 * Même orbe, même titre, même voix que `feuille-consentement-ia.tsx` : ce
 * que l'on accepte en continuant est exactement ce que la feuille de
 * consentement demanderait. Mais ici rien à accepter — l'accord, c'est
 * continuer sur l'écran d'en dessous — donc un seul bouton, « Compris ».
 * Trois lignes disent l'essentiel sans texte légal : **ce qui part**,
 * **chez qui** (les fournisseurs tels que le serveur les nomme, depuis le
 * routage réel), **pourquoi**. Puis les deux promesses et le lien vers la
 * politique de confidentialité.
 *
 * ═══ Un `Modal` imbriqué, pas un frère ═══
 *
 * La feuille de connexion est elle-même un `Modal`. Sur iOS, un second
 * `Modal` ne se présente de façon fiable au-dessus du premier que s'il est
 * **dans** son arbre — c'est pourquoi ce composant se rend depuis
 * `FeuilleConnexion`, et non au niveau de la mise en page comme la feuille
 * de consentement de l'espace connecté.
 */

import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { InformationIa } from "../hooks/use-information-ia";

/** « tes messages à Karria, ta voix… et ta photo ». */
function enUnePhrase(envois: readonly string[]): string {
  if (envois.length === 0) return "tes messages, ta voix, ton CV et ta photo";
  if (envois.length === 1) return envois[0] ?? "";
  return `${envois.slice(0, -1).join(", ")} et ${envois[envois.length - 1]}`;
}

function Ligne({
  titre,
  texte,
  premiere,
}: {
  titre: string;
  texte: string;
  premiere?: boolean;
}) {
  return (
    <VStack className={`gap-0.5 ${premiere ? "" : "border-t border-border-subtle pt-3"}`}>
      <Texte className="font-bold text-footnote text-foreground">{titre}</Texte>
      <Texte className="text-footnote leading-5 text-muted-foreground">{texte}</Texte>
    </VStack>
  );
}

export function FeuilleInformationIa({
  ouverte,
  fermer,
  envois,
  fournisseurs,
  indisponible,
  lirePolitique,
}: InformationIa) {
  const couleurs = useCouleurs();

  return (
    <Modal animationType="slide" transparent visible={ouverte} onRequestClose={fermer}>
      <Box className="flex-1 justify-end bg-scrim-fort">
        <Pressable
          style={{ flex: 1 }}
          onPress={fermer}
          accessibilityLabel="Fermer"
          accessibilityRole="button"
        />
        <View className="max-h-[92%] rounded-t-[32px] border-t border-border-subtle bg-card">
          <SafeAreaView edges={["bottom"]}>
            <ScrollView
              contentContainerClassName="gap-4 px-6 pb-5 pt-4"
              showsVerticalScrollIndicator={false}
            >
              <HStack className="items-center justify-between">
                <Box className="w-8" />
                <OrbeVivante taille={52} active={false}>
                  <SymboleKarria taille={20} teinte="reflet" />
                </OrbeVivante>
                <Pressable
                  onPress={fermer}
                  className="h-8 w-8 items-center justify-center rounded-full bg-remplissage active:opacity-70"
                  accessibilityLabel="Fermer"
                  accessibilityRole="button"
                >
                  <Icone
                    nom="fermer"
                    couleur={couleurs.estompe}
                    taille={14}
                    graisse="bold"
                  />
                </Pressable>
              </HStack>

              <VStack className="items-center gap-2">
                <Texte
                  accessibilityRole="header"
                  className="text-center font-display text-title-sm tracking-tight text-foreground"
                >
                  Karria et l&apos;IA
                </Texte>
                <Texte className="px-2 text-center text-footnote leading-5 text-muted-foreground">
                  Pour te répondre, écrire ton CV et l&apos;adapter aux offres, Karria
                  s&apos;appuie sur des modèles d&apos;IA. Voici ce que ça implique.
                </Texte>
              </VStack>

              {indisponible ? (
                <MessageErreur message="Je n'arrive pas à lire l'information du serveur. Vérifie ta connexion, puis rouvre « Karria et l'IA »." />
              ) : null}

              <VStack className="gap-3 rounded-lg border border-border-subtle bg-background px-4 py-3">
                <Ligne titre="Ce qui part" texte={enUnePhrase(envois)} premiere />
                <Ligne titre="Chez qui" texte={fournisseurs} />
                <Ligne
                  titre="Pourquoi"
                  texte="Te répondre, écrire et adapter ton CV, transcrire ta voix, améliorer ta photo. Rien d'autre."
                />
              </VStack>

              <Texte className="px-2 text-center text-footnote leading-5 text-muted-foreground">
                Jamais pour entraîner des modèles ni pour de la publicité. La conservation
                suit notre{" "}
                <Texte
                  className="font-bold text-footnote text-primary underline"
                  accessibilityRole="link"
                  onPress={lirePolitique}
                >
                  Politique de Confidentialité
                </Texte>
                .
              </Texte>

              <VStack className="gap-1">
                <BoutonAction libelle="Compris" onPress={fermer} />
                <Texte className="px-4 text-center text-caption text-muted-foreground">
                  En continuant, tu acceptes ce fonctionnement. Tu pourras retirer ton
                  accord à tout moment, dans les paramètres.
                </Texte>
              </VStack>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Box>
    </Modal>
  );
}
