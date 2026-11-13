/**
 * L'entrée « Karria sans pub » du profil — et son état quand on l'est.
 *
 * ═══ Une proposition par surface ═══
 *
 * Avant l'abonnement : la carte vedette de la section, construite comme
 * l'entrée d'un bon écran d'abonnement (refonte du 2026-11-13, Marc :
 * « qui appelle le plus de conversion possible ») — l'étiquette dorée
 * « Karria sans pub », un titre qui dit le bénéfice, le mini-fil où
 * l'annonce s'efface, le prix en grand ramené au jour, et **un bouton d'or
 * plein** qui ouvre la feuille (`feuille-sans-pub.tsx`). Avant, la carte
 * entière était touchable sans bouton : on ne voyait pas qu'il fallait
 * appuyer. Toute la carte reste touchable, le bouton dit quoi faire.
 *
 * Pendant le paiement, la même surface dit où l'on en est (« Ouverture… »,
 * « On attend la confirmation… ») : on ne perd pas sa place.
 *
 * Une fois sans pub : « Tu es sans pub », la coche d'or, la phrase d'état
 * (renouvellement, résiliation, prélèvement en échec) et « Gérer mon
 * abonnement » — le portail Stripe. Un état valorisant, pas un reçu.
 */

import { Pressable } from "react-native";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";
import { euros } from "@/lib/monnaie";
import { PREMIUM_TEXTE, SUR_PREMIUM } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import { etatSansPub, prixParJour, TEXTES } from "../services/presentation";
import { MiniFil } from "./mini-fil";

interface Props {
  soutien: Soutien;
  /** Ouvre la feuille qui présente l'offre. */
  onVoir: () => void;
}

export function SurfaceSansPub({ soutien, onVoir }: Props) {
  const couleurs = useCouleurs();
  const or = PREMIUM_TEXTE[couleurs.mode];
  const { catalogue, facturation, phase } = soutien;
  if (catalogue === null) return null;

  const sansPub = facturation?.sansPub ?? null;

  // ── Déjà sans pub ──
  if (sansPub !== null && sansPub.actif) {
    const etat = etatSansPub(sansPub);
    const portail = phase === "portail";
    return (
      <VStack className="gap-3 rounded-carte border border-border-premium bg-surface-premium p-5">
        <HStack className="items-center gap-2.5">
          <Box className="h-9 w-9 items-center justify-center rounded-full bg-card">
            <Icone nom="coche" couleur={or} taille={16} graisse="bold" />
          </Box>
          <Texte
            accessibilityRole="header"
            className="flex-1 font-display text-title-sm text-foreground"
          >
            {TEXTES.sansPubActifTitre}
          </Texte>
        </HStack>
        <Texte
          className={`text-body leading-6 ${etat.alerte ? "text-warning" : "text-muted-foreground"}`}
          accessibilityRole={etat.alerte ? "alert" : "text"}
        >
          {etat.texte}
        </Texte>
        <Pressable
          onPress={soutien.gerer}
          disabled={phase !== "repos" || sansPub.gerable === false}
          className="min-h-touch flex-row items-center gap-2 self-start"
          accessibilityRole="button"
          accessibilityLabel={TEXTES.sansPubGerer}
          accessibilityState={{ disabled: phase !== "repos", busy: portail }}
        >
          {portail ? <Spinner size="small" /> : null}
          <Texte className="font-bold text-body text-premium-texte">
            {portail ? TEXTES.ouverture : TEXTES.sansPubGerer}
          </Texte>
          {portail ? null : (
            <Icone nom="suivant" couleur={or} taille={12} graisse="bold" />
          )}
        </Pressable>
      </VStack>
    );
  }

  // ── L'invitation, ou l'attente du paiement en cours ──
  const enCours = phase !== "repos" && !soutien.cafeEnCours;
  const centimes = catalogue.sansPub.prixCentimes;
  return (
    <Pressable
      onPress={onVoir}
      disabled={enCours}
      className="gap-5 overflow-hidden rounded-carte border border-border-premium bg-surface-premium p-5 active:opacity-90"
      // La carte entière répond au doigt ; au lecteur d'écran, on lit ses
      // textes un à un puis le bouton, qui seul porte l'action.
      accessible={false}
    >
      <VStack className="gap-2">
        <HStack className="items-center gap-1.5 self-start rounded-full bg-card px-2.5 py-1">
          <Icone nom="couronne" couleur={or} taille={11} graisse="bold" />
          <Texte className="text-caption font-bold uppercase tracking-wide text-premium-texte">
            {TEXTES.sansPubEtiquette}
          </Texte>
        </HStack>
        <Texte
          accessibilityRole="header"
          className="font-display text-title leading-8 tracking-tight text-foreground"
        >
          {TEXTES.sansPubTitre}
        </Texte>
        <Texte className="text-footnote leading-5 text-muted-foreground">
          {TEXTES.sansPubAccroche}
        </Texte>
      </VStack>

      <Box className="px-1">
        <MiniFil />
      </Box>

      <HStack className="items-end justify-between gap-3">
        <VStack className="gap-0.5">
          <HStack className="items-baseline gap-1">
            <Texte className="font-display text-title text-foreground">
              {euros(centimes)}
            </Texte>
            <Texte className="text-footnote text-muted-foreground">/ mois</Texte>
          </HStack>
          <Texte className="text-caption text-muted-foreground">
            {prixParJour(centimes)}
          </Texte>
        </VStack>
        <Texte className="pb-0.5 text-right text-caption font-bold text-premium-texte">
          {TEXTES.garanties[0]}
        </Texte>
      </HStack>

      <BoutonAction
        libelle={TEXTES.sansPubBouton}
        ton="premium"
        enCours={enCours}
        libelleEnCours={phase === "confirmation" ? TEXTES.attente : TEXTES.ouverture}
        iconeFin={
          <Icone
            nom="suivant"
            couleur={SUR_PREMIUM[couleurs.mode]}
            taille={13}
            graisse="bold"
          />
        }
        onPress={onVoir}
      />
    </Pressable>
  );
}
