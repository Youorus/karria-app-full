/**
 * L'onglet Candidatures : l'espace où l'on retrouve ce qu'on a généré
 * face à chaque offre, et où l'on sait si l'on a candidaté.
 *
 * ═══ Ce qu'il montre ═══
 *
 * L'en-tête des onglets (« Candidatures », et combien de dossiers), les
 * deux segments, puis les pochettes — une par offre — du plus récemment
 * généré au plus ancien, avec une annonce native après la troisième.
 * Vide, il invite : « Depuis une offre, touche “Adapter mon CV” ».
 *
 * ═══ Ce qu'il ne montre pas ═══
 *
 * Aucune statistique, aucun graphique, aucune étiquette. L'état d'un
 * dossier est une phrase ; la suppression est un glissement. L'écran
 * reste calme : c'est un endroit où l'on revient, pas un tableau de bord.
 */

import { FlatList, RefreshControl } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { ECART_BAS_BARRE, HAUTEUR_BARRE } from "@/components/barre-onglets";
import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteKarria } from "@/components/en-tete-karria";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteDossier } from "../components/carte-dossier";
import { FeuillesDocuments } from "../components/feuilles-documents";
import { Segments } from "../components/segments";
import { useDossiers, type ElementDeListe } from "../hooks/use-dossiers";
import { TEXTES } from "../services/presentation";

function EtatVide({
  candidatees,
  invite,
  onSeConnecter,
}: {
  candidatees: boolean;
  invite: boolean;
  onSeConnecter: () => void;
}) {
  return (
    <VStack space="lg" className="items-center px-8 pb-24 pt-16">
      <FeuillesDocuments lettre={!candidatees} taille="grande" />
      <VStack space="xs" className="items-center">
        <Texte className="text-center font-display text-title-sm text-foreground">
          {candidatees ? TEXTES.videCandidatees : TEXTES.videTitre}
        </Texte>
        <Texte className="text-center text-body leading-6 text-muted-foreground">
          {invite
            ? "Connecte-toi pour retrouver tes dossiers : chaque CV adapté et chaque lettre restent rangés avec leur offre."
            : candidatees
              ? TEXTES.videCandidateesPhrase
              : TEXTES.videPhrase}
        </Texte>
      </VStack>
      {invite ? (
        <Box className="w-full pt-2">
          <BoutonAction libelle="Se connecter" ton="secondaire" onPress={onSeConnecter} />
        </Box>
      ) : null}
    </VStack>
  );
}

export function EcranCandidatures() {
  const couleurs = useCouleurs();
  const { bottom } = useSafeAreaInsets();
  const {
    invite,
    elements,
    sousTitre,
    segment,
    effectifs,
    changerDeSegment,
    chargement,
    actualisation,
    erreur,
    note,
    maintenant,
    actualiser,
    ouvrir,
    supprimer,
    seConnecter,
  } = useDossiers();

  const basListe = Math.max(bottom, 8) + ECART_BAS_BARRE + HAUTEUR_BARRE + 24;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria titre={TEXTES.titre} sousTitre={sousTitre} />

        {note !== null ? (
          <Animated.View
            entering={FadeIn.duration(250).reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.duration(250).reduceMotion(ReduceMotion.System)}
          >
            <Box className="mx-5 mb-2 rounded-etiquette bg-surface-success px-4 py-3">
              <Texte className="text-footnote text-foreground" accessibilityRole="alert">
                {note}
              </Texte>
            </Box>
          </Animated.View>
        ) : null}

        {!invite && effectifs.toutes > 0 ? (
          <Box className="px-5 pb-2 pt-1">
            <Segments
              segment={segment}
              effectifs={effectifs}
              onChanger={changerDeSegment}
            />
          </Box>
        ) : null}

        {chargement ? (
          <Box className="flex-1 items-center justify-center pb-24">
            <ChargeurKarria />
          </Box>
        ) : (
          <FlatList<ElementDeListe>
            data={elements}
            keyExtractor={(el) => (el.type === "dossier" ? el.carte.id : "annonce")}
            renderItem={({ item }) =>
              item.type === "dossier" ? (
                <CarteDossier
                  carte={item.carte}
                  rang={item.rang}
                  maintenant={maintenant}
                  onOuvrir={() => ouvrir(item.carte)}
                  onSupprimer={() => supprimer(item.carte)}
                />
              ) : (
                <CarteAnnonce annonce={item.annonce} />
              )
            }
            ListHeaderComponent={
              erreur !== null ? (
                <MessageErreur
                  message={erreur}
                  action={actualiser}
                  libelleAction="Réessayer"
                />
              ) : null
            }
            ListEmptyComponent={
              erreur === null ? (
                <EtatVide
                  candidatees={segment === "candidatees"}
                  invite={invite}
                  onSeConnecter={seConnecter}
                />
              ) : null
            }
            contentContainerClassName="gap-3 px-5 pt-2"
            contentContainerStyle={{ paddingBottom: basListe, flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              invite ? undefined : (
                <RefreshControl
                  refreshing={actualisation}
                  onRefresh={actualiser}
                  tintColor={couleurs.primaire}
                />
              )
            }
          />
        )}
      </SafeAreaView>
    </Box>
  );
}
