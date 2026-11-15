/** Présente les deux bénéfices de Karria sans pub et la gestion de l’abonnement. */

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
import { etatSansPub, TEXTES } from "../services/presentation";

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
    <VStack className="gap-4 rounded-carte border border-border-premium bg-surface-premium p-5">
      <HStack className="items-center gap-3">
        <Box className="h-10 w-10 items-center justify-center rounded-full bg-card">
          <Icone nom="couronne" couleur={or} taille={19} />
        </Box>
        <Texte
          accessibilityRole="header"
          className="flex-1 font-display text-title-sm text-foreground"
        >
          {TEXTES.sansPubEtiquette}
        </Texte>
      </HStack>
      <Texte className="text-body leading-6 text-foreground">
        {TEXTES.sansPubAccroche}
      </Texte>
      <Texte className="text-footnote text-muted-foreground">
        {euros(centimes)} / mois · Résiliable à tout moment
      </Texte>
      <BoutonAction
        libelle={TEXTES.sansPubBouton}
        ton="premium"
        enCours={enCours}
        desactive={phase !== "repos"}
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
    </VStack>
  );
}
