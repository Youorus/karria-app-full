/**
 * L'onglet CV — « Mon CV » de la V1.
 *
 * Trois états, pas plus : on charge (le K de Karria qui respire), il n'y
 * a pas encore de CV (l'invitation à le créer en parlant), ou il y en a
 * un (l'écran CV de la V1). Le sous-titre est celui de la V1 dans chaque
 * cas.
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
  const { cv, brouillonEnCours, chargement, erreur, creer, recharger } = useEcranCv();
  const rempli = cv !== null && !cv.vide;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria
          titre="Mon CV"
          sousTitre={rempli ? "Karria génère votre CV" : "Importez, améliorez, générez"}
        />
        {chargement ? (
          <Box className="flex-1 items-center justify-center pb-24">
            <ChargeurKarria />
          </Box>
        ) : erreur !== null && cv === null ? (
          <Box className="flex-1 justify-center px-5 pb-24">
            <MessageErreur
              message={erreur}
              action={recharger}
              libelleAction="Réessayer"
            />
          </Box>
        ) : rempli ? (
          <CvRempli cv={cv} />
        ) : (
          <InvitationCv reprendre={brouillonEnCours} onCreer={creer} />
        )}
      </SafeAreaView>
    </Box>
  );
}
