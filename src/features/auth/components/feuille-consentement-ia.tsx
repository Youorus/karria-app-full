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

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <VStack className="gap-0.5">
      <Texte className="font-bold text-caption uppercase tracking-wide text-foreground-faint">
        {titre}
      </Texte>
      {children}
    </VStack>
  );
}

export function FeuilleConsentementIa() {
  const couleurs = useCouleurs();
  const {
    feuille,
    consentement,
    envois,
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

              <VStack className="items-center gap-2">
                <Texte
                  accessibilityRole="header"
                  className="text-center font-display text-title-sm tracking-tight text-foreground"
                >
                  {consultation
                    ? "Karria et tes données"
                    : "Avant qu'on commence, un mot sur tes données"}
                </Texte>
                <Texte className="px-2 text-center text-footnote leading-5 text-muted-foreground">
                  {consultation
                    ? "Voici ce que je partage avec mes fournisseurs d'IA pour travailler pour toi, et comment revenir dessus."
                    : "Pour t'aider, je m'appuie sur des modèles d'IA tiers. Je te dis ce qui leur est envoyé, et je ne fais rien sans ton accord."}
                </Texte>
              </VStack>

              <VStack className="gap-3 rounded-lg border border-border-subtle bg-background px-4 py-3">
                <Bloc titre="Ce qui part">
                  {envois.length === 0 ? (
                    <Texte className="text-footnote text-foreground">Lecture…</Texte>
                  ) : (
                    envois.map((envoi, i) => (
                      <Texte
                        key={envoi}
                        className={`text-footnote ${i === 0 && !consultation ? "font-bold text-foreground" : "text-foreground"}`}
                      >
                        {i === 0
                          ? envoi.charAt(0).toUpperCase() + envoi.slice(1)
                          : `· ${envoi}`}
                      </Texte>
                    ))
                  )}
                </Bloc>
                <Bloc titre="Chez qui, et pourquoi">
                  <Texte className="text-footnote text-foreground">
                    <Texte className="font-bold text-footnote text-foreground">
                      {fournisseurs}
                    </Texte>
                    , le temps de produire la réponse : comprendre ta recherche, écrire et
                    relire ton CV, transcrire ta voix, améliorer ta photo, expliquer ton
                    score ATS. Si cette liste change, je te le redemande.
                  </Texte>
                </Bloc>
                <Bloc titre="Ce que je ne fais jamais">
                  <Texte className="text-footnote text-foreground">
                    Tes données ne servent ni à entraîner des modèles, ni à te cibler avec
                    de la publicité. Elles sont conservées selon notre{" "}
                    <Texte
                      className="font-bold text-footnote text-primary underline"
                      accessibilityRole="link"
                      onPress={lirePolitique}
                    >
                      politique de confidentialité
                    </Texte>
                    .
                  </Texte>
                </Bloc>
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
