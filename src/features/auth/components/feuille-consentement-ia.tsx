/**
 * La feuille de consentement à l'IA : avant que la première donnée ne parte
 * chez un fournisseur de modèles, Karria dit ce qui part, chez qui, et
 * pourquoi — et demande.
 *
 * ═══ Ce qu'exige Apple (5.1.2 i), dit dans la voix de Karria ═══
 *
 * Pas un texte légal : l'orbe, une phrase à la première personne, puis trois
 * blocs courts — **ce qui part** (l'outil qu'on vient de toucher en tête),
 * **chez qui** (les fournisseurs tels que le serveur les nomme : la liste
 * suit le routage réel), **pourquoi** (répondre, écrire le CV, transcrire,
 * améliorer). Et les deux promesses : jamais pour entraîner un modèle ni pour
 * la publicité ; la conservation suit la politique de confidentialité, dont
 * le lien est là.
 *
 * Une seule action en bleu plein, « J'accepte et je continue » ; « Pas
 * maintenant » existe sans peser. En consultation (paramètres), la date de
 * l'accord et « Retirer mon consentement ».
 *
 * Montée une fois, au-dessus de l'espace `(app)` ; ouverte par le store
 * (`services/consentement-ia.ts`) depuis n'importe quel hook d'IA.
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

import { useConsentementIa } from "../hooks/use-consentement-ia";

export function FeuilleConsentementIa() {
  const couleurs = useCouleurs();
  const {
    feuille,
    consentement,
    fournisseurs,
    accepteLe,
    enCours,
    erreur,
    accepter,
    retirer,
    plusTard,
    lirePolitique,
  } = useConsentementIa();

  if (feuille === null) return null;
  const consultation = feuille.mode === "consultation";

  return (
    <Modal animationType="slide" transparent visible onRequestClose={plusTard}>
      <Box className="flex-1 justify-end bg-scrim-fort">
        <Pressable
          style={{ flex: 1 }}
          onPress={plusTard}
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
                <OrbeVivante taille={52} active={!consultation}>
                  <SymboleKarria taille={20} teinte="reflet" />
                </OrbeVivante>
                <Pressable
                  onPress={plusTard}
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

              <VStack className="items-center gap-3">
                <Texte
                  accessibilityRole="header"
                  className="text-center font-display text-title-sm tracking-tight text-foreground"
                >
                  Karria et tes données
                </Texte>
                {/* Court, mais complet pour l'App Store (5.1.2 i) : ce qui part,
                    chez qui, et l'accord explicite demandé par le bouton. */}
                <Texte className="px-2 text-center text-footnote leading-5 text-muted-foreground">
                  Pour te répondre, Karria envoie tes messages, ta voix, ton CV et ta
                  photo à{" "}
                  <Texte className="font-bold text-footnote text-foreground">
                    {fournisseurs}
                  </Texte>
                  . Jamais pour entraîner des modèles ni pour de la publicité.{" "}
                  <Texte
                    className="font-bold text-footnote text-primary underline"
                    accessibilityRole="link"
                    onPress={lirePolitique}
                  >
                    En savoir plus
                  </Texte>
                </Texte>
              </VStack>

              {erreur !== null ? <MessageErreur message={erreur} /> : null}

              {consultation ? (
                <VStack className="gap-2">
                  {accepteLe !== null ? (
                    <Texte className="text-center text-footnote text-muted-foreground">
                      Accord donné le {accepteLe}
                      {consentement?.versionAcceptee
                        ? ` · version ${consentement.versionAcceptee}`
                        : ""}
                    </Texte>
                  ) : (
                    <Texte className="text-center text-footnote text-muted-foreground">
                      Aucun accord en cours : je te demanderai avant le premier outil
                      d&apos;IA.
                    </Texte>
                  )}
                  {accepteLe !== null ? (
                    <BoutonAction
                      libelle="Retirer mon consentement"
                      libelleEnCours="Un instant…"
                      ton="secondaire"
                      enCours={enCours}
                      onPress={retirer}
                    />
                  ) : (
                    <BoutonAction
                      libelle="J'accepte"
                      libelleEnCours="Un instant…"
                      enCours={enCours}
                      desactive={consentement === null}
                      onPress={accepter}
                    />
                  )}
                  <BoutonAction libelle="Fermer" ton="discret" onPress={plusTard} />
                </VStack>
              ) : (
                <VStack className="gap-1">
                  <BoutonAction
                    libelle="J'accepte et je continue"
                    libelleEnCours="Un instant…"
                    enCours={enCours}
                    desactive={consentement === null}
                    onPress={accepter}
                  />
                  <BoutonAction
                    libelle="Pas maintenant"
                    ton="discret"
                    onPress={plusTard}
                  />
                  <Texte className="px-4 text-center text-caption text-muted-foreground">
                    Tu pourras retirer ton accord à tout moment, dans les paramètres.
                  </Texte>
                </VStack>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Box>
    </Modal>
  );
}
