/**
 * L'espace de l'application : les onglets, et ce qui s'ouvre par-dessus —
 * pour une personne connectée **ou un invité**.
 *
 * ═══ Plus de garde à l'entrée ═══
 *
 * Les offres ne sont pas un contenu de compte (App Store 5.1.1 v) : ce
 * groupe se monte sans session. Ce qui demande un compte — garder, parler à
 * Karria, le CV, le profil — s'en charge au geste, par la porte
 * (`features/auth/hooks/use-porte.ts`) : l'invitation à se connecter monte
 * par-dessus, et l'écran reprend son geste une fois la session ouverte. Ne
 * pas démonter ce groupe à la connexion est ce qui rend la reprise possible.
 *
 * Ce qui ne doit tourner **qu'une fois connecté** — l'enregistrement de
 * l'appareil, la lecture des droits — vit dans `GardeAppareil`, monté sur la
 * session seulement.
 *
 * ═══ Deux feuilles, montées une fois ═══
 *
 * L'invitation à se connecter et la feuille de consentement à l'IA : des
 * `Modal` globaux, ouverts par un store depuis n'importe quel hook.
 *
 * ═══ Le détail d'une offre ═══
 *
 * Empilé **au-dessus** des onglets — la barre disparaît, le détail occupe
 * tout l'écran, le retour ramène au fil. Sur Android et sur les iOS
 * antérieurs à 18, il monte en fondu (`fade_from_bottom`, celui de la
 * V1) ; sur iOS 18+, la carte touchée s'y déplie (zoom natif, posé par la
 * carte elle-même). Le modèle fait exception sur Android : fondu simple,
 * sous le zoom Reanimated de sa vignette.
 */

import { Platform } from "react-native";
import { Stack } from "expo-router";

import { FeuilleConsentementIa } from "@/features/auth/components/feuille-consentement-ia";
import { InvitationConnexion } from "@/features/auth/components/invitation-connexion";
import { useSession } from "@/features/auth/hooks/use-session";
import { useAppareilConnecte } from "@/features/notifications/hooks/use-appareil-connecte";
import { useDroitsConnectes } from "@/features/soutien/hooks/use-droits-connectes";
import { FOND } from "@/theme";
import { useTheme } from "@/theme/preference";

export default function LayoutApp() {
  const { etat } = useSession();
  const { mode } = useTheme();

  return (
    <>
      {etat === "connecte" ? <GardeAppareil /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: FOND[mode] },
        }}
      >
        <Stack.Screen name="(onglets)" />
        {/* La question des notifications : une parenthèse en fondu, qu'un
            glissement ne doit pas fermer avant qu'on ait répondu. */}
        <Stack.Screen
          name="notifications"
          options={{ animation: "fade", animationDuration: 320, gestureEnabled: false }}
        />
        {/* Les deux détails montent de la même façon : un détail se lit et
            se quitte pareil, quel que soit l'onglet d'où l'on vient. */}
        <Stack.Screen
          name="offre/[id]"
          options={{ animation: "fade_from_bottom", animationDuration: 240 }}
        />
        {/* Le modèle, lui, s'ouvre en fondu simple sur Android : le zoom
            Reanimated de la vignette (`use-ouverture-modele.ts`) porte le
            mouvement, un glissement vertical le contredirait. Sur iOS, le
            zoom natif remplace de toute façon l'animation de la pile. */}
        <Stack.Screen
          name="modele/[id]"
          options={{
            animation: Platform.OS === "android" ? "fade" : "fade_from_bottom",
            animationDuration: 240,
          }}
        />
        {/* La création du CV ne « s'empile » pas comme un détail : Karria
            prend tout l'écran, en fondu, et on ne la quitte pas d'un
            glissement involontaire au milieu d'une réponse. */}
        <Stack.Screen
          name="cv/creer"
          options={{ animation: "fade", animationDuration: 320, gestureEnabled: false }}
        />
        {/* Les paramètres s'empilent comme un détail : on y va, on revient.
            La suppression monte en fondu depuis le bas, comme une feuille
            qu'on ouvre — et le geste de retour reste permis : on doit
            pouvoir y renoncer d'un glissement. */}
        <Stack.Screen name="parametres" />
        <Stack.Screen
          name="compte/supprimer"
          options={{ animation: "fade_from_bottom", animationDuration: 280 }}
        />
        {/* Le retour de Stripe, quand le lien arrive hors de la session du
            navigateur (page ouverte dans Safari) : il renvoie au profil. */}
        <Stack.Screen name="paiement/retour" options={{ animation: "none" }} />
      </Stack>
      <InvitationConnexion />
      <FeuilleConsentementIa />
    </>
  );
}

/**
 * L'appareil s'enregistre et les droits (sans pub) se lisent, tant qu'une
 * session existe. Un composant sans rendu plutôt que des hooks appelés
 * dans la mise en page : ils ne doivent tourner **qu'une fois connecté**,
 * et un hook ne se monte pas sous condition.
 */
function GardeAppareil() {
  useAppareilConnecte();
  useDroitsConnectes();
  return null;
}
