/**
 * Une proposition de Karria : avant, après, pourquoi — et la décision.
 *
 * ═══ La forme ═══
 *
 * Deux blocs de texte, « Avant » barré d'un trait fin, « Après » en pleine
 * encre ; dessous la raison en une ligne, à la deuxième personne, telle que
 * le serveur la donne. Puis les gestes selon l'état : à relire → Accepter /
 * Refuser ; acceptée → « Appliquée · Revenir » ; refusée → « Refusée ·
 * Accepter ». Tout se défait ; rien n'est jamais perdu, `before` reste.
 *
 * Une proposition de **liste** (l'ordre des compétences) ne montre pas deux
 * textes mais deux suites de noms, dans l'ordre.
 */

import { Pressable } from "react-native";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type {
  Decision,
  Proposition,
  ValeurProposee,
} from "@/features/candidatures/types/candidatures.types";

import { TEXTES } from "../services/presentation";

function texteDe(v: ValeurProposee): string {
  if (typeof v === "string") return v;
  return v
    .map((e) => ("poste" in e ? `${e.poste} · ${e.entreprise}` : e.nom))
    .join("  ·  ");
}

function Bouton({
  libelle,
  principal = false,
  onPress,
  desactive,
}: {
  libelle: string;
  principal?: boolean;
  onPress: () => void;
  desactive: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={desactive}
      className={`h-10 flex-1 items-center justify-center rounded-full ${
        principal ? "bg-primary" : "border-[1.5px] border-border-champ bg-card"
      } ${desactive ? "opacity-50" : ""}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: desactive }}
    >
      <Texte
        className={`font-bold text-footnote ${principal ? "text-primary-foreground" : "text-foreground"}`}
      >
        {libelle}
      </Texte>
    </Pressable>
  );
}

interface Props {
  proposition: Proposition;
  occupee: boolean;
  bloquee: boolean;
  onDecider: (d: Decision) => void;
}

export function CarteProposition({ proposition: p, occupee, bloquee, onDecider }: Props) {
  const etat = p.etat;
  return (
    <VStack className="gap-3 rounded-carte border border-border-subtle bg-card p-4">
      <VStack className="gap-2">
        <VStack className="gap-0.5">
          <Texte className="text-caption text-foreground-faint">{TEXTES.avant}</Texte>
          <Texte className="text-footnote leading-5 text-muted-foreground line-through">
            {texteDe(p.avant) || "—"}
          </Texte>
        </VStack>
        <VStack className="gap-0.5">
          <Texte className="text-caption text-foreground-faint">{TEXTES.apres}</Texte>
          <Texte className="text-body leading-6 text-foreground">
            {texteDe(p.apres)}
          </Texte>
        </VStack>
      </VStack>
      <HStack className="items-center gap-2">
        <Box className="h-1 w-1 rounded-full bg-foreground-faint" />
        <Texte className="flex-1 text-footnote text-muted-foreground">{p.raison}</Texte>
      </HStack>
      {occupee ? (
        <Texte className="text-footnote text-muted-foreground">Un instant…</Texte>
      ) : etat === "proposee" ? (
        <HStack className="gap-2">
          <Bouton
            libelle={TEXTES.refuser}
            onPress={() => onDecider("refuser")}
            desactive={bloquee}
          />
          <Bouton
            libelle={TEXTES.accepter}
            principal
            onPress={() => onDecider("accepter")}
            desactive={bloquee}
          />
        </HStack>
      ) : (
        <HStack className="items-center justify-between">
          <Texte
            className={`font-bold text-footnote ${etat === "acceptee" ? "text-success" : "text-muted-foreground"}`}
          >
            {etat === "acceptee" ? "Appliquée" : "Refusée"}
          </Texte>
          <Pressable
            onPress={() => onDecider(etat === "acceptee" ? "revenir" : "accepter")}
            disabled={bloquee}
            className="min-h-touch justify-center"
            accessibilityRole="button"
          >
            <Texte className="font-bold text-footnote text-primary">
              {etat === "acceptee" ? TEXTES.revenirEnArriere : TEXTES.accepter}
            </Texte>
          </Pressable>
        </HStack>
      )}
    </VStack>
  );
}
