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
 * rechargé si Karria a cherché entre-temps, avec le sélecteur « Ma
 * recherche / Toutes les offres » sous l'en-tête, et le tri rapide
 * (« Pertinence · Plus récentes · Plus proches ») juste dessous.
 *
 * Les cartes qui passent à l'écran sont signalées au hook (`viewability`
 * de la liste) : c'est ce qui fait tomber « Nouvelle ».
 */

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ECART_BAS_BARRE, HAUTEUR_BARRE } from "@/components/barre-onglets";
import { BoutonEnTeteRond, EnTeteKarria } from "@/components/en-tete-karria";
import { Icone } from "@/components/icone";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { RideauAgent } from "@/features/assistant/components/rideau-agent";
import { CarteAnnonce } from "@/features/publicite/components/carte-annonce";
import { useCouleurs } from "@/theme/use-couleurs";

import { AuraDuFil, type PiloteAura } from "../components/aura-du-fil";
import { BoutonKarria } from "../components/bouton-karria";
import { CarteOffre } from "../components/carte-offre";
import { FeuilleFiltres } from "../components/feuille-filtres";
import { RangeeTri } from "../components/rangee-tri";
import { SelecteurVue } from "../components/selecteur-vue";
import { SqueletteFil } from "../components/squelette-fil";
import { useEcranOffres, type ElementDuFil } from "../hooks/use-ecran-offres";

const LISTE_VIDE: ElementDuFil[] = [];

function cleElement(el: ElementDuFil): string {
  if (el.type === "offre") return String(el.offre.id);
  if (el.type === "annonce") return `annonce-${el.emplacement}`;
  return el.type;
}

export function EcranOffres() {
  const couleurs = useCouleurs();
  const { bottom } = useSafeAreaInsets();
  // Une référence de vue, pas un état : elle sert seulement à remonter.
  const liste = useRef<FlatList<ElementDuFil>>(null);
  // L'aura se pilote par une référence : suspendre ou reprendre son
  // mouvement ne redessine pas l'écran pendant le défilement (`aura-du-fil`).
  const aura = useRef<PiloteAura>(null);
  const suspendreAura = useCallback(() => aura.current?.suspendre(), []);
  const relacherLeFil = useCallback(() => aura.current?.relacher(), []);
  const reprendreAura = useCallback(() => aura.current?.reprendre(), []);
  const {
    elements,
    maintenant,
    sousTitre,
    selecteur,
    rangeeTri,
    mode,
    chargement,
    actualisation,
    chargementSuite,
    erreur,
    filtres,
    options,
    filtresActifs,
    invite,
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

  const surDefilement = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) =>
      signalerDefilement(e.nativeEvent.contentOffset.y),
    [signalerDefilement],
  );
  const triAffiche = rangeeTri?.actif;
  useEffect(() => {
    liste.current?.scrollToOffset({ offset: 0, animated: false });
    signalerDefilement(0);
  }, [filtres, mode, triAffiche, signalerDefilement]);

  const rendreElement = useCallback<ListRenderItem<ElementDuFil>>(
    ({ item }) =>
      item.type === "offre" ? (
        <CarteOffre
          offre={item.offre}
          rang={item.rang}
          distance={item.distance}
          maintenant={maintenant}
          onOuvrir={ouvrirOffre}
          onGarder={garder}
        />
      ) : item.type === "annonce" ? (
        <CarteAnnonce annonce={item.annonce} />
      ) : item.type === "plus" ? (
        <Pressable
          onPress={voirLesAutres}
          className="min-h-[52px] items-center justify-center rounded-tuile border-[1.5px] border-border-champ"
          accessibilityRole="button"
        >
          <Texte className="font-bold text-body text-primary">
            Voir {item.nombre} offre{item.nombre > 1 ? "s" : ""} supplémentaire
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
      ),
    [garder, maintenant, ouvrirOffre, voirLesAutres],
  );

  // Des paramètres stables pour la liste : un nouvel objet à chaque rendu
  // de l'écran (seuil de défilement franchi, agent ouvert…) la ferait
  // recalculer toutes ses cellules.
  const styleContenu = useMemo(() => ({ paddingBottom: basBouton + 60 }), [basBouton]);
  const actualisationDuFil = useMemo(
    () => (
      <RefreshControl
        refreshing={actualisation}
        onRefresh={actualiser}
        tintColor={couleurs.primaire}
      />
    ),
    [actualisation, actualiser, couleurs.primaire],
  );
  const entete = useMemo(
    () =>
      erreur !== null ? (
        <MessageErreur message={erreur} action={actualiser} libelleAction="Réessayer" />
      ) : null,
    [erreur, actualiser],
  );
  const vide = useMemo(
    () =>
      chargement ? (
        <SqueletteFil />
      ) : erreur === null ? (
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
      ) : null,
    [chargement, erreur, mode],
  );
  const pied = useMemo(
    () => (chargementSuite ? <SqueletteFil cartes={1} /> : null),
    [chargementSuite],
  );

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <RideauAgent ouvert={agentOuvert} onFermer={fermerAgent} onRecherche={surRecherche}>
        <Box style={{ flex: 1 }} className="bg-background">
          <AuraDuFil ref={aura} visible={!agentOuvert} />
          <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            <EnTeteKarria
              titre="Pour toi"
              sousTitre={sousTitre}
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
            {selecteur !== null || rangeeTri !== null ? (
              <VStack space="xs" className="px-5 pb-1 pt-1">
                {selecteur !== null ? <SelecteurVue {...selecteur} /> : null}
                {rangeeTri !== null ? <RangeeTri {...rangeeTri} /> : null}
              </VStack>
            ) : null}

            <FlatList
              ref={liste}
              data={chargement ? LISTE_VIDE : elements}
              keyExtractor={cleElement}
              renderItem={rendreElement}
              // Peu de cartes préparées à la fois : un changement de filtre,
              // de tri ou d'onglet ne monte plus une vingtaine de cartes d'un
              // coup, et la liste en garde moins en mémoire en défilant.
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              updateCellsBatchingPeriod={50}
              windowSize={9}
              removeClippedSubviews={Platform.OS === "android"}
              ListHeaderComponent={entete}
              ListEmptyComponent={vide}
              ListFooterComponent={pied}
              onEndReached={chargerLaSuite}
              onEndReachedThreshold={0.5}
              viewabilityConfigCallbackPairs={visibilite}
              onScrollBeginDrag={suspendreAura}
              onScrollEndDrag={relacherLeFil}
              onMomentumScrollBegin={suspendreAura}
              onMomentumScrollEnd={reprendreAura}
              onScroll={surDefilement}
              scrollEventThrottle={64}
              contentContainerClassName="gap-3 px-5 pt-3"
              contentContainerStyle={styleContenu}
              showsVerticalScrollIndicator={false}
              refreshControl={actualisationDuFil}
            />
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
        invite={invite}
        filtres={filtres}
        options={options}
        actifs={filtresActifs}
        onFermer={fermerFiltres}
        onChanger={appliquerFiltres}
      />
    </Box>
  );
}
