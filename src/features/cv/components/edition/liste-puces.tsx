/**
 * Une liste de courtes valeurs — des missions, des compétences — qu'on
 * ajoute une à une, sous forme de puces.
 *
 * ═══ Une à la fois ═══
 *
 * On ne cite pas tout d'un coup. « Ajouter une mission » ouvre un champ ;
 * « Terminé » au clavier (ou le bouton) pose la puce et laisse le champ
 * ouvert pour la suivante ; vide, il se referme. Chaque puce se retire
 * d'une croix et se modifie en la touchant : le champ se remplit de son
 * texte, « Terminé » la remplace à sa place.
 *
 * ═══ Pas de réordonnancement ═══
 *
 * Deux flèches par puce doubleraient la hauteur de chaque ligne, et le
 * glisser demande un module natif (non ajouté). Retirer puis rajouter en
 * dernier fait le travail sur une liste de cinq missions.
 *
 * Trois briques exportées : `Puce` et `ChampAjout`, que les compétences et
 * les langues réutilisent avec leur niveau ; `ListePuces`, la liste
 * complète pour de simples chaînes.
 */

import { useRef, useState } from "react";
import { Pressable, type TextInput } from "react-native";

import { ChampTexte } from "@/components/champ-texte";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { TypeSuggestion } from "../../types/cv.types";
import { ChampAvecSuggestions } from "./champ-avec-suggestions";

