/**
 * Compétences, langues, centres d'intérêt : des pastilles qu'on ajoute et
 * qu'on retire, avec un niveau choisi au toucher.
 *
 * ═══ Un champ, une pastille ═══
 *
 * On tape un mot, on touche « Terminé » (ou la coche), la pastille apparaît
 * avec le niveau par défaut (« Intermédiaire », « B2 ») ; toucher la
 * pastille fait tourner le niveau ; la croix la retire. Aucun menu : sur
 * une liste de vingt compétences, un sélecteur par ligne serait un mur.
 * Les briques (`Puce`, `ChampAjout`) sont celles des missions ; ici le
 * champ reste ouvert, c'est l'action principale de l'écran, et il propose
 * les compétences et les langues connues (`GET /cv/suggestions`).
 */

import { useState } from "react";

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

import type {
  Competences,
  Interets,
  NiveauCompetence,
  NiveauLangue,
  TypeSuggestion,
} from "../../types/cv.types";
import { ChampAjout, Puce } from "./liste-puces";

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

function Ajout({
  libelle,
  placeholder,
  suggestions,
  onAjouter,
}: {
  libelle: string;
  placeholder: string;
  suggestions?: TypeSuggestion;
  onAjouter: (texte: string) => void;
}) {
  const [texte, setTexte] = useState("");
  return (
    <ChampAjout
      libelle={libelle}
      placeholder={placeholder}
      valeur={texte}
      onChangeText={setTexte}
      suggestions={suggestions}
      onValider={(propre) => {
        onAjouter(propre);
        setTexte("");
      }}
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
          suggestions="skill"
          onAjouter={(nom) =>
            onChange({
              ...valeur,
              competences: [...valeur.competences, { nom, niveau: "Intermédiaire" }],
            })
          }
        />
        <HStack className="flex-wrap gap-2">
          {valeur.competences.map((c, i) => (
            <Puce
              key={`${c.nom}-${i}`}
              texte={c.nom}
              detail={c.niveau}
              indicationToucher="Change le niveau"
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
          suggestions="language"
          onAjouter={(langue) =>
            onChange({
              ...valeur,
              langues: [...valeur.langues, { langue, niveau: "B2" }],
            })
          }
        />
        <HStack className="flex-wrap gap-2">
          {valeur.langues.map((l, i) => (
            <Puce
              key={`${l.langue}-${i}`}
              texte={l.langue}
              detail={l.niveau}
              indicationToucher="Change le niveau"
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
          <Puce
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
