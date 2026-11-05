/**
 * « Mes CV » : les CV mis en page sans dossier — et le bouton pour en faire un.
 *
 * ═══ Ce qu'il montre ═══
 *
 * « ‹ Mon CV » en haut ; le titre et combien de CV ; les cartes, du plus
 * récent au plus ancien, une annonce native après la deuxième ; en pied,
 * **« Nouveau CV »** — la seule action en bleu, celle que Marc ne trouvait
 * pas dans l'onglet. Vide : l'invitation (deux feuilles, une phrase), et une
 * annonce dessous, au milieu de l'écran, loin du pied.
 *
 * ═══ Ce qu'il ne montre pas ═══
 *
 * Les CV adaptés à une offre (ils sont dans Candidatures), les scores, les
 * étiquettes. On vient ici retrouver un CV et l'envoyer.
 */

import { FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { MessageErreur } from "@/components/message-erreur";
import { HAUTEUR_PIED_FLOTTANT, PiedFlottant } from "@/components/pied-flottant";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { FeuillesDocuments } from "@/features/candidatures/components/feuilles-documents";
import type { NativeAd } from "@/features/publicite/api/publicite.api";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";

import { CarteExportCv } from "../components/carte-export-cv";
import { FeuilleEnvoi } from "../components/feuille-envoi";
import { useMesCv } from "../hooks/use-mes-cv";
import { TEXTES_MES_CV } from "../services/mes-cv";

function EtatVide({
  invite,
  annonce,
  onSeConnecter,
}: {
  invite: boolean;
  annonce: NativeAd | null;
  onSeConnecter: () => void;
}) {
  return (
    <VStack space="lg" className="items-center px-3 pt-12">
      <FeuillesDocuments lettre={false} taille="grande" />
      <VStack space="xs" className="items-center px-5">
        <Texte className="text-center font-display text-title-sm text-foreground">
          {TEXTES_MES_CV.videTitre}
        </Texte>
        <Texte className="text-center text-body leading-6 text-muted-foreground">
          {invite ? TEXTES_MES_CV.inviteePhrase : TEXTES_MES_CV.videPhrase}
        </Texte>
      </VStack>
      {invite ? (
        <Box className="w-full px-5 pt-2">
          <BoutonAction
            libelle={TEXTES_MES_CV.seConnecter}
            ton="secondaire"
            onPress={onSeConnecter}
          />
        </Box>
      ) : null}
      {annonce !== null ? (
        <Box className="w-full pt-4">
          <CarteAnnonce annonce={annonce} />
        </Box>
      ) : null}
    </VStack>
  );
}

export function EcranMesCv() {
  const m = useMesCv();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteRetour retour={TEXTES_MES_CV.retour} onRetour={m.retour} />
        <VStack className="px-5 pb-3 pt-1">
          <Texte
            accessibilityRole="header"
            className="font-display text-title-lg leading-9 tracking-tighter text-foreground"
          >
            {TEXTES_MES_CV.titre}
          </Texte>
          <Texte className="text-footnote text-muted-foreground">{m.sousTitre}</Texte>
        </VStack>

        {m.chargement ? (
          <Box className="flex-1 items-center justify-center pb-24">
            <ChargeurKarria />
          </Box>
        ) : m.erreur !== null && m.elements.length === 0 ? (
          <Box className="flex-1 justify-center px-5 pb-24">
            <MessageErreur
              message={m.erreur}
              action={m.recharger}
              libelleAction="Réessayer"
            />
          </Box>
        ) : (
          <FlatList
            data={m.elements}
            keyExtractor={(el) => (el.type === "cv" ? el.exporte.id : "annonce")}
            renderItem={({ item }) =>
              item.type === "cv" ? (
                <CarteExportCv
                  exporte={item.exporte}
                  modele={item.modele}
                  rang={item.rang}
                  maintenant={m.maintenant}
                  telechargement={
                    m.telechargement?.id === item.exporte.id
                      ? m.telechargement.format
                      : null
                  }
                  occupe={m.telechargement !== null}
                  envoyeA={m.envoi.fait?.id === item.exporte.id ? m.envoi.fait.a : null}
                  onOuvrir={() => m.ouvrir(item.exporte)}
                  onTelecharger={(format) => m.telecharger(item.exporte, format)}
                  onEnvoyer={() => m.ouvrirEnvoi(item.exporte)}
                  onSupprimer={() => m.supprimer(item.exporte)}
                />
              ) : (
                <CarteAnnonce annonce={item.annonce} />
              )
            }
            ListEmptyComponent={
              <EtatVide
                invite={m.invite}
                annonce={m.annonceVide}
                onSeConnecter={m.seConnecter}
              />
            }
            contentContainerClassName="gap-3 px-5 pt-1"
            contentContainerStyle={{ paddingBottom: HAUTEUR_PIED_FLOTTANT, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>

      {!m.chargement && !m.invite ? (
        <PiedFlottant>
          <BoutonAction libelle={TEXTES_MES_CV.nouveau} onPress={m.nouveau} />
        </PiedFlottant>
      ) : null}

      <FeuilleEnvoi
        visible={m.envoi.exporte !== null}
        adresseDuCompte={m.adresseDuCompte}
        documents={1}
        enCours={m.envoi.enCours}
        erreur={m.envoi.erreur}
        onEnvoyer={m.envoyer}
        onFermer={m.fermerEnvoi}
      />
    </Box>
  );
}