export function Puce({
  texte,
  detail,
  actif = false,
  onToucher,
  onRetirer,
  indicationToucher,
}: {
  texte: string;
  /** Un niveau, affiché à côté (« B2 », « Avancé »). */
  detail?: string;
  /** Vrai pendant qu'on la modifie : elle se distingue des autres. */
  actif?: boolean;
  onToucher?: () => void;
  onRetirer: () => void;
  indicationToucher?: string;
}) {
  const couleurs = useCouleurs();
  return (
    <HStack
      className={`items-center rounded-full pl-3 ${actif ? "bg-surface-primary" : "bg-card"}`}
    >
      <Pressable
        onPress={onToucher}
        disabled={onToucher === undefined}
        className="min-h-[40px] max-w-[260px] flex-row items-center gap-1.5 py-1"
        accessibilityRole="button"
        accessibilityLabel={detail ? `${texte}, ${detail}` : texte}
        accessibilityHint={indicationToucher}
      >
        <Texte className="shrink text-footnote text-foreground" numberOfLines={2}>
          {texte}
        </Texte>
        {detail ? (
          <Texte className="font-bold text-caption text-primary">{detail}</Texte>
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

export function ChampAjout({
  libelle,
  placeholder,
  valeur,
  onChangeText,
  onValider,
  suggestions,
  autoFocus = false,
  libelleBouton = "Ajouter",
  aide,
  erreur,
  maxLength,
}: {
  libelle: string;
  placeholder?: string;
  valeur: string;
  onChangeText: (texte: string) => void;
  /** Appelé avec le texte propre, jamais vide. */
  onValider: (texte: string) => void;
  suggestions?: TypeSuggestion;
  autoFocus?: boolean;
  libelleBouton?: string;
  aide?: string;
  erreur?: string;
  maxLength?: number;
}) {
  const couleurs = useCouleurs();
  const champ = useRef<TextInput>(null);
  const propre = valeur.trim();
  const valider = () => {
    if (propre === "") return;
    onValider(propre);
    champ.current?.focus();
  };
  const accessoire = (
    <Pressable
      onPress={valider}
      disabled={propre === ""}
      className="h-10 flex-row items-center gap-1 pl-2"
      accessibilityRole="button"
      accessibilityLabel={libelleBouton}
      accessibilityState={{ disabled: propre === "" }}
    >
      <Icone
        nom="coche"
        couleur={propre === "" ? couleurs.estompe : couleurs.primaire}
        taille={15}
        graisse="bold"
      />
    </Pressable>
  );
  const commun = {
    libelle,
    placeholder,
    value: valeur,
    onChangeText,
    onSubmitEditing: valider,
    blurOnSubmit: false,
    returnKeyType: "done" as const,
    autoCapitalize: "sentences" as const,
    autoFocus,
    accessoire,
    aide,
    erreur,
    maxLength,
  };
  return suggestions === undefined ? (
    <ChampTexte ref={champ} {...commun} />
  ) : (
    <ChampAvecSuggestions ref={champ} kind={suggestions} {...commun} />
  );
}

interface Props {
  libelle: string;
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  /** « Ajouter une mission ». */
  libelleAjout: string;
  placeholder?: string;
  aide?: string;
  erreur?: string;
  suggestions?: TypeSuggestion;
  max?: number;
  maxLongueur?: number;
}

export function ListePuces({
  libelle,
  valeurs,
  onChange,
  libelleAjout,
  placeholder,
  aide,
  erreur,
  suggestions,
  max,
  maxLongueur,
}: Props) {
  const couleurs = useCouleurs();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  /** L'index de la puce qu'on modifie, ou `null` quand on en ajoute une. */
  const [enEdition, setEnEdition] = useState<number | null>(null);
  const pleine = max !== undefined && valeurs.length >= max && enEdition === null;

  const fermer = () => {
    setOuvert(false);
    setTexte("");
    setEnEdition(null);
  };
  const valider = (propre: string) => {
    if (enEdition === null) {
      onChange([...valeurs, propre]);
      setTexte("");
      return;
    }
    onChange(valeurs.map((v, i) => (i === enEdition ? propre : v)));
    fermer();
  };
  const modifier = (index: number) => {
    setEnEdition(index);
    setTexte(valeurs[index] ?? "");
    setOuvert(true);
  };

  return (
    <VStack className="gap-3">
      {!ouvert ? (
        <Texte className="font-bold text-footnote text-foreground">{libelle}</Texte>
      ) : null}
      {valeurs.length > 0 ? (
        <HStack className="flex-wrap gap-2">
          {valeurs.map((v, i) => (
            <Puce
              key={`${v}-${i}`}
              texte={v}
              actif={enEdition === i}
              onToucher={() => modifier(i)}
              indicationToucher="Modifier"
              onRetirer={() => {
                onChange(valeurs.filter((_, j) => j !== i));
                if (enEdition === i) fermer();
              }}
            />
          ))}
        </HStack>
      ) : null}
      {ouvert ? (
        <VStack className="gap-2">
          <ChampAjout
            libelle={enEdition === null ? libelle : "Modifier"}
            placeholder={placeholder}
            valeur={texte}
            onChangeText={setTexte}
            onValider={valider}
            suggestions={suggestions}
            autoFocus
            libelleBouton={enEdition === null ? "Ajouter" : "Terminé"}
            aide={aide}
            erreur={erreur}
            maxLength={maxLongueur}
          />
          <Pressable
            onPress={fermer}
            className="min-h-touch self-start justify-center"
            accessibilityRole="button"
          >
            <Texte className="text-footnote text-muted-foreground">
              {enEdition === null ? "Fermer" : "Annuler la modification"}
            </Texte>
          </Pressable>
        </VStack>
      ) : (
        <>
          {!pleine ? (
            <Pressable
              onPress={() => setOuvert(true)}
              className="min-h-touch flex-row items-center gap-2 self-start"
              accessibilityRole="button"
            >
              <Icone
                nom="ajouter"
                couleur={couleurs.primaire}
                taille={15}
                graisse="semibold"
              />
              <Texte className="font-bold text-footnote text-primary">
                {libelleAjout}
              </Texte>
            </Pressable>
          ) : null}
          {erreur ? (
            <Texte className="text-footnote text-destructive" accessibilityRole="alert">
              {erreur}
            </Texte>
          ) : aide ? (
            <Texte className="text-footnote text-muted-foreground">{aide}</Texte>
          ) : null}
        </>
      )}
    </VStack>
  );
}
