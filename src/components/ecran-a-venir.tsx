/**
 * Un onglet de la V1 dont la refonte n'est pas encore faite.
 *
 * Il garde l'en-tête de l'onglet (titre et sous-titre de la V1) pour que
 * la navigation soit déjà la bonne, et dit honnêtement ce qui manque —
 * plutôt qu'un écran vide qui ferait croire à une panne. Il disparaît
 * onglet par onglet, à mesure que chacun est reconstruit (voir
 * `docs/reference-v1.md`).
 */

import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { EnTeteKarria } from "@/components/en-tete-karria";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

interface Props {
  titre: string;
  sousTitre: string;
  message: string;
}

export function EcranAVenir({ titre, sousTitre, message }: Props) {
  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria titre={titre} sousTitre={sousTitre} />
        <VStack space="lg" className="flex-1 items-center justify-center px-8 pb-24">
          <OrbeVivante taille={110}>
            <SymboleKarria taille={40} teinte="reflet" />
          </OrbeVivante>
          <Texte className="text-center font-display text-title text-foreground">
            Bientôt ici
          </Texte>
          <Texte className="text-center text-body text-muted-foreground">{message}</Texte>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
