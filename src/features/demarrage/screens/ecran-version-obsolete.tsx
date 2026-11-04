/**
 * L'écran qui remplace tout quand cette version n'est plus servie.
 *
 * ═══ Un seul geste possible ═══
 *
 * « Une nouvelle version de Karria t'attend », une phrase chaleureuse, et
 * **un** bouton : « Mettre à jour », qui ouvre le magasin. Ni « plus
 * tard », ni croix : le serveur a dit que cette build ne fonctionne plus
 * — la laisser continuer afficherait des erreurs qu'elle ne sait pas
 * lire. Mais rien de sévère : l'orbe au repos, le fond de l'aura, le ton
 * des autres écrans. On n'est pas puni, on est invité.
 *
 * Monté par la racine (`app/_layout.tsx`) à la place de la navigation :
 * aucun écran ne peut passer au-dessus.
 */

import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

interface Props {
  onMettreAJour: () => void;
}

export function EcranVersionObsolete({ onMettreAJour }: Props) {
  return (
    // `flex: 1` en style : le conteneur racine d'un écran, seule exception
    // admise à la règle §3.2.
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <VStack className="flex-1 justify-between px-6 pb-6 pt-10">
          <VStack className="flex-1 items-center justify-center gap-8">
            <OrbeVivante taille={120}>
              <SymboleKarria taille={44} teinte="reflet" />
            </OrbeVivante>
            <VStack className="items-center gap-3">
              <Texte
                accessibilityRole="header"
                className="text-center font-display text-title-lg tracking-tight text-foreground"
              >
                Une nouvelle version de Karria t&apos;attend
              </Texte>
              <Texte className="px-2 text-center text-body leading-6 text-muted-foreground">
                Celle-ci a fait son temps. Mets-la à jour pour retrouver tes offres, ton
                CV et Karria — ça prend une minute.
              </Texte>
            </VStack>
          </VStack>
          <BoutonAction libelle="Mettre à jour" onPress={onMettreAJour} />
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
