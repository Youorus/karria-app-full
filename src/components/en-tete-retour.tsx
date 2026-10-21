/**
 * L'en-tête des écrans de détail — le même partout.
 *
 * « ‹ Offres », « ‹ Modèles » : la flèche bleue et le nom de l'onglet
 * d'où l'on vient, comme l'en-tête natif de la V1. À droite, une pilule de
 * boutons ronds (Partager, Garder…). Un seul composant pour tous les
 * détails : le retour est toujours au même endroit, sous le même pouce,
 * avec le même mot — c'est ce qui rend la navigation prévisible.
 */

import { Pressable } from "react-native";

import { Icone, type NomIcone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { useCouleurs } from "@/theme/use-couleurs";

export interface ActionEnTete {
  icone: NomIcone;
  libelle: string;
  onPress: () => void;
  /** Couleur de l'icône : bleu pour un état actif (offre gardée). */
  active?: boolean;
  desactivee?: boolean;
}

interface Props {
  /** Le nom de l'onglet d'origine : « Offres », « Modèles »… */
  retour: string;
  onRetour: () => void;
  actions?: ActionEnTete[];
}

export function EnTeteRetour({ retour, onRetour, actions = [] }: Props) {
  const couleurs = useCouleurs();
  return (
    <HStack className="items-center justify-between px-3 pb-1">
      <Pressable
        onPress={onRetour}
        className="min-h-touch flex-row items-center pr-3"
        accessibilityRole="button"
        accessibilityLabel={`Retour ${retour === "Offres" ? "aux offres" : `à ${retour}`}`}
      >
        <Icone nom="retour" couleur={couleurs.primaire} taille={22} graisse="semibold" />
        <Texte className="text-callout text-primary">{retour}</Texte>
      </Pressable>
      {actions.length > 0 ? (
        <HStack className="h-9 items-center overflow-hidden rounded-full bg-remplissage">
          {actions.map((a, i) => (
            <HStack key={a.libelle} className="items-center">
              {i > 0 ? <Box className="h-[18px] w-px bg-border-champ" /> : null}
              <Pressable
                onPress={a.onPress}
                disabled={a.desactivee}
                className="h-9 w-10 items-center justify-center"
                accessibilityRole="button"
                accessibilityLabel={a.libelle}
              >
                <Icone
                  nom={a.icone}
                  couleur={a.active ? couleurs.primaire : couleurs.texte}
                  taille={18}
                />
              </Pressable>
            </HStack>
          ))}
        </HStack>
      ) : null}
    </HStack>
  );
}
