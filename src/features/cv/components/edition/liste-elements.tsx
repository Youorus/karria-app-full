/**
 * La liste des expériences ou des formations, à réordonner, modifier,
 * supprimer, compléter.
 *
 * ═══ Monter / descendre plutôt que glisser ═══
 *
 * Le glisser-déposer demande un module natif (non ajouté) et se rate
 * souvent sur une liste courte. Deux flèches font le travail sans
 * surprise ; un CV a rarement plus de six expériences.
 *
 * Toucher un élément l'ouvre dans la feuille d'édition. La corbeille
 * supprime sans confirmation : la liste s'enregistre à chaque geste, et une
 * erreur de doigt se répare en rajoutant — on ne met pas une alerte entre
 * la personne et chaque geste.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { ElementListe } from "../../hooks/use-modifier-cv";
import { periodeLisible } from "../../services/chapitres";

function titreDe(e: ElementListe): { titre: string; sous: string } {
  if ("poste" in e) {
    return { titre: e.poste, sous: [e.entreprise, e.lieu].filter(Boolean).join(" · ") };
  }
  return { titre: e.diplome, sous: [e.ecole, e.lieu].filter(Boolean).join(" · ") };
}

interface Props {
  elements: ElementListe[];
  libelleAjout: string;
  occupe: boolean;
  onEditer: (index: number) => void;
  onSupprimer: (index: number) => void;
  onMonter: (index: number) => void;
  onDescendre: (index: number) => void;
  onAjouter: () => void;
}

export function ListeElements({
  elements,
  libelleAjout,
  occupe,
  onEditer,
  onSupprimer,
  onMonter,
  onDescendre,
  onAjouter,
}: Props) {
  const couleurs = useCouleurs();
  return (
    <VStack className="gap-3">
      {elements.map((e, i) => {
        const { titre, sous } = titreDe(e);
        const periode = periodeLisible(e.debut, e.fin, e.enCours);
        return (
          <HStack
            key={`${titre}-${i}`}
            className="items-center gap-2 rounded-carte border border-border-subtle bg-card p-3"
          >
            <VStack className="gap-1">
              <Pressable
                onPress={() => onMonter(i)}
                disabled={occupe || i === 0}
                className={`h-9 w-9 items-center justify-center rounded-full bg-remplissage ${
                  i === 0 ? "opacity-30" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Monter"
              >
                <Icone
                  nom="haut"
                  couleur={couleurs.texte}
                  taille={12}
                  graisse="semibold"
                />
              </Pressable>
              <Pressable
                onPress={() => onDescendre(i)}
                disabled={occupe || i === elements.length - 1}
                className={`h-9 w-9 items-center justify-center rounded-full bg-remplissage ${
                  i === elements.length - 1 ? "opacity-30" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Descendre"
              >
                <Box className="rotate-180">
                  <Icone
                    nom="haut"
                    couleur={couleurs.texte}
                    taille={12}
                    graisse="semibold"
                  />
                </Box>
              </Pressable>
            </VStack>
            <Pressable
              onPress={() => onEditer(i)}
              disabled={occupe}
              className="min-h-touch flex-1 justify-center gap-0.5"
              accessibilityRole="button"
              accessibilityLabel={`Modifier ${titre}`}
            >
              <Texte className="font-bold text-body text-foreground">
                {titre || "Sans titre"}
              </Texte>
              {sous ? (
                <Texte className="text-footnote text-muted-foreground">{sous}</Texte>
              ) : null}
              <Texte
                className={`text-footnote ${periode === null ? "text-warning" : "text-foreground-faint"}`}
              >
                {periode ?? "Dates à préciser"}
              </Texte>
            </Pressable>
            <Pressable
              onPress={() => onSupprimer(i)}
              disabled={occupe}
              className="h-11 w-11 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel={`Supprimer ${titre}`}
            >
              <Icone nom="corbeille" couleur={couleurs.destructif} taille={16} />
            </Pressable>
          </HStack>
        );
      })}
      <Pressable
        onPress={onAjouter}
        disabled={occupe}
        className="min-h-touch flex-row items-center justify-center gap-2 rounded-carte border border-dashed border-border-champ py-3"
        accessibilityRole="button"
      >
        <Icone nom="ajouter" couleur={couleurs.primaire} taille={15} graisse="semibold" />
        <Texte className="font-bold text-callout text-primary">{libelleAjout}</Texte>
      </Pressable>
    </VStack>
  );
}
