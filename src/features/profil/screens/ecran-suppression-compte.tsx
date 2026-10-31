/**
 * Supprimer son compte — en deux étapes, au tutoiement, sans retenir.
 *
 * ═══ Étape 1 : pourquoi tu pars ═══
 *
 * Karria demande — l'orbe, une phrase — et propose six raisons, une seule
 * à choisir. Sous la raison choisie, elle répond : elle félicite quand on a
 * trouvé un emploi, elle propose de couper les notifications plutôt que
 * le compte quand c'est le bruit qui fait partir. Un mot libre, borné,
 * est facultatif. « Continuer » n'appelle au clic qu'une fois une raison
 * choisie.
 *
 * ═══ Étape 2 : ce qui disparaît ═══
 *
 * Quatre lignes, en clair, puis le rappel que c'est définitif. Le bouton
 * est rouge plein — le seul de l'application — et dit ce qu'il fait en
 * entier. « Garder mon compte » est juste au-dessus, en bleu : partir ne
 * doit pas être plus facile que rester.
 *
 * ═══ Le clavier ═══
 *
 * Le mot libre est en bas de la première étape. `KeyboardAvoidingView`
 * remonte la page quand il s'ouvre, sinon on écrit à l'aveugle.
 */

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { contourDeChamp } from "@/components/contour-champ";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { useSuppressionCompte } from "../hooks/use-suppression-compte";
import { CE_QUI_DISPARAIT, DETAILS_MAX, RAISONS } from "../services/raisons-depart";

