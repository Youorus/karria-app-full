/**
 * Modifier un élément de la feuille — le formulaire du CV, limité à lui.
 *
 * ═══ Ce qu'on voit ═══
 *
 * La feuille pleine (clavier) avec **le formulaire existant** de la section
 * touchée (`cv/components/edition`) : validations, suggestions à la saisie,
 * sélecteur de mois, puces de missions — rien de réécrit. En tête, le nom
 * de l'élément et « Enregistrer » (grisé tant qu'une incohérence est
 * signalée). Si Karria a une proposition pour cet élément, elle est
 * là, avant/après, à accepter ou refuser.
 *
 * ═══ Sans cible ═══
 *
 * Depuis le bouton « Modifier » de la barre, sans élément touché : la liste
 * des sections, pour qui ne devine pas qu'on peut toucher la feuille.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type {
  Decision,
  Proposition,
} from "@/features/candidatures/types/candidatures.types";
import {
  FormulaireExperience,
  FormulaireFormation,
} from "@/features/cv/components/edition/formulaires-elements";
import {
  FormulaireCompetences,
  FormulaireInterets,
} from "@/features/cv/components/edition/formulaires-listes-courtes";
import {
  FormulaireContact,
  FormulaireIdentite,
  FormulairePresentation,
} from "@/features/cv/components/edition/formulaires-simples";
import { TITRES } from "@/features/cv/hooks/use-modifier-cv";
import type { Cv } from "@/features/cv/types/cv.types";
import { useCouleurs } from "@/theme/use-couleurs";

import { useEditionElement } from "../hooks/use-edition-element";
import type { EditionElement } from "../hooks/use-edition-element";
import type { Cible } from "../services/chemins";
import { CarteProposition } from "./carte-proposition";
import { FeuilleBasse } from "./feuille-basse";

const SECTIONS: { cible: Cible; libelle: string }[] = [
  { cible: { section: "identity" }, libelle: TITRES.identity },
  { cible: { section: "contact" }, libelle: TITRES.contact },
  { cible: { section: "summary" }, libelle: TITRES.summary },
  { cible: { section: "skills" }, libelle: TITRES.skills },
  { cible: { section: "interests" }, libelle: TITRES.interests },
];

function ListeDesSections({ cv, onChoisir }: { cv: Cv; onChoisir: (c: Cible) => void }) {
  const couleurs = useCouleurs();
  const lignes: { cible: Cible; libelle: string; detail?: string }[] = [
    ...SECTIONS,
    ...cv.experiences.map((e, index) => ({
      cible: { section: "experiences", index } as Cible,
      libelle: e.poste || "Expérience",
      detail: e.entreprise,
    })),
    ...cv.formations.map((f, index) => ({
      cible: { section: "educations", index } as Cible,
      libelle: f.diplome || "Formation",
      detail: f.ecole,
    })),
  ];
  return (
    <VStack className="gap-2">
      <Texte className="text-footnote text-muted-foreground">
        Tu peux aussi toucher directement un élément de la feuille.
      </Texte>
      {lignes.map((l, i) => (
        <Pressable
          key={i}
          onPress={() => onChoisir(l.cible)}
          className="min-h-touch flex-row items-center justify-between rounded-carte border border-border-subtle bg-card px-4 py-3"
          accessibilityRole="button"
        >
          <VStack className="flex-1">
            <Texte className="font-bold text-body text-foreground">{l.libelle}</Texte>
            {l.detail ? (
              <Texte className="text-footnote text-muted-foreground">{l.detail}</Texte>
            ) : null}
          </VStack>
          <Icone nom="suivant" couleur={couleurs.estompe} taille={14} />
        </Pressable>
      ))}
    </VStack>
  );
}

function Formulaire({ e }: { e: EditionElement }) {
  const v = e.valeur;
  if (v === null) return null;
  if (v.genre === "element") {
    return v.section === "experiences" && "poste" in v.valeur ? (
      <FormulaireExperience
        valeur={v.valeur}
        onChange={e.changerElement}
        erreurs={e.erreurs}
      />
    ) : v.section === "educations" && "diplome" in v.valeur ? (
      <FormulaireFormation
        valeur={v.valeur}
        onChange={e.changerElement}
        erreurs={e.erreurs}
      />
    ) : null;
  }
  switch (v.valeur.section) {
    case "identity":
      return (
        <FormulaireIdentite
          valeur={v.valeur.valeur}
          onChange={e.changerSection}
          erreurs={e.erreurs}
        />
      );
    case "contact":
      return (
        <FormulaireContact
          valeur={v.valeur.valeur}
          onChange={e.changerSection}
          erreurs={e.erreurs}
        />
      );
    case "summary":
      return (
        <FormulairePresentation
          valeur={v.valeur.valeur}
          onChange={e.changerSection}
          erreurs={e.erreurs}
        />
      );
    case "skills":
      return (
        <FormulaireCompetences valeur={v.valeur.valeur} onChange={e.changerSection} />
      );
    case "interests":
      return <FormulaireInterets valeur={v.valeur.valeur} onChange={e.changerSection} />;
    default:
      return null;
  }
}

interface Props {
  visible: boolean;
  cible: Cible | null;
  cv: Cv | null;
  propositions: Proposition[];
  decision: string | null;
  onSection: Parameters<typeof useEditionElement>[3];
  onElement: Parameters<typeof useEditionElement>[4];
  onChoisirCible: (c: Cible) => void;
  onDecider: (p: Proposition, d: Decision) => void;
  onFermer: () => void;
}

/**
 * La feuille est recréée à chaque cible (`key={cleDeCible(cible)}` chez
 * l'appelant) : le formulaire part toujours du CV courant.
 */
export function FeuilleModifier({
  visible,
  cible,
  cv,
  propositions,
  decision,
  onSection,
  onElement,
  onChoisirCible,
  onDecider,
  onFermer,
}: Props) {
  const edition = useEditionElement(cible, cv, propositions, onSection, onElement);
  const sansCible = cible === null;
  return (
    <FeuilleBasse
      visible={visible}
      hauteur="pleine"
      titre={sansCible ? "Que veux-tu modifier ?" : edition.titre}
      onFermer={onFermer}
      action={
        sansCible
          ? null
          : {
              libelle: "Enregistrer",
              desactive: edition.bloque || !edition.modifie,
              onPress: () => {
                if (edition.enregistrer()) onFermer();
              },
            }
      }
    >
      {sansCible && cv !== null ? (
        <ListeDesSections cv={cv} onChoisir={onChoisirCible} />
      ) : (
        <>
          {edition.propositions.length > 0 ? (
            <VStack className="gap-3">
              <HStack className="items-center gap-2">
                <Box className="h-1.5 w-1.5 rounded-full bg-primary" />
                <Texte className="font-bold text-footnote text-foreground">
                  Karria propose
                </Texte>
              </HStack>
              {edition.propositions.map((p) => (
                <CarteProposition
                  key={p.id}
                  proposition={p}
                  occupee={decision === p.id}
                  bloquee={decision !== null}
                  onDecider={(d) => onDecider(p, d)}
                />
              ))}
            </VStack>
          ) : null}
          <Formulaire e={edition} />
        </>
      )}
    </FeuilleBasse>
  );
}
