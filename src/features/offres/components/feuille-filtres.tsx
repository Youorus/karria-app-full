/**
 * La feuille des filtres — `feed-filter-sheet.tsx` de la V1.
 *
 * ═══ Ce qui est gardé de la V1 ═══
 *
 * - **pas de bouton « Appliquer »** : chaque toucher filtre aussitôt le
 *   fil derrière la feuille — on voit l'effet de son geste ;
 * - l'en-tête : fermer à gauche, « Filtres » et le compteur au centre,
 *   « Effacer » à droite ;
 * - les sections : **Affichage** (Sauvegardées, Non vues, Non postulées),
 *   **Publication** (24 h, 3, 7, 30 jours), **Catégories** (Type de
 *   contrat, Localisation) qui ouvrent chacune une sous-vue ;
 * - les pastilles de 40 pt, rondes, cochées quand elles sont actives.
 *
 * La V1 s'appuyait sur une feuille Gorhom ; ici, la feuille native du
 * système (`pageSheet`), qui suit le geste de fermeture d'iOS et le retour
 * d'Android sans dépendance de plus.
 */

import { useState } from "react";
import { Modal, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import {
  FILTRES_PAR_DEFAUT,
  type Filtres,
  type Option,
  type OptionsDeFiltre,
  type Periode,
} from "../types/offres.types";

const PERIODES: { valeur: Exclude<Periode, null>; libelle: string }[] = [
  { valeur: 1, libelle: "Dernières 24h" },
  { valeur: 3, libelle: "3 derniers jours" },
  { valeur: 7, libelle: "7 derniers jours" },
  { valeur: 30, libelle: "30 derniers jours" },
];

type Vue = "principale" | "contrats" | "villes";

function Pastille({
  libelle,
  active,
  onPress,
}: {
  libelle: string;
  active: boolean;
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className={`h-10 flex-row items-center gap-1.5 rounded-full border-[1.5px] px-4 ${
        active ? "border-primary bg-surface-primary" : "border-transparent bg-remplissage"
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {active ? (
        <Icone nom="coche" couleur={couleurs.primaire} taille={11} graisse="bold" />
      ) : null}
      <Texte
        className={`font-medium text-footnote ${active ? "text-primary" : "text-foreground"}`}
      >
        {libelle}
      </Texte>
    </Pressable>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <VStack space="sm">
      <Texte className="font-bold text-caption uppercase tracking-wide text-foreground-faint">
        {titre}
      </Texte>
      {children}
    </VStack>
  );
}

function LigneCategorie({
  titre,
  resume,
  onPress,
}: {
  titre: string;
  resume: string;
  onPress: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <Pressable
      onPress={onPress}
      className="min-h-touch flex-row items-center gap-3 px-4 py-3"
      accessibilityRole="button"
    >
      <VStack className="flex-1">
        <Texte className="font-bold text-body text-foreground">{titre}</Texte>
        <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
          {resume}
        </Texte>
      </VStack>
      <Icone nom="suivant" couleur={couleurs.estompe} taille={14} />
    </Pressable>
  );
}

function basculer(liste: string[], valeur: string): string[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

interface Props {
  visible: boolean;
  /** Sans compte : pas d'« Affichage » — ces filtres parlent d'un compte. */
  invite?: boolean;
  filtres: Filtres;
  options: OptionsDeFiltre;
  actifs: number;
  onFermer: () => void;
  onChanger: (filtres: Filtres) => void;
}

export function FeuilleFiltres({
  visible,
  invite = false,
  filtres,
  options,
  actifs,
  onFermer,
  onChanger,
}: Props) {
  const couleurs = useCouleurs();
  const [vue, setVue] = useState<Vue>("principale");
  const changer = (modif: Partial<Filtres>) => onChanger({ ...filtres, ...modif });

  const liste = (choix: Option[], cle: "contrats" | "villes") => (
    <VStack className="overflow-hidden rounded-carte bg-card">
      {choix.length === 0 ? (
        <Texte className="px-4 py-4 text-body text-muted-foreground">
          Aucune option disponible pour ton fil.
        </Texte>
      ) : (
        choix.map((o) => (
          <Pressable
            key={o.valeur}
            onPress={() => changer({ [cle]: basculer(filtres[cle], o.valeur) })}
            className="min-h-[52px] flex-row items-center justify-between border-b border-border-subtle px-4"
            accessibilityRole="button"
            accessibilityState={{ selected: filtres[cle].includes(o.valeur) }}
          >
            <Texte className="text-body text-foreground">{o.libelle}</Texte>
            {filtres[cle].includes(o.valeur) ? (
              <Icone nom="coche" couleur={couleurs.primaire} taille={16} graisse="bold" />
            ) : null}
          </Pressable>
        ))
      )}
    </VStack>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onFermer}
      onDismiss={() => setVue("principale")}
    >
      <Box style={{ flex: 1 }} className="bg-popover">
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <HStack className="h-[50px] items-center justify-between px-4 pt-2">
            {vue === "principale" ? (
              <Pressable
                onPress={onFermer}
                className="h-8 w-8 items-center justify-center rounded-full bg-remplissage"
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Icone nom="fermer" couleur={couleurs.texte} taille={14} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setVue("principale")}
                className="min-h-touch flex-row items-center gap-1"
                accessibilityRole="button"
              >
                <Icone nom="retour" couleur={couleurs.primaire} taille={16} />
                <Texte className="font-bold text-body text-primary">Retour</Texte>
              </Pressable>
            )}
            <HStack space="xs" className="items-center">
              <Texte className="font-display text-body text-foreground">Filtres</Texte>
              {actifs > 0 ? (
                <Box className="h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1">
                  <Texte className="font-bold text-caption text-primary-foreground">
                    {actifs}
                  </Texte>
                </Box>
              ) : null}
            </HStack>
            <Pressable
              onPress={() => onChanger(FILTRES_PAR_DEFAUT)}
              className="min-h-touch justify-center"
              accessibilityRole="button"
            >
              <Texte className="font-bold text-body text-primary">Effacer</Texte>
            </Pressable>
          </HStack>

          <ScrollView contentContainerClassName="gap-6 px-5 py-4">
            {vue === "principale" ? (
              <>
                {invite ? null : (
                  <Section titre="Affichage">
                    <HStack className="flex-wrap gap-2">
                      <Pastille
                        libelle="Sauvegardées"
                        active={filtres.sauvegardees}
                        onPress={() => changer({ sauvegardees: !filtres.sauvegardees })}
                      />
                      <Pastille
                        libelle="Non vues"
                        active={filtres.nonVues}
                        onPress={() => changer({ nonVues: !filtres.nonVues })}
                      />
                      <Pastille
                        libelle="Non postulées"
                        active={filtres.nonPostulees}
                        onPress={() => changer({ nonPostulees: !filtres.nonPostulees })}
                      />
                    </HStack>
                  </Section>
                )}
                <Section titre="Publication">
                  <HStack className="flex-wrap gap-2">
                    {PERIODES.map((p) => (
                      <Pastille
                        key={p.valeur}
                        libelle={p.libelle}
                        active={filtres.periode === p.valeur}
                        onPress={() =>
                          changer({
                            periode: filtres.periode === p.valeur ? null : p.valeur,
                          })
                        }
                      />
                    ))}
                  </HStack>
                </Section>
                <Section titre="Catégories">
                  <VStack className="overflow-hidden rounded-carte bg-card">
                    <LigneCategorie
                      titre="Type de contrat"
                      resume={filtres.contrats.join(", ") || "Tous"}
                      onPress={() => setVue("contrats")}
                    />
                    <Box className="h-px bg-border-subtle" />
                    <LigneCategorie
                      titre="Localisation"
                      resume={filtres.villes.join(", ") || "Tous"}
                      onPress={() => setVue("villes")}
                    />
                  </VStack>
                </Section>
              </>
            ) : vue === "contrats" ? (
              <Section titre="Type de contrat">
                {liste(options.contrats, "contrats")}
              </Section>
            ) : (
              <Section titre="Localisation">{liste(options.villes, "villes")}</Section>
            )}
          </ScrollView>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}
