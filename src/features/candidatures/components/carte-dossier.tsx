/**
 * Un dossier dans la liste — une pochette, pas une fiche.
 *
 * ═══ L'anatomie ═══
 *
 * 1. La tuile de l'entreprise (celle du fil, pour qu'on la reconnaisse),
 *    le nom de l'entreprise, le titre sur deux lignes ; à droite, les deux
 *    feuilles du dossier (`feuilles-documents.tsx`).
 * 2. La ville, et la date de génération à droite — « Généré hier ».
 * 3. L'état, en une phrase précédée d'un point (`point-etat.tsx`).
 *
 * Rien d'autre : pas de taux de couverture, pas de compteur de documents,
 * pas d'étiquette de contrat. Une liste de candidatures se parcourt pour
 * retrouver **une** offre et savoir **où l'on en est** ; le reste attend
 * dans le détail.
 *
 * ═══ Glisser pour supprimer ═══
 *
 * Le glissement vers la gauche révèle « Supprimer » ; le toucher demande
 * confirmation (dans le hook). Le geste est celui de Mail et de Messages :
 * on ne l'explique pas, on le reconnaît.
 *
 * ═══ Le mouvement ═══
 *
 * L'entrée du fil (fondu en montant, décalée par rang), la pression qui
 * enfonce à 97 % ; « mouvement réduit » coupe l'entrée.
 */

import { Pressable } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { TuileEntreprise } from "@/features/offres/components/tuile-entreprise";
import { useCouleurs } from "@/theme/use-couleurs";

import { etatDuDossier, ligneDeGeneration, TEXTES } from "../services/presentation";
import type { CarteDossier as Carte } from "../types/candidatures.types";
import { FeuillesDocuments } from "./feuilles-documents";
import { PointEtat } from "./point-etat";

const RESSORT = { damping: 22, stiffness: 250 };

interface Props {
  carte: Carte;
  rang: number;
  maintenant: Date;
  onOuvrir: () => void;
  onSupprimer: () => void;
}

function ActionSupprimer({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="ml-3 w-24 items-center justify-center rounded-carte bg-destructive"
      accessibilityRole="button"
      accessibilityLabel={`${TEXTES.supprimer} ce dossier`}
    >
      <Texte className="font-bold text-footnote text-destructive-foreground">
        {TEXTES.supprimer}
      </Texte>
    </Pressable>
  );
}

export function CarteDossier({ carte, rang, maintenant, onOuvrir, onSupprimer }: Props) {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const echelle = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: echelle.value }] }));
  const etat = etatDuDossier(carte, maintenant);
  const { offre } = carte;

  return (
    <Animated.View
      entering={
        reduit ? undefined : FadeInDown.duration(450).delay(Math.min(rang * 40, 400))
      }
    >
      <ReanimatedSwipeable
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={() => <ActionSupprimer onPress={onSupprimer} />}
      >
        <Animated.View style={style}>
          <Pressable
            onPress={onOuvrir}
            onPressIn={() => echelle.set(withSpring(0.97, RESSORT))}
            onPressOut={() => echelle.set(withSpring(1, RESSORT))}
            accessibilityRole="button"
            accessibilityLabel={`${offre.titre}${offre.entreprise ? `, ${offre.entreprise}` : ""}, ${etat.libelle}`}
            accessibilityHint="Ouvre le dossier"
          >
            <VStack className="rounded-carte border border-border-subtle bg-card p-4">
              <HStack space="md" className="items-center">
                <TuileEntreprise
                  logo={offre.logo}
                  entreprise={offre.entreprise}
                  teinte={offre.id}
                  taille="carte"
                  cle={carte.id}
                />
                <VStack className="flex-1">
                  <Texte
                    className="font-medium text-caption uppercase tracking-widest text-muted-foreground"
                    numberOfLines={1}
                  >
                    {offre.entreprise ?? "Entreprise"}
                  </Texte>
                  <Texte
                    className="font-bold text-body text-foreground"
                    numberOfLines={2}
                  >
                    {offre.titre}
                  </Texte>
                </VStack>
                <FeuillesDocuments lettre={carte.aUneLettre} />
              </HStack>

              <HStack className="mt-3 items-center justify-between">
                <HStack space="xs" className="flex-1 items-center">
                  <Icone nom="lieu" couleur={couleurs.estompe} taille={12} />
                  <Texte
                    className="shrink text-footnote text-muted-foreground"
                    numberOfLines={1}
                  >
                    {offre.ville ?? "Lieu non précisé"}
                  </Texte>
                </HStack>
                <Texte className="text-footnote text-foreground-faint">
                  {ligneDeGeneration(carte, maintenant)}
                </Texte>
              </HStack>

              <HStack className="mt-3 items-center">
                <PointEtat etat={etat} />
              </HStack>
            </VStack>
          </Pressable>
        </Animated.View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}
