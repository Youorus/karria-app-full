/**
 * L'entrée « Karria sans pub » du profil — et son état quand on l'est.
 *
 * ═══ Une proposition par surface ═══
 *
 * Avant l'abonnement : une seule surface touchable, dorée et calme — le
 * mini-fil où l'annonce s'efface, le titre, le prix et la promesse « sans
 * engagement » — qui ouvre la feuille (`feuille-sans-pub.tsx`). Pas de
 * bouton ici : la surface **est** l'invitation, et le seul bouton bleu de
 * ce parcours vit dans la feuille, là où l'on décide.
 *
 * Pendant le paiement, la même surface dit où l'on en est (« Ouverture… »,
 * « On attend la confirmation… ») : on ne perd pas sa place.
 *
 * Une fois sans pub : « Tu es sans pub », la coche d'or, la phrase d'état
 * (renouvellement, résiliation, prélèvement en échec) et « Gérer mon
 * abonnement » — le portail Stripe. Un état valorisant, pas un reçu.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { VStack } from "@/components/ui/vstack";
import { PREMIUM_TEXTE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Soutien } from "../hooks/use-soutien";
import { etatSansPub, prixParMois, TEXTES } from "../services/presentation";
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
  const prix = prixParMois(catalogue.sansPub.prixCentimes);
  return (
    <Pressable
      onPress={onVoir}
      disabled={enCours}
      className="gap-4 rounded-carte border border-border-premium bg-surface-premium p-5 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={`${TEXTES.sansPubTitre} ${prix}. ${TEXTES.sansPubPromesse}`}
      accessibilityHint={TEXTES.sansPubVoir}
      accessibilityState={{ disabled: enCours, busy: enCours }}
    >
      <Box className="px-2 pt-1">
        <MiniFil />
      </Box>
      <VStack className="gap-1">
        <Texte className="font-display text-title-sm text-foreground">
          {TEXTES.sansPubTitre}
        </Texte>
        {enCours ? (
          <HStack className="items-center gap-2 pt-1">
            <Spinner size="small" />
            <Texte className="flex-1 text-footnote text-muted-foreground">
              {phase === "confirmation" ? TEXTES.attente : TEXTES.ouverture}
            </Texte>
          </HStack>
        ) : (
          <HStack className="items-center gap-2">
            <Texte className="flex-1 text-footnote leading-5 text-muted-foreground">
              <Texte className="font-bold text-premium-texte">{prix}</Texte>
              {" · "}
              {TEXTES.sansPubPromesse}
            </Texte>
            <Icone nom="suivant" couleur={or} taille={13} graisse="bold" />
          </HStack>
        )}
      </VStack>
    </Pressable>
  );
}
