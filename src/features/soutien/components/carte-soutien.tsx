/**
 * La section « Soutenir Karria » du profil : deux surfaces, chacune une
 * proposition.
 *
 * ═══ Le parti pris (refonte du 2026-11-04) ═══
 *
 * L'ancienne carte empilait un mot de l'équipe, l'abonnement, les cafés et
 * Stripe dans une seule enveloppe : « tout bourré en un » (Marc). Ici, un
 * titre de section et une phrase, puis :
 *
 * - **« Karria sans pub »** (`surface-sans-pub.tsx`), dorée : la carte
 *   vedette, avec son prix et son bouton d'or, qui ouvre la feuille
 *   (`feuille-sans-pub.tsx`) ; ou, quand on l'est, l'état « Tu es sans pub » ;
 * - **« Nous offrir un café »** (`surface-cafe.tsx`), crème et caramel : un
 *   geste à part, ludique, en deux touchers.
 *
 * Le hook `use-soutien.ts` et l'API ne changent pas : seule la présentation
 * bouge. La feuille est un état purement visuel de cette carte.
 *
 * ═══ Les états ═══
 *
 * - squelette tant que le catalogue n'est pas lu ;
 * - interrupteur du serveur éteint : le titre et une phrase, sans paiement ;
 * - une erreur (page qui ne s'ouvre pas, paiement non confirmé) s'affiche
 *   sous les surfaces, avec « Compris ».
 */

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

function Intro({ phrase }: { phrase: string }) {
  return (
    <VStack className="gap-1.5 px-1">
      <Texte
        accessibilityRole="header"
        className="font-display text-title text-foreground"
      >
        {TEXTES.sectionTitre}
      </Texte>
      <Texte className="text-footnote leading-5 text-muted-foreground">{phrase}</Texte>
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
        <Box className="h-80 w-full rounded-carte bg-surface-premium" />
        <Box className="h-56 w-full rounded-carte bg-surface-chaleur" />
      </VStack>
    );
  }

  if (!actif) {
    return <Intro phrase={TEXTES.sectionSansPaiement} />;
  }

  return (
    <VStack className="gap-4">
      <Intro phrase={TEXTES.sectionPhrase} />
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
