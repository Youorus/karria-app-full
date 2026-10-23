/**
 * Le fil — l'onglet « Offres » de la V1, dans le décor de la refonte.
 *
 * ═══ Ce qui est gardé de la V1 ═══
 *
 * L'en-tête « Pour toi » et son sous-titre en capitales, le bouton des
 * filtres et son point rouge, les cartes, le repli des offres « à
 * explorer », les squelettes de chargement, « tirer pour actualiser », la
 * pagination, et le bouton ✦ au-dessus de la barre d'onglets.
 *
 * ═══ Ce que la refonte y ajoute ═══
 *
 * L'aura derrière le fil, et l'agent : le ✦ ne pousse pas un écran de chat
 * comme la V1 — il balaie le fil pour faire apparaître Karria
 * (`RideauAgent`), et le fil revient exactement où on l'avait laissé —
 * rechargé si Karria a cherché entre-temps, avec la recherche en badge
 * sous le titre.
 *
 * Les cartes qui passent à l'écran sont signalées au hook (`viewability`
 * de la liste) : c'est ce qui fait tomber « Nouvelle ».
 */

import { useRef } from "react";
import { FlatList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { ECART_BAS_BARRE, HAUTEUR_BARRE } from "@/components/barre-onglets";
import { BoutonEnTeteRond, EnTeteKarria } from "@/components/en-tete-karria";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { RideauAgent } from "@/features/assistant/components/rideau-agent";
import { useCouleurs } from "@/theme/use-couleurs";

import { BoutonKarria } from "../components/bouton-karria";
import { CarteOffre } from "../components/carte-offre";
import { FeuilleFiltres } from "../components/feuille-filtres";
import { SqueletteFil } from "../components/squelette-fil";
import { useEcranOffres, type ElementDuFil } from "../hooks/use-ecran-offres";

export function EcranOffres() {
  const couleurs = useCouleurs();
  const { bottom } = useSafeAreaInsets();
  // Une référence de vue, pas un état : elle sert seulement à remonter.
  const liste = useRef<FlatList<ElementDuFil>>(null);
  const {
    elements,
    maintenant,
    sousTitre,
    badgeRecherche,
    mode,
    chargement,
    actualisation,
    chargementSuite,
    erreur,
    filtres,
    options,
    filtresActifs,
    actualiser,
    chargerLaSuite,
    appliquerFiltres,
    garder,
    feuilleFiltres,
    ouvrirFiltres,
    fermerFiltres,
    agentOuvert,
    ouvrirAgent,
    fermerAgent,
    surRecherche,
    defile,
    signalerDefilement,
    visibilite,
    ouvrirOffre,
    voirLesAutres,
  } = useEcranOffres();

  const basBouton = Math.max(bottom, 8) + ECART_BAS_BARRE + HAUTEUR_BARRE + 16;

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <RideauAgent ouvert={agentOuvert} onFermer={fermerAgent} onRecherche={surRecherche}>
        <Box style={{ flex: 1 }} className="bg-background">
          <Aura />
          <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            <EnTeteKarria
              titre="Pour toi"
              sousTitre={sousTitre}
              badge={badgeRecherche}
              droite={
                <BoutonEnTeteRond
                  onPress={ouvrirFiltres}
                  libelle={
                    filtresActifs > 0
                      ? `Filtres, ${filtresActifs} actifs`
                      : "Filtrer les offres"
                  }
                  point={filtresActifs > 0}
                >
                  <Icone
                    nom="filtres"
                    couleur={filtresActifs > 0 ? couleurs.primaire : couleurs.texte}
                    taille={20}
                    graisse="medium"
                  />
                </BoutonEnTeteRond>
              }
            />

            {chargement ? (
              <Box className="px-5 pt-3">
                <SqueletteFil />
              </Box>
            ) : (
              <FlatList
                ref={liste}
                data={elements}
                keyExtractor={(el, i) =>
                  el.type === "offre" ? String(el.offre.id) : `${el.type}-${i}`
                }
                renderItem={({ item }) =>
                  item.type === "offre" ? (
                    <CarteOffre
                      offre={item.offre}
                      rang={item.rang}
                      maintenant={maintenant}
                      onOuvrir={() => ouvrirOffre(item.offre)}
                      onGarder={() => garder(item.offre)}
                    />
                  ) : item.type === "plus" ? (
                    <Pressable
                      onPress={voirLesAutres}
                      className="min-h-[52px] items-center justify-center rounded-tuile border-[1.5px] border-border-champ"
                      accessibilityRole="button"
                    >
                      <Texte className="font-bold text-body text-primary">
                        Voir {item.nombre} offre{item.nombre > 1 ? "s" : ""}{" "}
                        supplémentaire
                        {item.nombre > 1 ? "s" : ""}
                      </Texte>
                    </Pressable>
                  ) : (
                    <HStack space="md" className="items-center pt-2">
                      <Box className="h-px flex-1 bg-border-subtle" />
                      <Texte className="font-bold text-caption uppercase tracking-widest text-foreground-faint">
                        Autres opportunités
                      </Texte>
                      <Box className="h-px flex-1 bg-border-subtle" />
                    </HStack>
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
                    <VStack space="sm" className="items-center px-6 py-16">
                      <Texte className="font-bold text-title-sm tracking-tight text-foreground">
                        Aucune offre pour le moment
                      </Texte>
                      <Texte className="text-center text-body text-muted-foreground">
                        {mode === "recherche"
                          ? "Ajuste tes filtres, ou demande à Karria d'élargir ta recherche."
                          : "Ajuste tes filtres, ou dis à Karria ce que tu cherches."}
                      </Texte>
                    </VStack>
                  ) : null
                }
                ListFooterComponent={chargementSuite ? <SqueletteFil cartes={1} /> : null}
                onEndReached={chargerLaSuite}
                onEndReachedThreshold={0.5}
                viewabilityConfigCallbackPairs={visibilite}
                onScroll={(e) => signalerDefilement(e.nativeEvent.contentOffset.y)}
                scrollEventThrottle={64}
                contentContainerClassName="gap-3 px-5 pt-3"
                contentContainerStyle={{ paddingBottom: basBouton + 60 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={actualisation}
                    onRefresh={actualiser}
                    tintColor={couleurs.primaire}
                  />
                }
              />
            )}
          </SafeAreaView>

          {/* Le ✦ : à droite, 16 pt au-dessus de la barre d'onglets. */}
          <Box className="absolute right-5" style={{ bottom: basBouton }}>
            <BoutonKarria
              defile={defile}
              onOuvrirKarria={ouvrirAgent}
              onRemonter={() =>
                liste.current?.scrollToOffset({ offset: 0, animated: true })
              }
            />
          </Box>
        </Box>
      </RideauAgent>

      <FeuilleFiltres
        visible={feuilleFiltres}
        filtres={filtres}
        options={options}
        actifs={filtresActifs}
        onFermer={fermerFiltres}
        onChanger={appliquerFiltres}
      />
    </Box>
  );
}
