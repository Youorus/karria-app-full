/**
 * « Karria » : ce qu'elle propose pour cette offre, et les mots de l'offre.
 *
 * ═══ Demi-feuille : la page reste visible ═══
 *
 * Accepter une proposition change la feuille derrière, sous les yeux. Les
 * propositions à relire viennent en premier ; celles déjà appliquées
 * (intitulé, à-propos) et les refusées suivent, pour pouvoir revenir.
 * « Tout accepter » en tête, seulement s'il reste quelque chose à relire.
 *
 * ═══ La couverture, lisible ═══
 *
 * Les mots-clés de l'offre que le serveur lit dans le CV adapté, et ceux
 * qu'il n'y lit pas : deux rangées de pastilles, pas de pourcentage en
 * grand. Une phrase rappelle la règle : on n'ajoute un mot que s'il est vrai.
 */

import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import type {
  Couverture,
  Decision,
  Proposition,
} from "@/features/candidatures/types/candidatures.types";

import { TEXTES } from "../services/presentation";
import { CarteProposition } from "./carte-proposition";
import { FeuilleBasse } from "./feuille-basse";

function Pastilles({ mots, presentes }: { mots: string[]; presentes: boolean }) {
  if (mots.length === 0) return null;
  return (
    <HStack className="flex-wrap gap-2">
      {mots.map((m) => (
        <Texte
          key={m}
          className={`rounded-full px-3 py-1.5 text-footnote ${
            presentes
              ? "bg-surface-success font-bold text-foreground"
              : "border border-dashed border-border-champ text-muted-foreground"
          }`}
        >
          {m}
        </Texte>
      ))}
    </HStack>
  );
}

interface Props {
  visible: boolean;
  propositions: Proposition[];
  couverture: Couverture | null;
  decision: string | null;
  onDecider: (p: Proposition, d: Decision) => void;
  onToutAccepter: () => void;
  onFermer: () => void;
}

export function FeuilleKarria({
  visible,
  propositions,
  couverture,
  decision,
  onDecider,
  onToutAccepter,
  onFermer,
}: Props) {
  const aRelire = propositions.filter((p) => p.etat === "proposee");
  const decidees = propositions.filter((p) => p.etat !== "proposee");
  return (
    <FeuilleBasse
      visible={visible}
      titre={TEXTES.propositionsTitre}
      onFermer={onFermer}
      action={
        aRelire.length > 1
          ? {
              libelle: TEXTES.toutAccepter,
              onPress: onToutAccepter,
              desactive: decision !== null,
            }
          : null
      }
    >
      {propositions.length === 0 ? (
        <Texte className="text-body leading-6 text-muted-foreground">
          {TEXTES.propositionsVide}
        </Texte>
      ) : null}
      {[...aRelire, ...decidees].map((p) => (
        <CarteProposition
          key={p.id}
          proposition={p}
          occupee={decision === p.id || decision === "toutes"}
          bloquee={decision !== null}
          onDecider={(d) => onDecider(p, d)}
        />
      ))}
      {couverture !== null &&
      couverture.presents.length + couverture.manquants.length > 0 ? (
        <VStack className="gap-3 pt-2">
          <Texte className="font-display text-callout text-foreground">
            {TEXTES.couvertureTitre}
          </Texte>
          <Texte className="text-footnote leading-5 text-muted-foreground">
            {TEXTES.couverturePhrase}
          </Texte>
          {couverture.presents.length > 0 ? (
            <VStack className="gap-2">
              <Texte className="text-caption text-foreground-faint">
                {TEXTES.couverturePresents}
              </Texte>
              <Pastilles mots={couverture.presents} presentes />
            </VStack>
          ) : null}
          {couverture.manquants.length > 0 ? (
            <VStack className="gap-2">
              <Texte className="text-caption text-foreground-faint">
                {TEXTES.couvertureManquants}
              </Texte>
              <Pastilles mots={couverture.manquants} presentes={false} />
            </VStack>
          ) : null}
        </VStack>
      ) : null}
    </FeuilleBasse>
  );
}
