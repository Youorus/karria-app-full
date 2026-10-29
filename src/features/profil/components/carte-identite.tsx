/**
 * La carte d'identité du profil : qui est là.
 *
 * ═══ Ce qu'elle montre, et d'où ça vient ═══
 *
 * La photo du CV, ou des initiales sur la crème du café ; le nom tiré du
 * CV, et dessous le pseudonyme (la partie locale de l'adresse) ou, à
 * défaut, le métier visé. Rien n'est demandé à l'inscription (AGENTS.md
 * §9) : cette carte se remplit **avec** le CV.
 *
 * ═══ En ligne, compacte ═══
 *
 * Redessinée par Marc (2026-10-29) : l'avatar (72 points, anneau caramel)
 * à gauche, le nom et le pseudonyme à droite — la carte prend moins de
 * hauteur et laisse la place au soutien, dessous.
 */

import { Image } from "expo-image";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";

import type { Identite } from "../services/identite";

const TAILLE_AVATAR = 72;

function Avatar({ identite }: { identite: Identite }) {
  return (
    <Box className="rounded-full border border-border-chaleur p-1">
      {identite.photo !== null ? (
        <Image
          source={{ uri: identite.photo }}
          style={{
            width: TAILLE_AVATAR,
            height: TAILLE_AVATAR,
            borderRadius: TAILLE_AVATAR / 2,
          }}
          contentFit="cover"
          accessibilityLabel={"Photo de " + identite.nom}
        />
      ) : (
        <Box
          className="items-center justify-center rounded-full bg-surface-chaleur"
          style={{ width: TAILLE_AVATAR, height: TAILLE_AVATAR }}
          accessibilityLabel={"Initiales " + identite.initiales}
        >
          <Texte className="font-display text-title-md text-chaleur font-bold">
            {identite.initiales}
          </Texte>
        </Box>
      )}
    </Box>
  );
}

interface Props {
  identite: Identite | null;
  email: string | null;
}

export function CarteIdentite({ identite, email }: Props) {
  return (
    <HStack space="md" className="items-center justify-between py-1">
      {identite === null ? (
        <Box
          className="rounded-full bg-remplissage-doux"
          style={{ width: TAILLE_AVATAR + 8, height: TAILLE_AVATAR + 8 }}
        />
      ) : (
        <Avatar identite={identite} />
      )}

      <VStack className="flex-1 px-1">
        {identite === null ? (
          <>
            <Box className="h-6 w-36 rounded-full bg-remplissage-doux" />
            <Box className="h-4 w-24 rounded-full bg-remplissage-doux mt-1" />
          </>
        ) : (
          <>
            <Texte
              accessibilityRole="header"
              className="font-display text-title-sm text-foreground font-bold"
              numberOfLines={1}
            >
              {identite.nom}
            </Texte>
            <Texte className="text-body text-muted-foreground pt-0.5" numberOfLines={1}>
              {email ? "@" + email.split("@")[0] : (identite.titre ?? "Ton métier visé")}
            </Texte>
          </>
        )}
      </VStack>
    </HStack>
  );
}
