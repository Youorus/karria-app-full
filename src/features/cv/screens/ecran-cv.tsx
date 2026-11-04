/**
 * L'onglet CV — « Mon CV » de la V1.
 *
 * Trois états, pas plus : on charge (le K de Karria qui respire), il n'y
 * a pas encore de CV (l'invitation à l'importer, ou à le créer), ou il y
 * en a un (l'écran CV, qui se modifie). Le sous-titre est celui de la V1
 * dans chaque cas.
 */

import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteKarria } from "@/components/en-tete-karria";
import { MessageErreur } from "@/components/message-erreur";
import { Box } from "@/components/ui/box";

import { CvRempli } from "../components/cv-rempli";
import { InvitationCv } from "../components/invitation-cv";
import { useEcranCv } from "../hooks/use-ecran-cv";

export function EcranCv() {
  const e = useEcranCv();
  const rempli = e.cv !== null && !e.cv.vide;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria
          titre="Mon CV"
          sousTitre={rempli ? "Karria génère votre CV" : "Importez, améliorez, générez"}
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
