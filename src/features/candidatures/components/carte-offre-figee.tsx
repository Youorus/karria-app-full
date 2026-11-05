/**
 * L'offre telle que le dossier l'a figée — compacte, et toujours là.
 *
 * Même si l'annonce a quitté l'index, on relit ce à quoi on a répondu :
 * la tuile, le titre, l'entreprise, la ville, le contrat, la date de
 * publication, et les premières lignes. « Voir l'offre » ouvre sa fiche
 * tant qu'elle existe ; sinon la source (où l'on a postulé), et le texte
 * le dit — « Cette offre n'est plus en ligne » n'est pas une erreur, c'est
 * une information que la pochette garde.
 */

import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { TuileEntreprise } from "@/features/offres/components/tuile-entreprise";
import { useCouleurs } from "@/theme/use-couleurs";

import { dateCourte, extrait } from "../services/presentation";
import type { OffreFigee } from "../types/candidatures.types";

interface Props {
  offre: OffreFigee;
  /** `null` tant qu'on ne sait pas. */
  dansLIndex: boolean | null;
  maintenant: Date;
  onOuvrir: () => void;
}

export function CarteOffreFigee({ offre, dansLIndex, maintenant, onOuvrir }: Props) {
  const couleurs = useCouleurs();
  const details = [offre.ville, offre.contrat].filter((d): d is string => d !== null);
  const publiee = dateCourte(offre.publieeLe, maintenant);
  const lien =
    dansLIndex !== false
      ? "Voir l'offre"
      : offre.lienCandidature !== null || offre.siteEntreprise !== null
        ? "Voir la source"
        : null;

  return (
    <VStack className="rounded-carte border border-border-subtle bg-card p-4">
      <HStack space="md" className="items-center">
        <TuileEntreprise
          logo={offre.logo}
          entreprise={offre.entreprise}
          teinte={offre.id}
          taille="carte"
        />
        <VStack className="flex-1">
          <Texte
            className="font-medium text-caption uppercase tracking-widest text-muted-foreground"
            numberOfLines={1}
          >
            {offre.entreprise ?? "Entreprise"}
          </Texte>
          <Texte className="font-bold text-body text-foreground" numberOfLines={2}>
            {offre.titre}
          </Texte>
        </VStack>
      </HStack>

      {details.length > 0 || publiee !== null ? (
        <HStack className="mt-3 items-center justify-between">
          <Texte className="shrink text-footnote text-muted-foreground" numberOfLines={1}>
            {details.join(" · ")}
          </Texte>
          {publiee !== null ? (
            <Texte className="text-footnote text-foreground-faint">
              Publiée {publiee}
            </Texte>
          ) : null}
        </HStack>
      ) : null}

      {extrait(offre.extrait ?? offre.description, 140) !== null ? (
        <Texte
          className="mt-3 text-footnote leading-5 text-muted-foreground"
          numberOfLines={3}
        >
          {extrait(offre.extrait ?? offre.description, 140)}
        </Texte>
      ) : null}

      {dansLIndex === false ? (
        <Texte className="mt-3 text-caption text-foreground-faint">
          {"Cette offre n'est plus en ligne. Ton dossier la garde."}
        </Texte>
      ) : null}

      {lien !== null ? (
        <Pressable
          onPress={onOuvrir}
          className="mt-3 min-h-touch flex-row items-center gap-1 self-start"
          accessibilityRole="link"
          accessibilityLabel={lien}
        >
          <Texte className="font-bold text-footnote text-primary">{lien}</Texte>
          <Icone nom="ouvrir" couleur={couleurs.primaire} taille={12} graisse="bold" />
        </Pressable>
      ) : null}
    </VStack>
  );
}
