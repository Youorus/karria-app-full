/**
 * La feuille « Karria sans pub » : l'offre, en plein format.
 *
 * ═══ Ce qu'on attend d'un bon écran d'abonnement ═══
 *
 * Une hiérarchie nette, lue de haut en bas sans effort : le mini-fil en
 * grand (l'annonce qui s'efface), un titre qui dit la promesse, trois
 * bénéfices lisibles, le prix et « sans engagement », **un seul** bouton
 * bleu, et la rassurance Stripe en bas. Rien d'autre : pas de comparatif,
 * pas de compte à rebours, pas de badge.
 *
 * ═══ La feuille native du système ═══
 *
 * `pageSheet`, comme les filtres : elle suit le geste de fermeture d'iOS
 * et le retour d'Android, sans dépendance.
 *
 * ═══ Le paiement se lance une fois la feuille refermée ═══
 *
 * La page Stripe s'ouvre dans une session du navigateur, présentée par le
 * système au-dessus de l'application. L'ouvrir pendant que la feuille se
 * ferme, c'est deux présentations qui se disputent — et sur iOS, l'une des
 * deux est refusée en silence. On ferme donc d'abord, et `onDismiss`
 * (iOS, après l'animation) lance le paiement ; Android n'a pas cet
 * événement et ne présente pas de la même façon : il lance aussitôt. La
 * surface du profil, derrière, montre l'attente.
 */

import { useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { PREMIUM_TEXTE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import { prixMensuel, TEXTES } from "../services/presentation";
import { MiniFil } from "./mini-fil";

interface Props {
  visible: boolean;
  soutien: Soutien;
  onFermer: () => void;
}

export function FeuilleSansPub({ visible, soutien, onFermer }: Props) {
  const couleurs = useCouleurs();
  const or = PREMIUM_TEXTE[couleurs.mode];
  const { catalogue } = soutien;
  // Le geste choisi dans la feuille, joué quand elle a disparu (iOS).
  const aLancer = useRef(false);
  // Un appui, pas deux : le bouton se grise jusqu'à la fermeture.
  const [lance, setLance] = useState(false);

  const passer = () => {
    if (lance) return;
    setLance(true);
    if (Platform.OS === "ios") {
      aLancer.current = true;
      onFermer();
    } else {
      onFermer();
      soutien.passerSansPub();
    }
  };

  const apresFermeture = () => {
    setLance(false);
    if (aLancer.current) {
      aLancer.current = false;
      soutien.passerSansPub();
    }
  };

  if (catalogue === null) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onFermer}
      onDismiss={apresFermeture}
    >
      {/* Le fond en classe sur une `Box` : la feuille native est blanche par
          défaut, et `SafeAreaView` ne porte pas de classe. */}
      <Box style={{ flex: 1 }} className="bg-background">
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <HStack className="items-center justify-end px-4 pt-3">
            <Pressable
              onPress={onFermer}
              className="h-10 w-10 items-center justify-center rounded-full bg-remplissage"
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Icone nom="fermer" couleur={couleurs.texte} taille={14} graisse="bold" />
            </Pressable>
          </HStack>

          <ScrollView
            contentContainerClassName="gap-8 px-6 pb-8 pt-2"
            showsVerticalScrollIndicator={false}
          >
            <Box className="px-3">
              <MiniFil grande />
            </Box>

            <VStack className="gap-2">
              <Texte
                accessibilityRole="header"
                className="font-display text-title-lg leading-9 tracking-tight text-foreground"
              >
                {TEXTES.sansPubTitre}
              </Texte>
              <Texte className="text-callout leading-6 text-muted-foreground">
                {TEXTES.sansPubPhrase}
              </Texte>
            </VStack>

            <VStack accessibilityRole="list">
              {TEXTES.sansPubBenefices.map((benefice, i) => (
                <HStack
                  key={benefice}
                  className={`items-center gap-3 py-3 ${i > 0 ? "border-t border-border-subtle" : ""}`}
                >
                  <Icone nom="coche" couleur={or} taille={14} graisse="bold" />
                  <Texte className="flex-1 text-body text-foreground">{benefice}</Texte>
                </HStack>
              ))}
            </VStack>

            <VStack className="gap-1">
              <Texte className="font-display text-title text-foreground">
                {prixMensuel(catalogue.sansPub.prixCentimes)}
              </Texte>
              <Texte className="text-footnote text-muted-foreground">
                {TEXTES.sansPubPromesse}
              </Texte>
            </VStack>
          </ScrollView>

          <VStack className="gap-3 px-6 pb-2 pt-3">
            <BoutonAction
              libelle={TEXTES.sansPubBouton}
              ton="principal"
              desactive={lance}
              onPress={passer}
            />
            <HStack className="items-center justify-center gap-1.5">
              <Icone nom="bouclier" couleur={couleurs.estompe} taille={12} />
              <Texte className="text-center text-caption text-foreground-faint">
                {TEXTES.stripe}
              </Texte>
            </HStack>
          </VStack>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}
