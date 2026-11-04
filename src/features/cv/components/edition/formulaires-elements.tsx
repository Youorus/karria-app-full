/**
 * Une expérience, une formation : le formulaire d'un élément de liste, et
 * la feuille qui le porte.
 *
 * ═══ La feuille ═══
 *
 * Un élément s'édite dans une feuille native (`pageSheet`) au-dessus de la
 * liste : on voit d'où l'on vient, on ferme d'un geste, et le clavier ne
 * bouscule pas la liste derrière. « Enregistrer » en haut à droite, comme
 * les formulaires d'iOS et d'Android.
 *
 * ═══ Les dates sans frappe ═══
 *
 * Début et fin passent par `SelecteurMois`. « En cours » désactive la fin
 * et l'efface : le serveur ferait pareil, autant que l'écran le montre.
 *
 * ═══ Les missions, une par une ═══
 *
 * Des puces (`ListePuces`) : « Ajouter une mission » ouvre un champ, « Terminé »
 * pose la puce, la croix la retire, la toucher la modifie. On ne cite pas
 * tout d'un coup — et chaque mission reste un élément à part entière,
 * sans découpage de texte à deviner.
 *
 * ═══ Les suggestions ═══
 *
 * Poste, entreprise, lieu, diplôme, établissement : `ChampAvecSuggestions`
 * propose ce que l'index connaît (`GET /cv/suggestions`). La saisie libre
 * reste la règle.
 *
 * ═══ « Enregistrer » bloqué tant que c'est incohérent ═══
 *
 * Le hook juge l'élément à chaque frappe (`bloque`) ; la feuille grise le
 * bouton et le dit au lecteur d'écran. Un manque, lui, se signale à la
 * tentative.
 */

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { ElementListe } from "../../hooks/use-modifier-cv";
import { MISSION_LONGUEUR_MAX, MISSIONS_MAX } from "../../services/validation-edition";
import type { Experience, Formation } from "../../types/cv.types";
import { ChampAvecSuggestions } from "./champ-avec-suggestions";
import { ListePuces } from "./liste-puces";
import { SelecteurMois } from "./selecteur-mois";

type Erreurs = Record<string, string>;

function Periode({
  debut,
  fin,
  enCours,
  libelleEnCours,
  onChange,
  erreurs,
}: {
  debut: string | null;
  fin: string | null;
  enCours: boolean;
  libelleEnCours: string;
  onChange: (p: { debut: string | null; fin: string | null; enCours: boolean }) => void;
  erreurs: Erreurs;
}) {
  const couleurs = useCouleurs();
  return (
    <VStack className="gap-4">
      <HStack className="gap-3">
        <SelecteurMois
          libelle="Début"
          valeur={debut}
          onChange={(d) => onChange({ debut: d, fin, enCours })}
          erreur={erreurs.debut}
        />
        <SelecteurMois
          libelle="Fin"
          valeur={enCours ? null : fin}
          onChange={(f) => onChange({ debut, fin: f, enCours })}
          erreur={erreurs.fin}
          desactive={enCours}
        />
      </HStack>
      <HStack className="min-h-touch items-center justify-between">
        <Texte className="text-callout text-foreground">{libelleEnCours}</Texte>
        <Switch
          value={enCours}
          onValueChange={(v) => onChange({ debut, fin: v ? null : fin, enCours: v })}
          trackColor={{ true: couleurs.primaire, false: couleurs.contour }}
          accessibilityLabel={libelleEnCours}
        />
      </HStack>
    </VStack>
  );
}

export function FormulaireExperience({
  valeur,
  onChange,
  erreurs,
}: {
  valeur: Experience;
  onChange: (v: Experience) => void;
  erreurs: Erreurs;
}) {
  return (
    <VStack className="gap-4">
      <ChampAvecSuggestions
        kind="title"
        libelle="Poste"
        value={valeur.poste}
        onChangeText={(poste) => onChange({ ...valeur, poste })}
        erreur={erreurs.poste}
        autoCapitalize="sentences"
      />
      <ChampAvecSuggestions
        kind="company"
        libelle="Entreprise"
        value={valeur.entreprise}
        onChangeText={(entreprise) => onChange({ ...valeur, entreprise })}
        erreur={erreurs.entreprise}
        autoCapitalize="words"
      />
      <ChampAvecSuggestions
        kind="city"
        libelle="Lieu"
        value={valeur.lieu ?? ""}
        onChangeText={(lieu) =>
          onChange({ ...valeur, lieu: lieu.trim() === "" ? null : lieu })
        }
        erreur={erreurs.lieu}
        autoCapitalize="words"
      />
      <Periode
        debut={valeur.debut}
        fin={valeur.fin}
        enCours={valeur.enCours}
        libelleEnCours="J'y travaille encore"
        onChange={(p) => onChange({ ...valeur, ...p })}
        erreurs={erreurs}
      />
      <ListePuces
        libelle="Missions"
        valeurs={valeur.missions}
        onChange={(missions) => onChange({ ...valeur, missions })}
        libelleAjout="Ajouter une mission"
        placeholder="Ex. : Conseiller les clients"
        aide="Une à la fois, à l'infinitif."
        erreur={erreurs.missions}
        max={MISSIONS_MAX}
        maxLongueur={MISSION_LONGUEUR_MAX}
      />
    </VStack>
  );
}

