/**
 * Une offre du fil — la carte de la V1 (`job-offer-card.tsx`).
 *
 * ═══ L'anatomie de la V1, à l'identique ═══
 *
 * 1. La tuile de l'entreprise (54, rayon 18) — logo, ou initiales sur une
 *    teinte qui tourne de l'angle d'or d'une carte à l'autre —, le nom de
 *    l'entreprise en capitales espacées, « Nouvelle » et le point bleu des
 *    offres jamais ouvertes, le titre sur deux lignes, et le signet.
 * 2. Le lieu, et le temps écoulé à droite. Trié « Plus proches », le
 *    lieu dit aussi sa distance : « Persan · à 6 km ».
 * 3. Les pastilles : « Très alignée » / « À explorer », le contrat, le
 *    télétravail quand l'annonce le dit, le salaire en vert sur vert pâle.
 * 4. En mode recherche, ce que l'offre confirme de la demande
 *    (« CDI · Lyon · 4 km ») : la raison d'être là, en une ligne.
 *
 * Le liseré bleu signale une offre dont le détail n'a jamais été ouvert ;
 * il disparaît à la première ouverture.
 *
 */

import { memo } from "react";
import { Pressable } from "react-native";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { SALAIRE } from "@/theme";
import { useCouleurs } from "@/theme/use-couleurs";

import { contratCourt, ilYa, salaireLisible } from "../services/presentation";
import { TuileEntreprise } from "./tuile-entreprise";
import type { Offre } from "../types/offres.types";

interface Props {
  offre: Offre;
  rang: number;
  /** « à 12 km » : en tri « Plus proches » seulement. */
  distance?: string | null;
  maintenant: Date;
  onOuvrir: (offre: Offre) => void;
  onGarder: (offre: Offre) => void;
}

function Pastille({
  icone,
  libelle,
  libelleComplet,
  fond,
  texte,
}: {
  icone?: React.ReactNode;
  libelle: string;
  /** Ce que lit le lecteur d'écran quand la pastille est abrégée. */
  libelleComplet?: string;
  fond: string;
  texte: string;
}) {
  return (
    <HStack space="xs" className={`items-center rounded-pastille px-2 py-1 ${fond}`}>
      {icone}
      <Texte
        className={`font-bold text-caption ${texte}`}
        numberOfLines={1}
        accessibilityLabel={libelleComplet}
      >
        {libelle}
      </Texte>
    </HStack>
  );
}

export const CarteOffre = memo(function CarteOffre({
  offre,
  rang,
  distance = null,
  maintenant,
  onOuvrir,
  onGarder,
}: Props) {
  const couleurs = useCouleurs();
  const salaire = salaireLisible(offre.salaire);
  const temps = ilYa(offre.publieeLe, maintenant);

  return (
    <Pressable
      onPress={() => onOuvrir(offre)}
      className="active:opacity-90"
      accessibilityRole="button"
      accessibilityLabel={`${offre.titre}${offre.entreprise ? `, ${offre.entreprise}` : ""}`}
      accessibilityHint="Ouvre le détail de l'offre"
    >
      <VStack
        className={`rounded-carte border bg-card p-4 ${
          offre.nonOuverte ? "border-primary" : "border-border-subtle"
        }`}
      >
        {/* 1. L'entreprise, le titre, le signet */}
        <HStack space="md" className="items-center">
          <TuileEntreprise
            logo={offre.logo}
            entreprise={offre.entreprise}
            teinte={rang}
            taille="carte"
            cle={offre.id}
          />
          <VStack className="flex-1">
            <HStack space="xs" className="items-center">
              <Texte
                className="shrink font-medium text-caption uppercase tracking-widest text-muted-foreground"
                numberOfLines={1}
              >
                {offre.entreprise ?? "Entreprise"}
              </Texte>

              {offre.nonOuverte ? (
                <Box className="h-1.5 w-1.5 rounded-full bg-primary" />
              ) : null}
            </HStack>
            <Texte className="font-bold text-body text-foreground" numberOfLines={2}>
              {offre.titre}
            </Texte>
          </VStack>
          <Pressable
            onPress={() => onGarder(offre)}
            hitSlop={10}
            className="p-1"
            accessibilityRole="button"
            accessibilityLabel={
              offre.enregistree ? "Retirer de mes offres" : "Garder l'offre"
            }
            accessibilityState={{ selected: offre.enregistree }}
          >
            <Icone
              nom={offre.enregistree ? "signetPlein" : "signet"}
              couleur={offre.enregistree ? couleurs.primaire : couleurs.estompe}
              taille={20}
            />
          </Pressable>
        </HStack>

        {/* 2. Le lieu et le temps */}
        <HStack className="mt-3 items-center justify-between">
          <HStack space="xs" className="flex-1 items-center">
            <Icone nom="lieu" couleur={couleurs.estompe} taille={12} />
            <Texte
              className="shrink text-footnote text-muted-foreground"
              numberOfLines={1}
            >
              {offre.lieu ?? "Lieu non précisé"}
            </Texte>
            {/* La distance ne se coupe jamais : c'est elle qu'on a demandée. */}
            {distance !== null ? (
              <Texte className="text-footnote text-muted-foreground" numberOfLines={1}>
                · {distance}
              </Texte>
            ) : null}
          </HStack>
          <Texte className="text-footnote text-foreground-faint">{temps}</Texte>
        </HStack>

        {/* 3. Les pastilles */}
        <HStack className="mt-3 flex-wrap gap-2">
          {offre.qualite === "haute" ? (
            <Pastille libelle="Très alignée" fond="bg-success" texte="text-on-scrim" />
          ) : offre.qualite === "basse" ? (
            <Pastille
              libelle="À explorer"
              fond="bg-foreground-faint"
              texte="text-on-scrim"
            />
          ) : null}
          {offre.contrat !== null ? (
            <Pastille
              icone={<Icone nom="contrat" couleur={couleurs.estompe} taille={12} />}
              libelle={contratCourt(offre.contrat)}
              libelleComplet={offre.contrat}
              fond="bg-remplissage"
              texte="text-muted-foreground"
            />
          ) : null}
          {offre.teletravail !== null && offre.teletravail !== "sur site" ? (
            <Pastille
              icone={<Icone nom="appareil" couleur={couleurs.estompe} taille={12} />}
              libelle={offre.teletravail}
              fond="bg-remplissage"
              texte="text-muted-foreground"
            />
          ) : null}
          {salaire !== null ? (
            <Pastille
              icone={<Icone nom="salaire" couleur={SALAIRE} taille={12} />}
              libelle={salaire}
              fond="bg-salaire"
              texte="text-salaire-foreground"
            />
          ) : null}
        </HStack>

        {/* 4. Pourquoi elle est là */}
        {offre.raisons.length > 0 ? (
          <Texte className="mt-2 text-caption text-primary" numberOfLines={1}>
            {offre.raisons.join(" · ")}
          </Texte>
        ) : null}
      </VStack>
    </Pressable>
  );
});
