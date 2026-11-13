/**
 * La feuille « Karria sans pub » : l'offre, en plein format.
 *
 * ═══ Ce qu'on attend d'un bon écran d'abonnement ═══
 *
 * Refonte du 2026-11-13, sur le modèle des écrans d'abonnement qui
 * convertissent le mieux, lus de haut en bas sans effort :
 *
 * 1. **La démonstration** : le mini-fil en grand, sur l'or, où l'annonce
 *    pâlit et se barre sous les yeux à l'ouverture ;
 * 2. **la promesse** : un titre-bénéfice, une phrase qui rassure (« tu
 *    gardes tout ») ;
 * 3. **le comparatif** Gratuit / Sans pub : il montre qu'on ne perd rien
 *    en restant gratuit, et exactement ce que l'on gagne ;
 * 4. **la formule**, cochée, prix en grand et ramené au jour ;
 * 5. **trois garanties** courtes, puis, en pied fixe, **un seul** bouton
 *    d'or qui dit le prix, « Pas maintenant », et les mentions.
 *
 * Ce qu'on s'interdit, parce que ça se retourne contre la confiance : un
 * faux compte à rebours, une fausse réduction, un chiffre d'utilisateurs
 * inventé, une croix de fermeture cachée.
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
  prixParJour,
  TEXTES,
} from "../services/presentation";
import type { Formule } from "../types/soutien.types";
import { MiniFil } from "./mini-fil";

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
  const aLancer = useRef(false);
  // Un appui, pas deux : le bouton se grise jusqu'à la fermeture.
  const [lance, setLance] = useState(false);
  // L'annuel d'office quand il existe : l'ancre qui rend le mensuel lisible.
  const [formule, setFormule] = useState<Formule>("annuel");
  const formuleEffective: Formule =
    catalogue?.sansPubAnnuel == null ? "mensuel" : formule;

  const passer = () => {
    if (lance) return;
    setLance(true);
    if (Platform.OS === "ios") {
      aLancer.current = true;
      onFermer();
    } else {
      onFermer();
      soutien.passerSansPub(formuleEffective);
    }
  };

  const apresFermeture = () => {
    setLance(false);
    if (aLancer.current) {
      aLancer.current = false;
      soutien.passerSansPub(formuleEffective);
    }
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
              className="h-10 w-10 items-center justify-center rounded-full bg-remplissage"
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Icone nom="fermer" couleur={couleurs.texte} taille={14} graisse="bold" />
            </Pressable>
          </HStack>

          <ScrollView
            contentContainerClassName="gap-7 px-6 pb-8 pt-2"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. La démonstration */}
            <VStack className="gap-4 rounded-carte border border-border-premium bg-surface-premium px-5 pb-6 pt-5">
              <HStack className="items-center gap-1.5 self-center rounded-full bg-card px-3 py-1">
                <Icone nom="couronne" couleur={or} taille={12} graisse="bold" />
                <Texte className="text-caption font-bold uppercase tracking-wide text-premium-texte">
                  {TEXTES.sansPubEtiquette}
                </Texte>
              </HStack>
              <MiniFil grande anime={visible} />
            </VStack>

            {/* 2. La promesse */}
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

            {/* 3. Le comparatif */}
            <VStack className="rounded-carte border border-border-subtle bg-card">
              <HStack className="items-center px-4 pb-2 pt-3">
                <Box className="flex-1" />
                <Texte className="w-16 text-center text-caption font-bold text-muted-foreground">
                  {TEXTES.comparatifColonnes.gratuit}
                </Texte>
                <Texte className="w-16 text-center text-caption font-bold text-premium-texte">
                  {TEXTES.comparatifColonnes.sansPub}
                </Texte>
              </HStack>
              {TEXTES.comparatif.map((ligne) => (
                <HStack
                  key={ligne.libelle}
                  className="items-center border-t border-border-subtle px-4 py-3"
                  accessible
                  accessibilityLabel={`${ligne.libelle} : ${
                    ligne.gratuit ? "inclus dans les deux" : "seulement sans pub"
                  }`}
                >
                  <Texte className="flex-1 pr-2 text-footnote leading-5 text-foreground">
                    {ligne.libelle}
                  </Texte>
                  <Box className="w-16 items-center">
                    {ligne.gratuit ? (
                      <Icone
                        nom="coche"
                        couleur={couleurs.estompe}
                        taille={13}
                        graisse="bold"
                      />
                    ) : (
                      <Box className="h-0.5 w-3 rounded-full bg-track" />
                    )}
                  </Box>
                  <Box className="w-16 items-center">
                    <Box className="h-6 w-6 items-center justify-center rounded-full bg-premium">
                      <Icone
                        nom="coche"
                        couleur={SUR_PREMIUM[couleurs.mode]}
                        taille={11}
                        graisse="bold"
                      />
                    </Box>
                  </Box>
                </HStack>
              ))}
            </VStack>

            {/* 4. La formule : l'annuel en tête, coché d'office, quand il existe */}
            <VStack className="gap-3" accessibilityRole="radiogroup">
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
              <CarteFormule
                choisie={formuleEffective === "mensuel"}
                onPress={() => setFormule("mensuel")}
                titre={TEXTES.sansPubFormule}
                pastille={null}
                prix={prixMensuel(mensuel)}
                detail={prixParJour(mensuel)}
              />
              <Texte className="text-center text-caption text-muted-foreground">
                {TEXTES.sansPubPromesse}
              </Texte>
            </VStack>

            {/* 5. Les garanties */}
            <HStack className="justify-between gap-2">
              {TEXTES.garanties.map((garantie, i) => (
                <VStack key={garantie} className="flex-1 items-center gap-1.5">
                  <Icone
                    nom={(["calendrier", "eclair", "cadenas"] as const)[i] ?? "coche"}
                    couleur={or}
                    taille={18}
                  />
                  <Texte className="text-center text-caption leading-4 text-muted-foreground">
                    {garantie}
                  </Texte>
                </VStack>
              ))}
            </HStack>
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
            <Texte className="px-2 text-center text-caption leading-4 text-foreground-faint">
              {TEXTES.sansPubMentions}
            </Texte>
          </VStack>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}
