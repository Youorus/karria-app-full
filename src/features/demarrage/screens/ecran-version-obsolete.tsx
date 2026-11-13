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

import { Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { SymboleKarria } from "@/components/marque";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import { libelleDeVersion, type Version } from "../services/version";

interface Props {
  /** La réponse du serveur : le numéro de la nouvelle version, et où l'obtenir. */
  version: Version | null;
  onMettreAJour: () => void;
}

export function EcranVersionObsolete({ version, onMettreAJour }: Props) {
  const numero = version === null ? null : libelleDeVersion(version);
  const magasin = version?.urlStore ?? null;
  const nomDuMagasin = Platform.OS === "ios" ? "l'App Store" : "Google Play";
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
              {numero !== null ? (
                <Box className="rounded-full bg-surface-primary px-3 py-1">
                  <Texte className="text-caption font-bold uppercase tracking-wide text-primary">
                    {numero}
                  </Texte>
                </Box>
              ) : null}
              <Texte
                accessibilityRole="header"
                className="text-center font-display text-title-lg tracking-tight text-foreground"
              >
                Une nouvelle version de Karria est sortie
              </Texte>
              <Texte className="px-2 text-center text-body leading-6 text-muted-foreground">
                {magasin !== null
                  ? "Mets Karria à jour pour continuer : ça prend une minute, et tu retrouves tes offres, ton CV et tes dossiers."
                  : `Ouvre ${nomDuMagasin}, cherche « Karria » et touche « Mettre à jour » pour continuer.`}
              </Texte>
            </VStack>
          </VStack>
          {magasin !== null ? (
            <BoutonAction libelle="Mettre à jour" onPress={onMettreAJour} />
          ) : (
            <BoutonAction
              libelle={`Ouvrir ${nomDuMagasin}`}
              ton="secondaire"
              onPress={onMettreAJour}
            />
          )}
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
