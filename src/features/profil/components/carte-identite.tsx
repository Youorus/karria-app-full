/**
 * La carte d'identité du profil : qui est là.
 *
 * ═══ Ce qu'elle montre, et d'où ça vient ═══
 *
 * La photo du CV, ou des initiales sur un disque bleu ; le nom et le
 * métier visé s'ils sont dans le CV ; l'adresse e-mail toujours. Rien
 * n'est demandé à l'inscription (AGENTS.md §9) : cette carte se remplit
 * **avec** le CV, et le dit quand il manque — « complète ton CV pour
 * voir ton nom ici » plutôt qu'un champ à saisir.
 *
 * ═══ L'avatar ═══
 *
 * Un disque de 76 points, cerné d'un anneau bleu : c'est la seule
 * « personne » de l'écran, et l'anneau la pose comme l'orbe pose Karria.
 * Les initiales viennent du service, jamais vides.
 */

import { Image } from "expo-image";

import { Icone } from "@/components/icone";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Identite } from "../services/identite";

const TAILLE_AVATAR = 76;

function Avatar({ identite }: { identite: Identite }) {
  return (
    <Box className="rounded-full border-2 border-primary p-1">
      {identite.photo !== null ? (
        <Image
          source={{ uri: identite.photo }}
          // Taille et rayon en style : `expo-image` ne lit pas de classe.
          style={{
            width: TAILLE_AVATAR,
            height: TAILLE_AVATAR,
            borderRadius: TAILLE_AVATAR / 2,
          }}
          contentFit="cover"
          accessibilityLabel={`Photo de ${identite.nom}`}
        />
      ) : (
        <Box
          className="items-center justify-center rounded-full bg-primary"
          style={{ width: TAILLE_AVATAR, height: TAILLE_AVATAR }}
          accessibilityLabel={`Initiales ${identite.initiales}`}
        >
          <Texte className="font-display text-title-lg text-primary-foreground">
            {identite.initiales}
          </Texte>
        </Box>
      )}
    </Box>
  );
}

interface Props {
  /** `null` : on charge, la carte montre un squelette. */
  identite: Identite | null;
  email: string | null;
}

export function CarteIdentite({ identite, email }: Props) {
  const couleurs = useCouleurs();

  return (
    <HStack className="items-center gap-4 rounded-lg border border-border-subtle bg-card p-5">
      {identite === null ? (
        <Box
          className="rounded-full bg-remplissage"
          style={{ width: TAILLE_AVATAR + 12, height: TAILLE_AVATAR + 12 }}
        />
      ) : (
        <Avatar identite={identite} />
      )}
      <VStack className="flex-1 gap-1">
        {identite === null ? (
          <>
            <Box className="h-6 w-40 rounded-full bg-remplissage" />
            <Box className="h-4 w-24 rounded-full bg-remplissage-doux" />
          </>
        ) : (
          <>
            <Texte
              accessibilityRole="header"
              className="font-display text-title-sm tracking-tight text-foreground"
              numberOfLines={2}
            >
              {identite.nom}
            </Texte>
            {identite.titre !== null ? (
              <Box className="self-start rounded-pastille bg-surface-primary px-2.5 py-1">
                <Texte className="font-bold text-caption text-primary" numberOfLines={1}>
                  {identite.titre}
                </Texte>
              </Box>
            ) : (
              <Texte className="text-footnote text-foreground-faint">
                Ton nom et ton métier viendront de ton CV.
              </Texte>
            )}
          </>
        )}
        {email !== null ? (
          <HStack className="items-center gap-1.5 pt-1">
            <Icone nom="arobase" couleur={couleurs.estompe} taille={13} />
            <Texte
              className="flex-1 text-footnote text-muted-foreground"
              numberOfLines={1}
            >
              {email}
            </Texte>
          </HStack>
        ) : null}
      </VStack>
    </HStack>
  );
}
