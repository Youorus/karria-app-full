/**
 * Une recherche enregistrée, dans la carte de « Mes recherches ».
 *
 * ═══ La même ligne que les paramètres, avec un interrupteur ═══
 *
 * La tuile d'icône, le titre et le détail reprennent `ligne-reglage.tsx`
 * au point près — c'est la même carte, on ne doit pas voir la couture. À
 * droite, l'interrupteur du système (celui du formulaire d'expérience) à
 * la place du chevron : la ligne ne mène nulle part, elle se règle. La
 * cloche se barre quand l'alerte est coupée, pour que l'état se lise sans
 * regarder l'interrupteur.
 *
 * ═══ Glisser pour supprimer ═══
 *
 * Le geste de l'onglet Candidatures (`carte-dossier.tsx`) : le glissement
 * vers la gauche révèle « Supprimer », le toucher demande confirmation
 * (dans le hook). Un lecteur d'écran ne glisse pas : la même suppression
 * est offerte comme action d'accessibilité du texte de la ligne.
 */

import { Pressable, Switch } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type { RechercheEnregistree } from "@/features/assistant/types/recherches-enregistrees.types";
import { useCouleurs } from "@/theme/use-couleurs";

import {
  detailDeRecherche,
  libelleDesAlertes,
  TEXTES_MES_RECHERCHES as T,
} from "../services/mes-recherches";

interface Props {
  recherche: RechercheEnregistree;
  maintenant: Date;
  onBasculer: (actives: boolean) => void;
  onSupprimer: () => void;
}

function ActionSupprimer({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="w-24 items-center justify-center bg-destructive"
      accessibilityRole="button"
      accessibilityLabel={`${T.supprimer} cette recherche`}
    >
      <Texte className="font-bold text-footnote text-destructive-foreground">
        {T.supprimer}
      </Texte>
    </Pressable>
  );
}

export function LigneRecherche({
  recherche,
  maintenant,
  onBasculer,
  onSupprimer,
}: Props) {
  const couleurs = useCouleurs();
  const detail = detailDeRecherche(recherche, maintenant);

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => <ActionSupprimer onPress={onSupprimer} />}
    >
      <HStack
        // Un fond plein : sans lui, « Supprimer » se verrait à travers la
        // ligne pendant le glissement.
        className="min-h-touch items-center gap-3 bg-card px-4 py-3"
      >
        <Box className="h-9 w-9 items-center justify-center rounded-pastille bg-remplissage">
          <Icone
            nom={recherche.alertes ? "cloche" : "clocheBarree"}
            couleur={recherche.alertes ? couleurs.primaire : couleurs.estompe}
            taille={16}
          />
        </Box>
        <VStack
          className="flex-1 gap-0.5"
          // Le texte seul est regroupé : regrouper toute la ligne cacherait
          // l'interrupteur au lecteur d'écran.
          accessible
          accessibilityLabel={
            detail ? `${recherche.resume}, ${detail}` : recherche.resume
          }
          accessibilityActions={[{ name: "delete", label: T.supprimer }]}
          onAccessibilityAction={(evenement) => {
            if (evenement.nativeEvent.actionName === "delete") onSupprimer();
          }}
        >
          <Texte className="font-bold text-body text-foreground" numberOfLines={2}>
            {recherche.resume}
          </Texte>
          {detail ? (
            <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
              {detail}
            </Texte>
          ) : null}
        </VStack>
        <Switch
          value={recherche.alertes}
          onValueChange={onBasculer}
          trackColor={{ true: couleurs.primaire, false: couleurs.contour }}
          accessibilityLabel={libelleDesAlertes(recherche)}
        />
      </HStack>
    </ReanimatedSwipeable>
  );
}
