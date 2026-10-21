/**
 * La galerie des modèles — l'onglet « Modèles » de la V1.
 *
 * ═══ Ce qui est gardé de la V1 ═══
 *
 * L'en-tête « Modèles » et « N modèles — les tiens sont cochés ✓ », les
 * puces de filtre, la grille de deux colonnes (écart 12), les cartes, les
 * squelettes de chargement, « tirer pour actualiser » et le compte en pied.
 *
 * ═══ Ce que la refonte y ajoute ═══
 *
 * L'aura derrière la grille, et le zoom natif d'iOS 18 de la carte vers
 * le détail.
 */

import { FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { EnTeteKarria } from "@/components/en-tete-karria";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteModele } from "../components/carte-modele";
import { PucesGalerie } from "../components/puces-galerie";
import { SqueletteGalerie } from "../components/squelette-galerie";
import { useGalerie } from "../hooks/use-galerie";

export function EcranGalerie() {
  const couleurs = useCouleurs();
  const {
    modeles,
    largeurCarte: largeur,
    possedes,
    puces,
    choisirFiltre,
    sousTitre,
    total,
    chargement,
    actualisation,
    erreur,
    actualiser,
  } = useGalerie();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria titre="Modèles" sousTitre={sousTitre} />
        {puces.length > 1 ? (
          <PucesGalerie puces={puces} onChoisir={choisirFiltre} />
        ) : null}

        {chargement ? (
          <Box className="px-4 pt-2">
            <SqueletteGalerie largeur={largeur} />
          </Box>
        ) : (
          <FlatList
            data={modeles}
            numColumns={2}
            keyExtractor={(m) => String(m.id)}
            renderItem={({ item, index }) => (
              <CarteModele
                modele={item}
                rang={index}
                largeur={largeur}
                possede={possedes.has(item.id)}
              />
            )}
            columnWrapperClassName="gap-3"
            contentContainerClassName="gap-3 px-4 pb-[120px] pt-2"
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
                <Texte className="py-16 text-center text-body text-muted-foreground">
                  Aucun modèle dans cette catégorie.
                </Texte>
              ) : null
            }
            ListFooterComponent={
              total > 0 ? (
                <Texte className="pt-4 text-center text-footnote text-foreground-faint">
                  {total} modèle{total > 1 ? "s" : ""} disponible{total > 1 ? "s" : ""}
                </Texte>
              ) : null
            }
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
    </Box>
  );
}
