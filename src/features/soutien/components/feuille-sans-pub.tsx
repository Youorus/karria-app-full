/** Choisit la formule, puis attend la fermeture native iOS avant d’ouvrir Stripe. */

import { useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { BORDS_FEUILLE_NATIVE } from "@/lib/feuille-native";
import { PREMIUM_TEXTE, SUR_PREMIUM } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import {
  annuelParMois,
  libelleAbonnementFormule,
  moisOfferts,
  prixAnnuel,
  prixMensuel,
  TEXTES,
} from "../services/presentation";
import type { Formule } from "../types/soutien.types";

/** Une formule à cocher : titre, pastille éventuelle, prix et prix ramené. */
function CarteFormule({
  choisie,
  onPress,
  titre,
  pastille,
  prix,
  detail,
}: {
  choisie: boolean;
  onPress: () => void;
  titre: string;
  pastille: string | null;
  prix: string;
  detail: string;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-carte px-4 py-4 ${
        choisie
          ? "border-2 border-premium bg-surface-premium"
          : "border-[1.5px] border-border-champ bg-card"
      }`}
      accessibilityRole="radio"
      accessibilityState={{ checked: choisie, selected: choisie }}
      accessibilityLabel={`${titre}${pastille ? `, ${pastille}` : ""}, ${prix}, ${detail}`}
    >
      <Box
        className={`h-6 w-6 items-center justify-center rounded-full ${
          choisie ? "bg-premium" : "border-[1.5px] border-border-champ"
        }`}
      >
        {choisie ? (
          <Icone
            nom="coche"
            couleur={SUR_PREMIUM[couleurs.mode]}
            taille={11}
            graisse="bold"
          />
        ) : null}
      </Box>
      <VStack className="flex-1 gap-1">
        <HStack className="flex-wrap items-center gap-2">
          <Texte className="font-bold text-body text-foreground">{titre}</Texte>
          {pastille !== null ? (
            <Box className="rounded-full bg-premium px-2 py-0.5">
              <Texte className="font-bold text-caption text-premium-foreground">
                {pastille}
              </Texte>
            </Box>
          ) : null}
        </HStack>
        <Texte className="text-caption text-muted-foreground">{detail}</Texte>
      </VStack>
      <Texte className="font-display text-title-sm text-foreground">{prix}</Texte>
    </Pressable>
  );
}

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
  const aLancer = useRef<Formule | null>(null);
  // Un appui, pas deux : le bouton se grise jusqu'à la fermeture.
  const [lance, setLance] = useState(false);
  const [formule, setFormule] = useState<Formule>("mensuel");
  const formuleEffective: Formule =
    catalogue?.sansPubAnnuel == null ? "mensuel" : formule;

  const passer = () => {
    if (aLancer.current !== null) return;
    if (Platform.OS === "ios") {
      aLancer.current = formuleEffective;
      setLance(true);
      onFermer();
    } else {
      onFermer();
      soutien.passerSansPub(formuleEffective);
    }
  };

  const apresFermeture = () => {
    setLance(false);
    const choisie = aLancer.current;
    aLancer.current = null;
    if (choisie !== null) soutien.passerSansPub(choisie);
  };

  if (catalogue === null) return null;
  const mensuel = catalogue.sansPub.prixCentimes;
  const annuel = catalogue.sansPubAnnuel?.prixCentimes ?? null;

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
        <SafeAreaView style={{ flex: 1 }} edges={BORDS_FEUILLE_NATIVE}>
          <HStack className="items-center justify-end px-4 pt-3">
            <Pressable
              onPress={onFermer}
              className="h-touch w-touch items-center justify-center rounded-full bg-remplissage"
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Icone nom="fermer" couleur={couleurs.texte} taille={14} graisse="bold" />
            </Pressable>
          </HStack>

          <ScrollView
            contentContainerClassName="gap-5 px-6 pb-6 pt-2"
            showsVerticalScrollIndicator={false}
          >
            <VStack className="gap-3 rounded-carte border border-border-premium bg-surface-premium p-5">
              <Box className="h-10 w-10 items-center justify-center rounded-full bg-card">
                <Icone nom="couronne" couleur={or} taille={19} />
              </Box>
              <Texte
                accessibilityRole="header"
                className="font-display text-title leading-8 text-foreground"
              >
                {TEXTES.sansPubEtiquette}
              </Texte>
              <HStack className="items-center gap-2">
                <Icone nom="coche" couleur={or} taille={16} />
                <Texte className="flex-1 text-body text-foreground">
                  Aucune annonce dans ton fil
                </Texte>
              </HStack>
              <HStack className="items-center gap-2">
                <Icone nom="etincelles" couleur={or} taille={16} />
                <Texte className="flex-1 text-body text-foreground">
                  Karria sans limite*
                </Texte>
              </HStack>
              <HStack className="items-center gap-2">
                <Icone nom="coeur" couleur={or} taille={16} />
                <Texte className="flex-1 text-body text-foreground">
                  Soutien direct à l’équipe Karria
                </Texte>
              </HStack>
              <Texte className="text-footnote text-muted-foreground">
                {TEXTES.sansPubUsageRaisonnable}
              </Texte>
            </VStack>

            <VStack className="gap-3" accessibilityRole="radiogroup">
              <CarteFormule
                choisie={formuleEffective === "mensuel"}
                onPress={() => setFormule("mensuel")}
                titre={TEXTES.sansPubFormule}
                pastille={null}
                prix={prixMensuel(mensuel)}
                detail="Facturé chaque mois"
              />
              {annuel !== null ? (
                <CarteFormule
                  choisie={formuleEffective === "annuel"}
                  onPress={() => setFormule("annuel")}
                  titre={TEXTES.formuleAnnuel}
                  pastille={moisOfferts(mensuel, annuel)}
                  prix={prixAnnuel(annuel)}
                  detail={annuelParMois(annuel)}
                />
              ) : null}
            </VStack>
          </ScrollView>

          <VStack className="gap-2 border-t border-border-subtle px-6 pb-2 pt-4">
            <BoutonAction
              libelle={libelleAbonnementFormule(formuleEffective, mensuel, annuel)}
              ton="premium"
              desactive={lance}
              onPress={passer}
            />
            <Pressable
              onPress={onFermer}
              className="min-h-touch items-center justify-center"
              accessibilityRole="button"
              accessibilityLabel={TEXTES.pasMaintenant}
            >
              <Texte className="font-bold text-footnote text-muted-foreground">
                {TEXTES.pasMaintenant}
              </Texte>
            </Pressable>
            <Texte className="px-2 text-center text-caption leading-4 text-muted-foreground">
              {formuleEffective === "annuel"
                ? "Renouvelé chaque année."
                : "Renouvelé chaque mois."}{" "}
              Résiliable depuis ton profil à tout moment. Paiement sécurisé par Stripe.
            </Texte>
          </VStack>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}