export function EcranSuppressionCompte() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const s = useSuppressionCompte();

  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(360).delay(60 + rang * 70);

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura active={s.etape === "raison"} assise />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour
          retour={s.etape === "raison" ? "Paramètres" : "Retour"}
          onRetour={s.etape === "raison" ? s.annuler : s.revenir}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {s.etape === "raison" ? (
            <ScrollView
              contentContainerClassName="gap-5 px-5 pb-6 pt-1"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <HStack className="items-center gap-3">
                <OrbeVivante taille={56} active>
                  <SymboleKarria taille={22} teinte="reflet" />
                </OrbeVivante>
                <VStack className="flex-1 gap-1">
                  <Texte
                    accessibilityRole="header"
                    className="font-display text-title tracking-tight text-foreground"
                  >
                    Avant que tu partes…
                  </Texte>
                  <Texte className="text-body leading-6 text-muted-foreground">
                    Dis-moi ce qui te fait quitter Karria. Ça m&apos;aide à faire mieux
                    pour les suivants.
                  </Texte>
                </VStack>
              </HStack>

              <Animated.View entering={entree(0)}>
                <VStack className="gap-2" accessibilityRole="radiogroup">
                  {RAISONS.map((r) => {
                    const choisie = s.raison === r.code;
                    return (
                      <Pressable
                        key={r.code}
                        onPress={() => s.choisirRaison(r.code)}
                        className={`min-h-touch flex-row items-center gap-3 rounded-tuile border-[1.5px] px-4 py-3 ${
                          choisie
                            ? "border-primary bg-surface-primary"
                            : "border-border-subtle bg-card"
                        }`}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: choisie }}
                        accessibilityLabel={r.libelle}
                      >
                        <Icone
                          nom={r.icone}
                          couleur={choisie ? couleurs.primaire : couleurs.estompe}
                          taille={18}
                        />
                        <Texte
                          className={`flex-1 text-body ${
                            choisie ? "font-bold text-primary" : "text-foreground"
                          }`}
                        >
                          {r.libelle}
                        </Texte>
                        {choisie ? (
                          <Icone
                            nom="coche"
                            couleur={couleurs.primaire}
                            taille={14}
                            graisse="bold"
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </VStack>
              </Animated.View>

              {s.reaction !== null ? (
                <Animated.View entering={reduit ? undefined : FadeIn.duration(260)}>
                  <VStack className="gap-3 rounded-carte bg-surface-secondary p-4">
                    <HStack className="items-start gap-2.5">
                      <Icone
                        nom={s.raison === "found_job" ? "fete" : "etincelles"}
                        couleur={couleurs.secondaire}
                        taille={16}
                      />
                      <Texte className="flex-1 text-footnote leading-5 text-foreground">
                        {s.reaction}
                      </Texte>
                    </HStack>
                    {s.alternativeNotifications ? (
                      <BoutonAction
                        libelle="Régler mes notifications"
                        ton="secondaire"
                        icone={
                          <Icone nom="cloche" couleur={couleurs.texte} taille={15} />
                        }
                        onPress={s.reglerLesNotifications}
                      />
                    ) : null}
                  </VStack>
                </Animated.View>
              ) : null}

              <Animated.View entering={entree(1)}>
                <VStack className="gap-1.5">
                  <Texte className="font-bold text-footnote text-foreground">
                    Un mot de plus ?{" "}
                    <Texte className="font-sans text-footnote text-foreground-faint">
                      (facultatif)
                    </Texte>
                  </Texte>
                  <Box
                    className={`rounded-champ bg-card px-4 py-3 ${contourDeChamp({ actif: false })}`}
                  >
                    <TextInput
                      value={s.details}
                      onChangeText={s.changerDetails}
                      multiline
                      maxLength={DETAILS_MAX}
                      placeholder="Ce qui t'a manqué, ce qui t'a agacé, ce que tu aurais aimé…"
                      placeholderTextColor={couleurs.estompe}
                      selectionColor={couleurs.primaire}
                      className="min-h-[88px] font-sans text-body text-foreground"
                      // Android pose le texte au milieu d'un champ multiligne.
                      textAlignVertical="top"
                      accessibilityLabel="Un mot de plus, facultatif"
                    />
                  </Box>
                  <Texte className="self-end text-caption text-foreground-faint">
                    {s.restant} caractères restants
                  </Texte>
                </VStack>
              </Animated.View>

              <Animated.View entering={entree(2)}>
                <VStack className="gap-1 pt-1">
                  <BoutonAction
                    libelle="Continuer"
                    desactive={s.raison === null}
                    onPress={s.continuer}
                    iconeFin={
                      <Icone nom="suivant" couleur={couleurs.surPrimaire} taille={14} />
                    }
                  />
                  <BoutonAction
                    libelle="Garder mon compte"
                    ton="discret"
                    onPress={s.annuler}
                  />
                </VStack>
              </Animated.View>
            </ScrollView>
          ) : (
            <VStack className="flex-1 px-5 pb-3">
              <ScrollView
                contentContainerClassName="gap-5 pt-1"
                showsVerticalScrollIndicator={false}
              >
                <Animated.View entering={entree(0)}>
                  <VStack className="gap-2">
                    <Texte
                      accessibilityRole="header"
                      className="font-display text-title tracking-tight text-foreground"
                    >
                      Ce qui sera supprimé
                    </Texte>
                    <Texte className="text-body leading-6 text-muted-foreground">
                      Tout, de ton côté comme du nôtre. Pas de corbeille, pas de délai :
                      si tu reviens un jour, tu repartiras de zéro.
                    </Texte>
                  </VStack>
                </Animated.View>

                <Animated.View entering={entree(1)}>
                  <VStack className="gap-3 rounded-carte border border-border-subtle bg-card p-4">
                    {CE_QUI_DISPARAIT.map((ligne, i) => (
                      <Texte
                        key={ligne}
                        className={`text-body text-foreground ${i > 0 ? "border-t border-border-subtle pt-3" : ""}`}
                      >
                        {ligne}
                      </Texte>
                    ))}
                  </VStack>
                </Animated.View>

                <Animated.View entering={entree(2)}>
                  <HStack className="items-start gap-2.5 rounded-carte border border-border-warning bg-surface-warning p-4">
                    <Icone nom="alerte" couleur={couleurs.avertissement} taille={18} />
                    <Texte className="flex-1 text-footnote leading-5 text-foreground">
                      C&apos;est irréversible. Tes autres appareils seront déconnectés
                      aussi.
                    </Texte>
                  </HStack>
                </Animated.View>

                {s.erreur !== null ? (
                  <MessageErreur
                    message={s.erreur}
                    action={() => void s.confirmer()}
                    libelleAction="Réessayer"
                  />
                ) : null}
              </ScrollView>

              <Animated.View
                entering={reduit ? undefined : FadeIn.duration(400).delay(300)}
              >
                <VStack className="gap-1 pt-3">
                  <BoutonAction
                    libelle="Garder mon compte"
                    ton="discret"
                    desactive={s.enCours}
                    onPress={s.annuler}
                  />
                  {/* Sans icône : le texte du bouton est sombre sur rouge
                      clair en mode nuit, et aucune constante du thème ne
                      porte cette couleur pour un pictogramme. Le mot suffit. */}
                  <BoutonAction
                    libelle="Oui, supprimer mon compte"
                    ton="destructif"
                    enCours={s.enCours}
                    libelleEnCours="Suppression…"
                    onPress={() => void s.confirmer()}
                  />
                </VStack>
              </Animated.View>
            </VStack>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}
