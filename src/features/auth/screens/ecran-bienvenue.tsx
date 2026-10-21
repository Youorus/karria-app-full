/**
 * L'accueil : la seule porte d'entrée de Karria.
 *
 * ═══ Ce qu'il doit faire en trois secondes ═══
 *
 * Dire ce qu'est Karria — une IA à qui l'on dit ce qu'on cherche — et
 * laisser entrer d'un geste. Pas de carrousel de présentation, pas de
 * formulaire : la présentation, c'est l'orbe qui respire au milieu de
 * l'écran, et l'IA se présentera elle-même une fois la porte passée.
 *
 * ═══ L'ordre des boutons, et la règle d'Apple ═══
 *
 * Apple exige que « Continuer avec Apple » soit une option **équivalente**
 * aux autres connexions tierces : même ton, même taille. Apple et Google
 * sont donc identiques, Apple en premier sur iOS où il est le geste
 * attendu. L'e-mail est le bouton principal — le seul en bleu plein
 * (AGENTS.md §7) — parce que c'est le seul chemin disponible partout.
 *
 * ═══ Le consentement ═══
 *
 * Une phrase sous les boutons, avec les deux liens. Continuer vaut
 * acceptation ; les versions partent avec la requête de connexion (voir
 * `services/consentements.ts`). Il n'y a pas de case à cocher : elle
 * ajouterait un geste à chaque inscription sans rien prouver de plus.
 */

import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aura } from "@/components/aura";
import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { LogoKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { Orbe } from "@/components/orbe";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import { LogoApple, LogoGoogle } from "../components/logos-fournisseurs";
import { useAccueil } from "../hooks/use-accueil";

function Separateur() {
  return (
    <HStack space="md" className="items-center py-1">
      <Box className="h-px flex-1 bg-border-subtle" />
      <Texte className="font-medium text-caption text-muted-foreground">OU</Texte>
      <Box className="h-px flex-1 bg-border-subtle" />
    </HStack>
  );
}

export function EcranBienvenue() {
  const couleurs = useCouleurs();
  const reduit = useReducedMotion();
  const {
    enCours,
    erreur,
    connecter,
    appleDisponible,
    effacerErreur,
    continuerParEmail,
    lire,
    adieu,
  } = useAccueil();

  return (
    // `flex: 1` en style : le conteneur racine d'un écran, seule exception
    // admise à la règle §3.2.
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura assise />
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <VStack className="flex-1 px-5 pb-3">
          <HStack className="justify-center pt-3">
            <LogoKarria hauteur={26} />
          </HStack>

          {/* Le vide autour de l'orbe cède sur un petit téléphone, jamais
              les boutons : c'est lui qui prend `flex-1`. */}
          <VStack space="lg" className="flex-1 items-center justify-center">
            <Orbe taille={112} />
            <VStack space="sm" className="items-center">
              <Texte
                accessibilityRole="header"
                className="text-center font-display text-title-lg text-foreground"
              >
                {"Dis-moi ce que tu cherches.\n"}
                <Texte className="font-display text-title-lg text-primary">
                  Je trouve le job.
                </Texte>
              </Texte>
              <Texte className="px-4 text-center text-body text-muted-foreground">
                Chaque jour, Karria lit des milliers d&apos;offres et ne te garde que les
                tiennes.
              </Texte>
            </VStack>
            {adieu ? (
              <Animated.View
                entering={reduit ? undefined : FadeInDown.duration(500)}
                className="mb-2 self-stretch"
              >
                <HStack className="items-center gap-2.5 rounded-md border border-border-subtle bg-card px-4 py-2.5">
                  <Icone nom="main" couleur={couleurs.primaire} taille={16} />
                  <Texte
                    className="flex-1 text-footnote text-foreground"
                    // Annoncé dès l'arrivée : c'est la seule trace de ce qui
                    // vient de se passer.
                    accessibilityRole="alert"
                  >
                    Ton compte est supprimé. Merci d&apos;avoir essayé Karria, et bonne
                    route.
                  </Texte>
                </HStack>
              </Animated.View>
            ) : null}
          </VStack>

          <VStack space="sm">
            {appleDisponible ? (
              <BoutonAction
                libelle="Continuer avec Apple"
                ton="secondaire"
                icone={<LogoApple couleur={couleurs.texte} />}
                enCours={enCours === "apple"}
                libelleEnCours="Connexion…"
                desactive={enCours !== null}
                onPress={() => void connecter("apple")}
              />
            ) : null}
            <BoutonAction
              libelle="Continuer avec Google"
              ton="secondaire"
              icone={<LogoGoogle />}
              enCours={enCours === "google"}
              libelleEnCours="Connexion…"
              desactive={enCours !== null}
              onPress={() => void connecter("google")}
            />
            {erreur !== null ? (
              <MessageErreur
                message={erreur}
                action={effacerErreur}
                libelleAction="Compris"
              />
            ) : null}
            <Separateur />
            <BoutonAction
              libelle="Continuer avec un e-mail"
              ton="principal"
              desactive={enCours !== null}
              onPress={continuerParEmail}
            />
            <Texte className="px-2 pt-2 text-center text-caption text-muted-foreground">
              En continuant, tu acceptes les{" "}
              <Texte
                className="font-bold text-caption text-foreground underline"
                accessibilityRole="link"
                onPress={() => lire("conditions")}
              >
                conditions d&apos;utilisation
              </Texte>{" "}
              et la{" "}
              <Texte
                className="font-bold text-caption text-foreground underline"
                accessibilityRole="link"
                onPress={() => lire("confidentialite")}
              >
                politique de confidentialité
              </Texte>
              .
            </Texte>
          </VStack>
        </VStack>
      </SafeAreaView>
    </Box>
  );
}
