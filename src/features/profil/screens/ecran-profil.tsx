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
 * ═══ Sans compte ═══
 *
 * L'invitation prend la place des cartes : l'orbe, « Ton espace t'attend »,
 * ce qu'un compte apporte, et « Se connecter ». La roue des paramètres
 * reste : l'apparence et les documents ne demandent pas de compte.
 *
 * ═══ « Parler à l'équipe » ═══
 *
 * Une capsule qui flotte au-dessus du contenu, à droite, juste au-dessus
 * de la barre d'onglets (`features/equipe`) — invité compris : le toucher
 * ouvre alors la porte de connexion. Un point discret dit qu'une réponse
 * attend. Le défilement réserve sa hauteur (`pb-56`) pour que la dernière
 * carte ne finisse pas dessous.
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
import { BoutonParlerEquipe } from "@/features/equipe/components/bouton-parler-equipe";
import { CarteSoutien } from "@/features/soutien/components/carte-soutien";
import { useCouleurs } from "@/theme/use-couleurs";

import { CarteCv } from "../components/carte-cv";
import { CarteIdentite } from "../components/carte-identite";
import { ProfilInvite } from "../components/profil-invite";
import { useProfil } from "../hooks/use-profil";

export function EcranProfil() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const {
    invite,
    seConnecter,
    identite,
    email,
    cv,
    soutien,
    ouvrirParametres,
    ouvrirCv,
    equipe,
  } = useProfil();

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
        {invite ? (
          <ProfilInvite onSeConnecter={seConnecter} />
        ) : (
          <ScrollView
            contentContainerClassName="gap-8 px-6 pb-56 pt-2"
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
        )}
      </SafeAreaView>
      <BoutonParlerEquipe nonLu={equipe.nonLu} onPress={equipe.ouvrir} />
    </Box>
  );
}
