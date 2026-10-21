/**
 * La saisie du code reçu par e-mail.
 *
 * ═══ Tout est aligné à gauche ═══
 *
 * Y compris le titre. Un texte centré se lit plus lentement : l'œil doit
 * chercher le début de chaque ligne. Sur un écran où l'on recopie six
 * chiffres, cette demi-seconde compte.
 *
 * ═══ C'est la dernière étape ═══
 *
 * Le code juste ouvre la session et mène droit à l'assistant. Dans la V1,
 * il menait à un mot de passe puis à quinze écrans de profil.
 *
 * ═══ Si le parcours est perdu ═══
 *
 * Certaines erreurs — parcours périmé, trop de renvois — ne se réparent
 * pas ici. L'écran le dit et renvoie à l'adresse plutôt que de laisser
 * réessayer un code sur un parcours qui n'existe plus.
 */

import { KeyboardAvoidingView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { MessageErreur } from "@/components/message-erreur";
import { PiedAction } from "@/components/pied-action";
import { Texte } from "@/components/texte";
import { TitreAccentue } from "@/components/titre-accentue";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import { ChampCode } from "../components/champ-code";
import { useSaisieCode } from "../hooks/use-saisie-code";

export function EcranCode() {
  const {
    code,
    changerCode,
    envoyeA,
    valableMinutes,
    avantRenvoi,
    enCours,
    erreur,
    complet,
    valider,
    renvoyer,
    recommencer,
    indiceSimulation,
  } = useSaisieCode();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <VStack className="flex-1 px-5">
            <VStack space="xl" className="pt-14">
              <VStack space="sm">
                <TitreAccentue
                  avant={"Entre le code\n"}
                  accent="à 6 chiffres"
                  taille="hero"
                />
                <Texte className="text-body text-muted-foreground">
                  Envoyé à{" "}
                  <Texte className="font-bold text-body text-foreground">{envoyeA}</Texte>
                  . Il reste valable {valableMinutes} minutes.
                </Texte>
              </VStack>

              <ChampCode
                valeur={code}
                onChange={changerCode}
                erreur={erreur?.champ === "code"}
                editable={!enCours}
              />

              {indiceSimulation !== null ? (
                <Box className="rounded-sm bg-surface-primary px-4 py-3">
                  <Texte className="text-footnote text-foreground">
                    Mode simulation : le code est{" "}
                    <Texte className="font-bold text-footnote text-primary">
                      {indiceSimulation}
                    </Texte>
                    .
                  </Texte>
                </Box>
              ) : null}

              {erreur !== null ? (
                <MessageErreur
                  message={erreur.message}
                  action={erreur.recommencer ? recommencer : undefined}
                  libelleAction={erreur.recommencer ? "Recommencer" : undefined}
                />
              ) : null}

              <VStack space="xs">
                <Texte className="text-footnote text-muted-foreground">
                  Rien reçu ? Regarde dans tes indésirables.
                </Texte>
                {avantRenvoi > 0 ? (
                  <Texte className="text-footnote text-muted-foreground">
                    Tu pourras en redemander un dans {avantRenvoi} s
                  </Texte>
                ) : (
                  <Pressable
                    onPress={renvoyer}
                    disabled={enCours}
                    className="min-h-touch justify-start pt-1"
                    accessibilityRole="button"
                    accessibilityLabel="Renvoyer le code"
                  >
                    <Texte className="font-bold text-footnote text-primary underline">
                      Renvoyer le code
                    </Texte>
                  </Pressable>
                )}
              </VStack>
            </VStack>
          </VStack>

          <PiedAction>
            <BoutonAction
              libelle="Entrer"
              libelleEnCours="Vérification…"
              enCours={enCours}
              desactive={!complet}
              onPress={() => void valider()}
            />
          </PiedAction>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}
