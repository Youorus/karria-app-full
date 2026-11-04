/**
 * Compétences, langues, centres d'intérêt : des pastilles qu'on ajoute et
 * qu'on retire, avec un niveau choisi au toucher.
 *
 * ═══ Un champ, une pastille ═══
 *
 * On tape un mot, on touche « Ajouter » (ou Entrée), la pastille apparaît
 * avec le niveau par défaut (« Intermédiaire », « B2 ») ; toucher la
 * pastille fait tourner le niveau ; la croix la retire. Aucun menu : sur
 * une liste de vingt compétences, un sélecteur par ligne serait un mur.
 */

import { useState } from "react";
import { Pressable } from "react-native";

import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type {
  Competences,
  Interets,
  NiveauCompetence,
  NiveauLangue,
} from "../../types/cv.types";

export const NIVEAUX_COMPETENCE: readonly NiveauCompetence[] = [
  "Débutant",
  "Intermédiaire",
  "Avancé",
  "Expert",
];
export const NIVEAUX_LANGUE: readonly NiveauLangue[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "Natif",
];

function suivant<T>(liste: readonly T[], courant: T): T {
  const i = liste.indexOf(courant);
  return liste[(i + 1) % liste.length];
}

function Pastille({
  texte,
  niveau,
  onToucher,
  onRetirer,
}: {
  texte: string;
  niveau?: string;
  onToucher?: () => void;
  onRetirer: () => void;
}) {
  const couleurs = useCouleurs();
  return (
    <HStack className="items-center rounded-full bg-card pl-3">
      <Pressable
        onPress={onToucher}
        disabled={onToucher === undefined}
        className="min-h-[40px] flex-row items-center gap-1.5 py-1"
        accessibilityRole="button"
        accessibilityLabel={
          niveau ? `${texte}, ${niveau}. Toucher pour changer le niveau` : texte
        }
      >
        <Texte className="text-footnote text-foreground">{texte}</Texte>
        {niveau ? (
          <Texte className="font-bold text-caption text-primary">{niveau}</Texte>
        ) : null}
      </Pressable>
      <Pressable
        onPress={onRetirer}
        className="h-10 w-9 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${texte}`}
      >
        <Icone nom="fermer" couleur={couleurs.estompe} taille={11} graisse="semibold" />
      </Pressable>
    </HStack>
  );
}

function Ajout({
  libelle,
  placeholder,
  onAjouter,
}: {
  libelle: string;
  placeholder: string;
  onAjouter: (texte: string) => void;
}) {
  const couleurs = useCouleurs();
  const [texte, setTexte] = useState("");
  const ajouter = () => {
    const propre = texte.trim();
    if (propre === "") return;
    onAjouter(propre);
    setTexte("");
  };
  return (
    <ChampTexte
      libelle={libelle}
      placeholder={placeholder}
      value={texte}
      onChangeText={setTexte}
      onSubmitEditing={ajouter}
      blurOnSubmit={false}
      returnKeyType="done"
      autoCapitalize="sentences"
      accessoire={
        <Pressable
          onPress={ajouter}
          disabled={texte.trim() === ""}
          className="h-10 flex-row items-center gap-1 pl-2"
          accessibilityRole="button"
          accessibilityLabel="Ajouter"
        >
          <Icone
            nom="ajouter"
            couleur={texte.trim() === "" ? couleurs.estompe : couleurs.primaire}
            taille={15}
            graisse="semibold"
          />
        </Pressable>
      }
    />
  );
}

export function FormulaireCompetences({
  valeur,
  onChange,
}: {
  valeur: Competences;
  onChange: (v: Competences) => void;
}) {
  return (
    <VStack className="gap-6">
      <VStack className="gap-3">
        <Ajout
          libelle="Compétences"
          placeholder="Ex. : Vente, Excel, Travail en équipe"
          onAjouter={(nom) =>
            onChange({
              ...valeur,
              competences: [...valeur.competences, { nom, niveau: "Intermédiaire" }],
            })
          }
        />
        <HStack className="flex-wrap gap-2">
          {valeur.competences.map((c, i) => (
            <Pastille
              key={`${c.nom}-${i}`}
              texte={c.nom}
              niveau={c.niveau}
              onToucher={() =>
                onChange({
                  ...valeur,
                  competences: valeur.competences.map((x, j) =>
                    j === i ? { ...x, niveau: suivant(NIVEAUX_COMPETENCE, x.niveau) } : x,
                  ),
                })
              }
              onRetirer={() =>
                onChange({
                  ...valeur,
                  competences: valeur.competences.filter((_, j) => j !== i),
                })
              }
            />
          ))}
        </HStack>
        <Texte className="text-caption text-foreground-faint">
          Touche une compétence pour changer son niveau.
        </Texte>
      </VStack>
      <VStack className="gap-3">
        <Ajout
          libelle="Langues"
          placeholder="Ex. : Anglais"
          onAjouter={(langue) =>
            onChange({
              ...valeur,
              langues: [...valeur.langues, { langue, niveau: "B2" }],
            })
          }
        />
        <HStack className="flex-wrap gap-2">
          {valeur.langues.map((l, i) => (
            <Pastille
              key={`${l.langue}-${i}`}
              texte={l.langue}
              niveau={l.niveau}
              onToucher={() =>
                onChange({
                  ...valeur,
                  langues: valeur.langues.map((x, j) =>
                    j === i ? { ...x, niveau: suivant(NIVEAUX_LANGUE, x.niveau) } : x,
                  ),
                })
              }
              onRetirer={() =>
                onChange({ ...valeur, langues: valeur.langues.filter((_, j) => j !== i) })
              }
            />
          ))}
        </HStack>
      </VStack>
    </VStack>
  );
}

export function FormulaireInterets({
  valeur,
  onChange,
}: {
  valeur: Interets;
  onChange: (v: Interets) => void;
}) {
  return (
    <VStack className="gap-3">
      <Ajout
        libelle="Centres d'intérêt"
        placeholder="Ex. : Danse, Bénévolat, Photo"
        onAjouter={(nom) =>
          onChange({ interets: [...valeur.interets, { nom, categorie: null }] })
        }
      />
      <HStack className="flex-wrap gap-2">
        {valeur.interets.map((it, i) => (
          <Pastille
            key={`${it.nom}-${i}`}
            texte={it.nom}
            onRetirer={() =>
              onChange({ interets: valeur.interets.filter((_, j) => j !== i) })
            }
          />
        ))}
      </HStack>
    </VStack>
  );
}