export function FormulaireFormation({
  valeur,
  onChange,
  erreurs,
}: {
  valeur: Formation;
  onChange: (v: Formation) => void;
  erreurs: Erreurs;
}) {
  return (
    <VStack className="gap-4">
      <ChampAvecSuggestions
        kind="degree"
        libelle="Diplôme ou formation"
        value={valeur.diplome}
        onChangeText={(diplome) => onChange({ ...valeur, diplome })}
        erreur={erreurs.diplome}
        autoCapitalize="sentences"
      />
      <ChampAvecSuggestions
        kind="school"
        libelle="Établissement"
        value={valeur.ecole}
        onChangeText={(ecole) => onChange({ ...valeur, ecole })}
        erreur={erreurs.ecole}
        autoCapitalize="words"
      />
      <ChampAvecSuggestions
        kind="city"
        libelle="Lieu"
        value={valeur.lieu ?? ""}
        onChangeText={(lieu) =>
          onChange({ ...valeur, lieu: lieu.trim() === "" ? null : lieu })
        }
        erreur={erreurs.lieu}
        autoCapitalize="words"
      />
      <Periode
        debut={valeur.debut}
        fin={valeur.fin}
        enCours={valeur.enCours}
        libelleEnCours="Formation en cours"
        onChange={(p) => onChange({ ...valeur, ...p })}
        erreurs={erreurs}
      />
    </VStack>
  );
}

export function FeuilleElement({
  section,
  valeur,
  nouveau,
  erreurs,
  bloque = false,
  onChange,
  onValider,
  onFermer,
}: {
  section: "experiences" | "educations";
  valeur: ElementListe | null;
  nouveau: boolean;
  erreurs: Erreurs;
  /** Une incohérence empêche d'enregistrer : le bouton est grisé. */
  bloque?: boolean;
  onChange: (v: ElementListe) => void;
  onValider: () => void;
  onFermer: () => void;
}) {
  const couleurs = useCouleurs();
  const titre =
    section === "experiences"
      ? nouveau
        ? "Nouvelle expérience"
        : "Expérience"
      : nouveau
        ? "Nouvelle formation"
        : "Formation";
  return (
    <Modal
      visible={valeur !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onFermer}
    >
      <Box style={{ flex: 1 }} className="bg-popover">
        <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <HStack className="h-[50px] items-center justify-between px-4 pt-2">
              <Pressable
                onPress={onFermer}
                className="min-h-touch justify-center"
                accessibilityRole="button"
              >
                <Texte className="text-body text-muted-foreground">Annuler</Texte>
              </Pressable>
              <Texte className="font-bold text-body text-foreground">{titre}</Texte>
              <Pressable
                onPress={onValider}
                disabled={bloque}
                className={`min-h-touch flex-row items-center gap-1 ${bloque ? "opacity-40" : ""}`}
                accessibilityRole="button"
                accessibilityLabel="Enregistrer"
                accessibilityState={{ disabled: bloque }}
              >
                <Icone
                  nom="coche"
                  couleur={couleurs.primaire}
                  taille={14}
                  graisse="bold"
                />
                <Texte className="font-bold text-body text-primary">Enregistrer</Texte>
              </Pressable>
            </HStack>
            <ScrollView
              contentContainerClassName="gap-4 px-5 pb-10 pt-3"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {valeur !== null && section === "experiences" && "poste" in valeur ? (
                <FormulaireExperience
                  valeur={valeur}
                  onChange={onChange}
                  erreurs={erreurs}
                />
              ) : null}
              {valeur !== null && section === "educations" && "diplome" in valeur ? (
                <FormulaireFormation
                  valeur={valeur}
                  onChange={onChange}
                  erreurs={erreurs}
                />
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Box>
    </Modal>
  );
}
