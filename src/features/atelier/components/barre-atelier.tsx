/**
 * Quelques gestes nommés, sous le papier. Le pied occupe sa place réelle :
 * agrandir le texte pousse la mise en page au lieu de rogner les commandes.
 */

import { Pressable, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { TEXTES } from "../services/presentation";
import { phraseDepassement } from "../services/une-page";

export type GesteAtelier = "modifier" | "karria" | "finaliser";

interface Props {
  /** Les propositions de Karria encore à relire. */
  enAttente: number;
  onGeste: (geste: GesteAtelier) => void;
  finalisationIndisponible?: boolean;
  sauvegardeEnCours?: boolean;
  /** Faux : pas de geste « Karria » (atelier libre, sans dossier). */
  avecKarria?: boolean;
  /** Le nombre de pages de la feuille ; au-delà d'une, la barre le dit. */
  pages?: number;
  /** « Tenir sur une page » : ouvre la feuille qui le propose. */
  onPages?: () => void;
}

/**
 * La ligne des pages, **dans** la barre — là où l'on lit, pas sur le CV
 * (Marc, 13/11) : « Ton CV fait 2 pages · Tenir sur une page ». Deux pages
 * sont permises ; la ligne informe et propose, elle n'alerte pas.
 */
function LignePages({ pages, onPress }: { pages: number; onPress: () => void }) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className="mx-1 mb-1 min-h-touch flex-row items-center gap-2 rounded-full bg-remplissage px-4"
      accessibilityRole="button"
      accessibilityLabel={`${phraseDepassement(pages)}. ${TEXTES.unePageAgir}`}
    >
      <Icone nom="cv" couleur={couleurs.estompe} taille={14} />
      <VStack className="min-w-0 flex-1 py-2">
        <Texte className="text-footnote text-foreground">
          {phraseDepassement(pages)}
        </Texte>
        <Texte className="font-bold text-body text-foreground">
          {TEXTES.unePageAgir}
        </Texte>
      </VStack>
      <Icone nom="suivant" couleur={couleurs.primaire} taille={11} graisse="bold" />
    </Pressable>
  );
}

export function BarreAtelier({
  enAttente,
  onGeste,
  finalisationIndisponible = false,
  sauvegardeEnCours = false,
  avecKarria = true,
  pages = 1,
  onPages,
}: Props) {
  const { width, fontScale } = useWindowDimensions();
  const empiler = width / Math.max(fontScale, 1) < (avecKarria ? 440 : 310);
  return (
    <SafeAreaView key={fontScale} edges={["bottom"]}>
      <VStack className="gap-2 border-t border-border-subtle bg-background px-3 pb-2 pt-2">
        {pages > 1 && onPages ? <LignePages pages={pages} onPress={onPages} /> : null}
        <View className={empiler ? "flex-col gap-2" : "flex-row items-start gap-2"}>
          <HStack
            className={
              empiler
                ? "w-full flex-wrap items-start gap-2"
                : "min-w-0 flex-1 flex-wrap items-start gap-2"
            }
          >
            <BoutonAction
              libelle="Modifier le CV"
              ton="secondaire"
              multiligne
              pleineLargeur={empiler && fontScale > 1.4}
              onPress={() => onGeste("modifier")}
            />
            {avecKarria ? (
              <BoutonAction
                libelle={enAttente > 0 ? `Karria (${enAttente})` : "Karria"}
                accessibilityLabel={
                  enAttente > 0 ? `Karria, ${enAttente} propositions à relire` : "Karria"
                }
                ton="discret"
                pleineLargeur={empiler && fontScale > 1.4}
                multiligne
                onPress={() => onGeste("karria")}
              />
            ) : null}
          </HStack>
          <Pressable
            onPress={() => onGeste("finaliser")}
            disabled={finalisationIndisponible || sauvegardeEnCours}
            accessibilityRole="button"
            accessibilityState={{
              disabled: finalisationIndisponible || sauvegardeEnCours,
              busy: sauvegardeEnCours,
            }}
            className={`min-h-touch items-center justify-center rounded-carte bg-action-primary px-4 py-3 active:opacity-80 ${empiler ? "w-full" : ""} ${finalisationIndisponible || sauvegardeEnCours ? "opacity-50" : ""}`}
          >
            <Texte className="text-center font-bold text-body text-primary-foreground">
              {sauvegardeEnCours ? "Enregistrement…" : TEXTES.finaliser}
            </Texte>
          </Pressable>
        </View>
      </VStack>
    </SafeAreaView>
  );
}
