/**
 * Choisir un mois et une année sans rien taper.
 *
 * ═══ Pourquoi pas un champ texte ═══
 *
 * Le contrat veut `AAAA-MM` (ou `AAAA` seul). Personne ne tape ça
 * volontiers sur un téléphone, et chaque faute de format serait un 422.
 * Le champ ressemble donc à un champ (« sept. 2021 »), mais s'ouvre sur une
 * feuille : l'année au centre, flanquée de ‹ ›, les douze mois en grille,
 * et deux choix de plus — « Année seule » quand le mois est oublié, et
 * « Effacer ». Zéro frappe, zéro format.
 *
 * Aucune dépendance : le sélecteur natif d'iOS ne connaît pas « année
 * seule », et le projet n'ajoute pas de module pour un champ.
 */

import { useState } from "react";
import { Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { contourDeChamp } from "@/components/contour-champ";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { BORDS_FEUILLE_NATIVE } from "@/lib/feuille-native";
import { useCouleurs } from "@/theme/use-couleurs";

import { moisLisible } from "../../services/chapitres";

const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

interface Props {
  libelle: string;
  /** `AAAA-MM`, `AAAA`, ou `null`. */
  valeur: string | null;
  onChange: (valeur: string | null) => void;
  erreur?: string;
  desactive?: boolean;
}

function decomposer(valeur: string | null): { annee: number; mois: number | null } {
  const maintenant = new Date().getFullYear();
  if (valeur === null) return { annee: maintenant, mois: null };
  const [a, m] = valeur.split("-");
  const annee = Number(a);
  const mois = m === undefined ? null : Number(m);
  return {
    annee: Number.isFinite(annee) && annee > 1900 ? annee : maintenant,
    mois: mois !== null && mois >= 1 && mois <= 12 ? mois : null,
  };
}

export function SelecteurMois({
  libelle,
  valeur,
  onChange,
  erreur,
  desactive = false,
}: Props) {
  const couleurs = useCouleurs();
  const [ouvert, setOuvert] = useState(false);
  const [annee, setAnnee] = useState(() => decomposer(valeur).annee);
  const choisi = decomposer(valeur);
  const anneeMax = new Date().getFullYear() + 6;

  const ouvrir = () => {
    setAnnee(decomposer(valeur).annee);
    setOuvert(true);
  };
  const poser = (v: string | null) => {
    onChange(v);
    setOuvert(false);
  };

  return (
    <VStack space="xs" className="flex-1">
      <Texte className="font-bold text-footnote text-foreground">{libelle}</Texte>
      <Pressable
        onPress={ouvrir}
        disabled={desactive}
        className={`h-champ flex-row items-center justify-between rounded-champ bg-card px-4 ${contourDeChamp(
          { actif: ouvert, erreur },
        )} ${desactive ? "opacity-50" : ""}`}
        accessibilityRole="button"
        accessibilityLabel={`${libelle} : ${moisLisible(valeur) ?? "non renseigné"}`}
        accessibilityState={{ disabled: desactive }}
      >
        <Texte
          className={`text-callout ${valeur === null ? "text-foreground-faint" : "text-foreground"}`}
        >
          {moisLisible(valeur) ?? "Mois et année"}
        </Texte>
        <Icone nom="calendrier" couleur={couleurs.estompe} taille={15} />
      </Pressable>
      {erreur ? (
        <Texte className="text-footnote text-destructive" accessibilityRole="alert">
          {erreur}
        </Texte>
      ) : null}

      <Modal
        visible={ouvert}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOuvert(false)}
      >
        <Box style={{ flex: 1 }} className="bg-popover">
          <SafeAreaView style={{ flex: 1 }} edges={BORDS_FEUILLE_NATIVE}>
            <HStack className="h-[50px] items-center justify-between px-4 pt-2">
              <Pressable
                onPress={() => setOuvert(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-remplissage"
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Icone nom="fermer" couleur={couleurs.texte} taille={14} />
              </Pressable>
              <Texte className="font-bold text-body text-foreground">{libelle}</Texte>
              <Box className="h-8 w-8" />
            </HStack>

            <VStack className="gap-6 px-5 pt-4">
              <HStack className="items-center justify-between">
                <Pressable
                  onPress={() => setAnnee((a) => a - 1)}
                  className="h-12 w-12 items-center justify-center rounded-full bg-remplissage"
                  accessibilityRole="button"
                  accessibilityLabel="Année précédente"
                >
                  <Icone nom="retour" couleur={couleurs.texte} taille={16} />
                </Pressable>
                <Texte className="font-display text-title-lg text-foreground">
                  {annee}
                </Texte>
                <Pressable
                  onPress={() => setAnnee((a) => Math.min(anneeMax, a + 1))}
                  disabled={annee >= anneeMax}
                  className={`h-12 w-12 items-center justify-center rounded-full bg-remplissage ${
                    annee >= anneeMax ? "opacity-40" : ""
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel="Année suivante"
                >
                  <Icone nom="suivant" couleur={couleurs.texte} taille={16} />
                </Pressable>
              </HStack>

              <HStack className="flex-wrap justify-between gap-y-3">
                {MOIS.map((m, i) => {
                  const actif = choisi.annee === annee && choisi.mois === i + 1;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => poser(`${annee}-${String(i + 1).padStart(2, "0")}`)}
                      className={`h-12 w-[31%] items-center justify-center rounded-champ ${
                        actif ? "bg-primary" : "bg-card"
                      }`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: actif }}
                    >
                      <Texte
                        className={`font-medium text-callout ${
                          actif ? "text-primary-foreground" : "text-foreground"
                        }`}
                      >
                        {m}
                      </Texte>
                    </Pressable>
                  );
                })}
              </HStack>

              <HStack className="gap-3">
                <Pressable
                  onPress={() => poser(String(annee))}
                  className={`h-12 flex-1 items-center justify-center rounded-champ border-[1.5px] border-border-champ ${
                    choisi.annee === annee && choisi.mois === null && valeur !== null
                      ? "bg-surface-primary"
                      : "bg-card"
                  }`}
                  accessibilityRole="button"
                >
                  <Texte className="font-medium text-callout text-foreground">
                    Année seule
                  </Texte>
                </Pressable>
                <Pressable
                  onPress={() => poser(null)}
                  className="h-12 flex-1 items-center justify-center rounded-champ bg-card"
                  accessibilityRole="button"
                >
                  <Texte className="font-medium text-callout text-muted-foreground">
                    Effacer
                  </Texte>
                </Pressable>
              </HStack>
            </VStack>
          </SafeAreaView>
        </Box>
      </Modal>
    </VStack>
  );
}
