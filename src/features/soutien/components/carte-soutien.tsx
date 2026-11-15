/** Présente Karria sans pub et le café, avec les états de paiement du profil. */

import { useState } from "react";

import { MessageErreur } from "@/components/message-erreur";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import type { Soutien } from "../hooks/use-soutien";
import { TEXTES } from "../services/presentation";
import { FeuilleSansPub } from "./feuille-sans-pub";
import { SurfaceCafe } from "./surface-cafe";
import { SurfaceSansPub } from "./surface-sans-pub";

function Intro({ phrase }: { phrase?: string }) {
  return (
    <VStack className="gap-1.5 px-1">
      <Texte
        accessibilityRole="header"
        className="font-display text-title text-foreground"
      >
        {TEXTES.sectionTitre}
      </Texte>
      {phrase === undefined ? null : (
        <Texte className="text-footnote leading-5 text-muted-foreground">{phrase}</Texte>
      )}
    </VStack>
  );
}

interface Props {
  soutien: Soutien;
  /** Arrivé depuis « Masquer les annonces » : ouvre l'offre d'emblée. */
  ouvrirOffre?: boolean;
  /** Prévenu quand la feuille ouverte d'emblée se referme, pour oublier la demande. */
  onOffreOuverte?: () => void;
}

export function CarteSoutien({ soutien, ouvrirOffre = false, onOffreOuverte }: Props) {
  // L'ouverture de la feuille : un état de vue, rien de plus.
  const [feuille, setFeuille] = useState(false);
  const { catalogue, actif, erreur } = soutien;
  const dejaSansPub = soutien.facturation?.sansPub.actif ?? false;

  // Arrivé depuis une annonce : la feuille est ouverte d'emblée, tant que
  // la demande n'est pas refermée (qui l'oublie alors côté route).
  const demandee = ouvrirOffre && catalogue !== null && actif && !dejaSansPub;
  const fermer = () => {
    setFeuille(false);
    if (ouvrirOffre) onOffreOuverte?.();
  };

  if (catalogue === null) {
    return (
      <VStack className="gap-4">
        <Box className="h-6 w-40 rounded-full bg-remplissage-doux" />
        <Box className="h-52 w-full rounded-carte bg-surface-premium" />
        <Box className="h-16 w-full rounded-carte bg-surface-chaleur" />
      </VStack>
    );
  }

  if (!actif) {
    return <Intro phrase={TEXTES.sectionSansPaiement} />;
  }

  return (
    <VStack className="gap-4">
      <Intro />
      <SurfaceSansPub soutien={soutien} onVoir={() => setFeuille(true)} />
      <SurfaceCafe soutien={soutien} />
      {erreur !== null ? (
        <MessageErreur
          message={erreur}
          action={soutien.effacerErreur}
          libelleAction="Compris"
        />
      ) : null}
      <FeuilleSansPub visible={feuille || demandee} soutien={soutien} onFermer={fermer} />
    </VStack>
  );
}
