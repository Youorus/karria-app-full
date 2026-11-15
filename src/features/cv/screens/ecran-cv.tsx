/**
 * Mon CV, les informations à modifier ; Mes CV, les documents prêts à envoyer.
 * La mise en page a un nom et apparaît quand un CV est disponible.
 */

import { Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Aura } from "@/components/aura";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteKarria } from "@/components/en-tete-karria";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";

import { CvRempli } from "../components/cv-rempli";
import { InvitationCv } from "../components/invitation-cv";
import { useEcranCv } from "../hooks/use-ecran-cv";

export function EcranCv() {
  const e = useEcranCv();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria
          titre="Mon CV"
          sousTitre={e.rempli ? "Tes informations" : "Importe ou crée ton CV"}
          droite={
            <Pressable
              onPress={e.ouvrirMesCv}
              accessibilityRole="button"
              accessibilityLabel="Mes CV, les documents prêts à envoyer"
              className="min-h-touch justify-center rounded-full px-3 active:opacity-70"
            >
              <Texte className="font-semibold text-body text-foreground">Mes CV</Texte>
            </Pressable>
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
        ) : e.rempli && e.cv !== null ? (
          <>
            <Box className="px-5 pb-3">
              <BoutonAction
                libelle="Mettre en page mon CV"
                multiligne
                onPress={e.mettreEnPage}
              />
            </Box>
            <CvRempli
              cv={e.cv}
              aVerifier={e.aVerifier}
              importRecent={e.importRecent}
              manquants={e.manquants}
              onModifier={e.modifier}
              onTerminerVerification={e.terminerVerification}
              annonce={e.annonce}
            />
          </>
        ) : (
          <InvitationCv
            chapitreAReprendre={e.chapitreAReprendre}
            onCreer={e.creer}
            onImporter={e.importer}
          />
        )}
      </SafeAreaView>
    </Box>
  );
}
