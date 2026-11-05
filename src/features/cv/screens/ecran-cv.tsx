/**
 * L'onglet CV — « Mon CV » de la V1.
 *
 * Trois états, pas plus : on charge (le K de Karria qui respire), il n'y
 * a pas encore de CV (l'invitation à l'importer, ou à le créer), ou il y
 * en a un (l'écran CV, qui se modifie). Le sous-titre est celui de la V1
 * dans chaque cas.
 *
 * À droite de l'en-tête, dans tous les états, deux gestes (demande de Marc,
 * 2026-11-05) : **« + »**, un disque en bleu d'action — le bouton « nouveau »
 * que toute application a, et qu'on comprend sans le lire : avec un CV, il
 * ouvre l'atelier libre (choisir un modèle, mettre en page, exporter) ;
 * sans CV, il le crée d'abord. À sa gauche, en texte, **« Mes CV »** : les
 * CV déjà mis en page. Pas de badge, pas de menu : un verbe et un endroit.
 */

import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { BoutonEnTeteRond, EnTeteKarria } from "@/components/en-tete-karria";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { CvRempli } from "../components/cv-rempli";
import { InvitationCv } from "../components/invitation-cv";
import { useEcranCv } from "../hooks/use-ecran-cv";

export function EcranCv() {
  const couleurs = useCouleurs();
  const e = useEcranCv();
  const rempli = e.cv !== null && !e.cv.vide;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria
          titre="Mon CV"
          sousTitre={rempli ? "Karria génère votre CV" : "Importez, améliorez, générez"}
          droite={
            <HStack space="sm" className="items-center">
              <Pressable
                onPress={e.ouvrirMesCv}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Mes CV, les CV déjà mis en page"
                className="h-10 justify-center rounded-full px-3 active:opacity-70"
              >
                <Texte className="font-semibold text-footnote text-primary">Mes CV</Texte>
              </Pressable>
              <BoutonEnTeteRond onPress={e.nouveauCv} libelle="Nouveau CV" plein>
                <Icone
                  nom="ajouter"
                  couleur={couleurs.surPrimaire}
                  taille={20}
                  graisse="semibold"
                />
              </BoutonEnTeteRond>
            </HStack>
          }
        />
        {e.chargement ? (
          <Box className="flex-1 items-center justify-center pb-24">
            <ChargeurKarria />
          </Box>
        ) : e.erreur !== null && e.cv === null ? (
          <Box className="flex-1 justify-center px-5 pb-24">
            <MessageErreur
              message={e.erreur}
              action={e.recharger}
              libelleAction="Réessayer"
            />
          </Box>
        ) : rempli && e.cv !== null ? (
          <CvRempli
            cv={e.cv}
            aVerifier={e.aVerifier}
            importRecent={e.importRecent}
            manquants={e.manquants}
            onModifier={e.modifier}
            onTerminerVerification={e.terminerVerification}
            annonce={e.annonce}
          />
        ) : (
          <InvitationCv
            reprendre={e.brouillonEnCours}
            onCreer={e.creer}
            onImporter={e.importer}
          />
        )}
      </SafeAreaView>
    </Box>
  );
}
