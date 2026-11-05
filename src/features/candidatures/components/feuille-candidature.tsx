/**
 * La feuille « As-tu candidaté à cette offre ? »
 *
 * ═══ Quand elle se montre ═══
 *
 * Après un export ou un envoi depuis l'atelier : c'est le moment où la
 * personne vient de faire quelque chose de concret avec son dossier, et
 * la seule question qui compte est de savoir si la candidature est
 * partie. Deux réponses, rien d'autre : « Oui, c'est fait » marque le
 * dossier, laisse une phrase à l'onglet Candidatures et y renvoie ;
 * « Pas encore » referme, sans déplacer.
 *
 * ═══ Comment l'appeler ═══
 *
 * ```tsx
 * <FeuilleCandidature visible={ouverte} dossierId={dossier.id} onFermer={fermer} />
 * ```
 *
 * `onMarque` (facultatif) reçoit le dossier marqué, pour un écran qui
 * voudrait mettre son état à jour avant de partir.
 *
 * ═══ Sa forme ═══
 *
 * Une feuille basse sur un voile, pas une alerte système : la question
 * fait partie de l'application, avec sa typographie et son bouton bleu.
 * Elle se ferme d'un toucher sur le voile ou du retour Android — ce qui
 * vaut « Pas encore ».
 */

import { Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import { useFeuilleCandidature } from "../hooks/use-feuille-candidature";
import { TEXTES } from "../services/presentation";
import type { Dossier } from "../types/candidatures.types";

export interface FeuilleCandidatureProps {
  visible: boolean;
  dossierId: string;
  onFermer: () => void;
  /** Le dossier une fois marqué « candidaté », avant le renvoi vers Candidatures. */
  onMarque?: (dossier: Dossier) => void;
}

export function FeuilleCandidature({
  visible,
  dossierId,
  onFermer,
  onMarque,
}: FeuilleCandidatureProps) {
  const { enregistrement, oui, pasEncore } = useFeuilleCandidature(
    dossierId,
    onFermer,
    onMarque,
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={pasEncore}
      statusBarTranslucent
    >
      <Box style={{ flex: 1 }} className="justify-end bg-scrim">
        <Pressable
          style={{ flex: 1 }}
          onPress={pasEncore}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <Box className="rounded-t-lg bg-background px-6 pt-6">
          <SafeAreaView edges={["bottom"]}>
            <VStack space="lg" className="pb-4">
              <VStack space="xs">
                <Texte
                  accessibilityRole="header"
                  className="font-display text-title tracking-tight text-foreground"
                >
                  {TEXTES.questionTitre}
                </Texte>
                <Texte className="text-body text-muted-foreground">
                  Si oui, ton dossier passe en « candidaté » avec la date du jour.
                </Texte>
              </VStack>
              <VStack space="sm">
                <BoutonAction
                  libelle={TEXTES.questionOui}
                  ton="principal"
                  enCours={enregistrement}
                  libelleEnCours="Un instant…"
                  onPress={oui}
                />
                <BoutonAction
                  libelle={TEXTES.questionPasEncore}
                  ton="secondaire"
                  desactive={enregistrement}
                  onPress={pasEncore}
                />
              </VStack>
            </VStack>
          </SafeAreaView>
        </Box>
      </Box>
    </Modal>
  );
}
