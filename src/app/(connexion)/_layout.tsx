/**
 * Le groupe de routes du parcours de connexion par e-mail.
 *
 * ═══ Pourquoi ce groupe existe ═══
 *
 * L'adresse et le code sont deux écrans d'**un seul** parcours : le
 * second a besoin de l'identifiant obtenu par le premier. Le fournisseur
 * monté ici naît quand on entre dans le parcours et meurt quand on en
 * sort — sa durée de vie est exactement celle du parcours.
 *
 * ═══ L'en-tête est transparent ═══
 *
 * L'aura passe derrière : un bandeau opaque en haut d'écran couperait
 * l'immersion net. Seul reste le bouton de retour, qui a sa propre
 * surface ; le geste natif — glisser depuis le bord — fonctionne
 * toujours. Pas de titre dans la barre : chaque écran porte le sien, en
 * grand, juste en dessous.
 */

import { Stack } from "expo-router";

import { optionsEntete } from "@/components/entete";
import { FournisseurDeParcours } from "@/features/auth/hooks/parcours-connexion";
import { useTheme } from "@/theme/preference";

export default function LayoutConnexion() {
  const { mode } = useTheme();

  return (
    <FournisseurDeParcours>
      <Stack
        screenOptions={{
          headerShown: true,
          ...optionsEntete(mode),
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          title: "",
        }}
      >
        <Stack.Screen name="email" />
        <Stack.Screen name="code" />
      </Stack>
    </FournisseurDeParcours>
  );
}
