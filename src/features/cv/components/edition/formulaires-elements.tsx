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
 * ═══ Les missions ═══
 *
 * Une par ligne dans un champ multiligne : c'est la façon la plus naturelle
 * d'en taper plusieurs sur un téléphone. On découpe au retour à la ligne et
 * on ignore les lignes vides.
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

import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { ElementListe } from "../../hooks/use-modifier-cv";
import type { Experience, Formation } from "../../types/cv.types";
import { ChampMultiligne } from "./champ-multiligne";
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
      <ChampTexte
        libelle="Poste"
        value={valeur.poste}
        onChangeText={(poste) => onChange({ ...valeur, poste })}
        erreur={erreurs.poste}
        autoCapitalize="sentences"
      />
      <ChampTexte
        libelle="Entreprise"
        value={valeur.entreprise}
        onChangeText={(entreprise) => onChange({ ...valeur, entreprise })}
        erreur={erreurs.entreprise}
        autoCapitalize="words"
      />
      <ChampTexte
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
      <ChampMultiligne
        libelle="Missions"
        aide="Une par ligne, à l'infinitif. Ex. : Conseiller les clients."
        lignes={5}
        value={valeur.missions.join("\n")}
        onChangeText={(texte) =>
          onChange({ ...valeur, missions: texte.split("\n").map((m) => m.trimStart()) })
        }
        onBlur={() =>
          onChange({
            ...valeur,
            missions: valeur.missions.map((m) => m.trim()).filter((m) => m !== ""),
          })
        }
        erreur={erreurs.missions}
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
      <ChampTexte
        libelle="Diplôme ou formation"
        value={valeur.diplome}
        onChangeText={(diplome) => onChange({ ...valeur, diplome })}
        erreur={erreurs.diplome}
        autoCapitalize="sentences"
      />
      <ChampTexte
        libelle="Établissement"
        value={valeur.ecole}
        onChangeText={(ecole) => onChange({ ...valeur, ecole })}
        erreur={erreurs.ecole}
        autoCapitalize="words"
      />
      <ChampTexte
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
  onChange,
  onValider,
  onFermer,
}: {
  section: "experiences" | "educations";
  valeur: ElementListe | null;
  nouveau: boolean;
  erreurs: Erreurs;
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
                className="min-h-touch flex-row items-center gap-1"
                accessibilityRole="button"
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
