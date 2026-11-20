/**
 * « Mes recherches » — derrière la ligne du même nom, dans les paramètres.
 *
 * ═══ Ce qu'il montre ═══
 *
 * Une phrase qui dit à quoi sert la liste, puis une carte : une ligne par
 * recherche que Karria surveille, son interrupteur d'alerte à droite. En
 * pied, le plafond que le serveur annonce. Rien d'autre : on vient ici
 * couper ou rallumer une alerte, parfois retirer une recherche.
 *
 * ═══ Le même écran que les paramètres ═══
 *
 * L'aura, l'en-tête de retour, le titre, la carte et ses séparateurs
 * (`GroupeReglages`) sont ceux de `ecran-parametres.tsx` ; l'attente,
 * l'erreur, l'état vide et « tirer pour actualiser » sont ceux de l'onglet
 * Candidatures. Aucun style n'est né ici.
 *
 * ═══ Vide ═══
 *
 * Une recherche ne se crée pas par un formulaire : on la dit à Karria. Le
 * bouton y mène, en secondaire — l'écran n'a pas d'action principale.
 */

import { RefreshControl, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { ChargeurKarria } from "@/components/chargeur-karria";
import { EnTeteRetour } from "@/components/en-tete-retour";
import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { GroupeReglages } from "../components/ligne-reglage";
import { LigneRecherche } from "../components/ligne-recherche";
import { useMesRecherches } from "../hooks/use-mes-recherches";
import { piedDeListe, TEXTES_MES_RECHERCHES as T } from "../services/mes-recherches";

export function EcranMesRecherches() {
  const couleurs = useCouleurs();
  const {
    recherches,
    maximum,
    chargement,
    actualisation,
    erreur,
    note,
    maintenant,
    actualiser,
    basculer,
    supprimer,
    parlerAKarria,
    retour,
  } = useMesRecherches();

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <EnTeteRetour retour="Paramètres" onRetour={retour} />
        {chargement ? (
          <Box className="flex-1 items-center justify-center pb-24">
            <ChargeurKarria />
          </Box>
        ) : (
          <ScrollView
            contentContainerClassName="gap-6 px-5 pb-10 pt-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={actualisation}
                onRefresh={actualiser}
                tintColor={couleurs.primaire}
              />
            }
          >
            <VStack className="gap-2">
              <Texte
                accessibilityRole="header"
                className="font-display text-title-lg tracking-tighter text-foreground"
              >
                {T.titre}
              </Texte>
              {recherches.length > 0 ? (
                <Texte className="text-body leading-6 text-muted-foreground">
                  {T.introduction}
                </Texte>
              ) : null}
            </VStack>

            {erreur !== null ? (
              <MessageErreur
                message={erreur}
                action={actualiser}
                libelleAction="Réessayer"
              />
            ) : null}
            {note !== null ? <MessageErreur message={note} /> : null}

            {recherches.length > 0 ? (
              <>
                <GroupeReglages>
                  {recherches.map((recherche) => (
                    <LigneRecherche
                      key={recherche.id}
                      recherche={recherche}
                      maintenant={maintenant}
                      onBasculer={(actives) => basculer(recherche, actives)}
                      onSupprimer={() => supprimer(recherche)}
                    />
                  ))}
                </GroupeReglages>
                {maximum !== null ? (
                  <Texte className="text-center text-footnote text-foreground-faint">
                    {piedDeListe(maximum)}
                  </Texte>
                ) : null}
              </>
            ) : erreur === null ? (
              <VStack space="lg" className="items-center px-3 pt-12">
                <Texte className="text-center text-body leading-6 text-muted-foreground">
                  {T.vide}
                </Texte>
                <Box className="w-full pt-2">
                  <BoutonAction
                    libelle={T.parlerAKarria}
                    ton="secondaire"
                    onPress={parlerAKarria}
                  />
                </Box>
              </VStack>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </Box>
  );
}
