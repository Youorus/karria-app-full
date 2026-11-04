/**
 * Modifier une section du CV — un formulaire, un bouton, une confirmation.
 *
 * ═══ L'anatomie ═══
 *
 * En haut : « Annuler », le titre de la section, et l'état
 * d'enregistrement (« Enregistré » avec sa coche, ou le problème). Au
 * centre : le formulaire de la section. En bas, pour les formulaires
 * simples : « Enregistrer » en bleu plein. Les listes n'ont pas de bouton :
 * chaque geste s'enregistre et l'en-tête le dit.
 *
 * Une bannière discrète prévient quand des saisies non enregistrées ont
 * été restituées : la personne sait d'où vient ce qu'elle voit.
 */

import { KeyboardAvoidingView, Platform, Pressable, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { FeuilleElement } from "../components/edition/formulaires-elements";
import {
  FormulaireCompetences,
  FormulaireInterets,
} from "../components/edition/formulaires-listes-courtes";
import { FormulairePhoto } from "../components/edition/formulaire-photo";
import {
  FormulaireContact,
  FormulaireIdentite,
  FormulairePresentation,
} from "../components/edition/formulaires-simples";
import { ListeElements } from "../components/edition/liste-elements";
import { useModifierCv, type ValeurSection } from "../hooks/use-modifier-cv";

function Formulaire({ v, m }: { v: ValeurSection; m: ReturnType<typeof useModifierCv> }) {
  const occupe = m.enregistrement === "en-cours";
  switch (v.section) {
    case "identity":
      return (
        <FormulaireIdentite
          valeur={v.valeur}
          onChange={m.changer}
          erreurs={m.erreursChamps}
        />
      );
    case "contact":
      return (
        <FormulaireContact
          valeur={v.valeur}
          onChange={m.changer}
          erreurs={m.erreursChamps}
        />
      );
    case "summary":
      return (
        <FormulairePresentation
          valeur={v.valeur}
          onChange={m.changer}
          erreurs={m.erreursChamps}
        />
      );
    case "skills":
      return <FormulaireCompetences valeur={v.valeur} onChange={m.changer} />;
    case "interests":
      return <FormulaireInterets valeur={v.valeur} onChange={m.changer} />;
    case "photo":
      return (
        <FormulairePhoto
          valeur={v.valeur}
          enCours={m.photo.enCours}
          probleme={m.photo.probleme}
          onChanger={m.photo.changer}
          onRetirer={m.photo.retirer}
        />
      );
    case "experiences":
    case "educations":
      return (
        <>
          <ListeElements
            elements={v.valeur}
            libelleAjout={
              v.section === "experiences"
                ? "Ajouter une expérience"
                : "Ajouter une formation"
            }
            occupe={occupe}
            onEditer={m.liste.editer}
            onSupprimer={m.liste.supprimer}
            onMonter={m.liste.monter}
            onDescendre={m.liste.descendre}
            onAjouter={m.liste.ajouter}
          />
          <FeuilleElement
            section={v.section}
            valeur={m.liste.enEdition?.valeur ?? null}
            nouveau={m.liste.enEdition?.index === null}
            erreurs={m.erreursChamps}
            onChange={m.liste.changerElement}
            onValider={m.liste.validerElement}
            onFermer={m.liste.fermerElement}
          />
        </>
      );
  }
}

export function EcranModifierCv() {
  const couleurs = useCouleurs();
  const m = useModifierCv();
  const simple = !m.enListe && m.section !== "photo";

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <HStack className="h-[52px] items-center justify-between px-4">
            <Pressable
              onPress={m.annuler}
              className="min-h-touch min-w-[72px] justify-center"
              accessibilityRole="button"
            >
              <Texte className="text-body text-muted-foreground">
                {simple && m.modifie ? "Annuler" : "Fermer"}
              </Texte>
            </Pressable>
            <Texte className="font-bold text-body text-foreground">{m.titre}</Texte>
            <Box className="min-w-[72px] items-end">
              {m.enregistrement === "fait" ? (
                <Animated.View entering={FadeIn.duration(200)}>
                  <HStack className="items-center gap-1" accessibilityLiveRegion="polite">
                    <Icone
                      nom="coche"
                      couleur={couleurs.succes}
                      taille={13}
                      graisse="bold"
                    />
                    <Texte className="font-bold text-footnote text-success">
                      Enregistré
                    </Texte>
                  </HStack>
                </Animated.View>
              ) : m.enregistrement === "en-cours" ? (
                <Texte className="text-footnote text-muted-foreground">
                  Enregistrement…
                </Texte>
              ) : null}
            </Box>
          </HStack>

          {m.chargement ? (
            <Box className="flex-1 items-center justify-center">
              <ChargeurKarria />
            </Box>
          ) : m.erreur !== null || m.valeur === null ? (
            <Box className="flex-1 justify-center px-5">
              <MessageErreur
                message={m.erreur ?? "Ton CV n'a pas pu être chargé."}
                action={m.annuler}
                libelleAction="Revenir"
              />
            </Box>
          ) : (
            <>
              <ScrollView
                contentContainerClassName="gap-5 px-5 pb-8 pt-2"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
              >
                {m.restaure ? (
                  <HStack className="items-center gap-2 rounded-carte bg-surface-primary px-4 py-3">
                    <Icone nom="info" couleur={couleurs.primaire} taille={14} />
                    <Texte className="flex-1 text-footnote text-foreground">
                      Tes modifications non enregistrées sont là.
                    </Texte>
                  </HStack>
                ) : null}
                <Formulaire v={m.valeur} m={m} />
                {m.probleme !== null ? (
                  <Texte
                    className="text-center text-footnote text-destructive"
                    accessibilityRole="alert"
                  >
                    {m.probleme}
                  </Texte>
                ) : null}
                {!simple &&
                m.enregistrement === "erreur" &&
                m.valeur.section !== "photo" ? (
                  <BoutonAction
                    libelle="Réessayer"
                    ton="secondaire"
                    onPress={m.enregistrer}
                  />
                ) : null}
              </ScrollView>
              {simple ? (
                <VStack className="px-5 pb-2 pt-2">
                  <BoutonAction
                    libelle="Enregistrer"
                    onPress={m.enregistrer}
                    enCours={m.enregistrement === "en-cours"}
                    libelleEnCours="Enregistrement…"
                    desactive={!m.modifie && m.enregistrement !== "erreur"}
                  />
                </VStack>
              ) : null}
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}
