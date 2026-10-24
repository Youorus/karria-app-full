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
 * ═══ Calme, au centre ═══
 *
 * Plus de cadre ni de pastille (2026-10-24, Marc : « minimaliste et très
 * chaleureux ») : la personne est posée au centre, sur le fond, avec de
 * l'air autour. Un disque de 84 points cerné d'un anneau caramel, les
 * initiales sur la crème du café ; le nom, le métier en texte simple,
 * l'adresse en retrait. Les initiales viennent du service, jamais vides.
 */

import { Image } from "expo-image";

import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";

import type { Identite } from "../services/identite";

const TAILLE_AVATAR = 84;

function Avatar({ identite }: { identite: Identite }) {
  return (
    <Box className="rounded-full border border-border-chaleur p-1.5">
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
          className="items-center justify-center rounded-full bg-surface-chaleur"
          style={{ width: TAILLE_AVATAR, height: TAILLE_AVATAR }}
          accessibilityLabel={`Initiales ${identite.initiales}`}
        >
          <Texte className="font-display text-title-lg text-chaleur">
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
  return (
    <VStack className="items-center gap-4 py-4">
      {identite === null ? (
        <Box
          className="rounded-full bg-remplissage-doux"
          style={{ width: TAILLE_AVATAR + 14, height: TAILLE_AVATAR + 14 }}
        />
      ) : (
        <Avatar identite={identite} />
      )}
      <VStack className="items-center gap-1">
        {identite === null ? (
          <>
            <Box className="h-6 w-40 rounded-full bg-remplissage-doux" />
            <Box className="h-4 w-28 rounded-full bg-remplissage-doux" />
          </>
        ) : (
          <>
            <Texte
              accessibilityRole="header"
              className="text-center font-display text-title-sm tracking-tight text-foreground"
              numberOfLines={2}
            >
              {identite.nom}
            </Texte>
            <Texte
              className="text-center text-body text-muted-foreground"
              numberOfLines={1}
            >
              {identite.titre ?? "Ton nom et ton métier viendront de ton CV."}
            </Texte>
          </>
        )}
        {email !== null ? (
          <Texte
            className="pt-1 text-center text-footnote text-foreground-faint"
            numberOfLines={1}
          >
            {email}
          </Texte>
        ) : null}
      </VStack>
    </VStack>
  );
}
