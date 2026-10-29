/**
 * Le profil — l'onglet « Profil » de la V1, recentré sur la personne.
 *
 * ═══ Ce qu'il contient, et ce qu'il ne contient plus ═══
 *
 * Trois blocs, du plus intime au plus lointain, avec beaucoup d'air
 * entre eux : qui je suis, mon CV (une ligne), un mot de l'équipe et ses
 * deux façons d'aider — sans pub, ou un café (`features/soutien`).
 * Minimaliste et chaleureux, à la demande de Marc (2026-10-24) : une
 * seule touche de couleur chaude, sur la même aura que les autres
 * onglets — le fond fait l'unité de l'application. L'apparence, les notifications, la
 * déconnexion et la suppression sont derrière la roue, dans les
 * paramètres : ce sont des réglages de l'application, pas des faits sur
 * la personne.
 *
 * ═══ L'entrée ═══
 *
 * Les cartes montent l'une après l'autre, 70 ms d'écart — le même rythme
 * que le détail d'une offre ou d'un modèle. Mouvement réduit : tout est
 * là d'un coup.
 */

import { ScrollView } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonEnTeteRond, EnTeteKarria } from "@/components/en-tete-karria";
import { Icone } from "@/components/icone";
import { Box } from "@/components/ui/box";
import { CarteSoutien } from "@/features/soutien/components/carte-soutien";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteCv } from "../components/carte-cv";
import { CarteIdentite } from "../components/carte-identite";
import { useProfil } from "../hooks/use-profil";

export function EcranProfil() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const { identite, email, cv, soutien, ouvrirParametres, ouvrirCv } = useProfil();

  const entree = (rang: number) =>
    reduit ? undefined : FadeInDown.duration(380).delay(80 + rang * 70);

  return (
    // `flex: 1` en style : le conteneur racine d'un écran, seule exception
    // admise à la règle §3.2.
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <EnTeteKarria
          titre="Mon profil"
          droite={
            <BoutonEnTeteRond onPress={ouvrirParametres} libelle="Ouvrir les paramètres">
              <Icone nom="reglages" couleur={couleurs.texte} taille={20} />
            </BoutonEnTeteRond>
          }
        />
        <ScrollView
          contentContainerClassName="gap-8 px-6 pb-36 pt-2"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={entree(0)}>
            <CarteIdentite identite={identite} email={email} />
          </Animated.View>

          <Animated.View entering={entree(1)}>
            <CarteCv cv={cv} onPress={ouvrirCv} />
          </Animated.View>

          <Animated.View entering={entree(2)}>
            <CarteSoutien soutien={soutien} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </Box>
  );
}
