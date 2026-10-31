/**
 * La feuille de connexion : les trois portes, le consentement — et, pour un
 * invité, ce qu'un compte lui apporte.
 *
 * ═══ Un seul composant pour deux endroits ═══
 *
 * L'accueil l'ouvre sur « Commencer » ; le mode invité l'ouvre sur un
 * geste qui demande un compte (garder, Karria, CV…). Écrite deux fois,
 * elle divergerait au premier ajustement de ton — et c'est l'invité qui
 * lirait la version périmée. Ici la feuille est la même ; seul l'en-tête
 * change : un titre neutre pour l'accueil, le gain pour l'invité.
 *
 * ═══ L'ordre des boutons, et la règle d'Apple ═══
 *
 * Apple exige que « Continuer avec Apple » soit une option **équivalente**
 * aux autres connexions tierces : même ton, même taille. L'e-mail est le
 * bouton principal — le seul en bleu plein — parce que c'est le seul chemin
 * disponible partout.
 *
 * Le consentement aux conditions tient dans une phrase, avec les deux liens :
 * continuer vaut acceptation (voir `services/consentements.ts`).
 */

import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BoutonAction } from "@/components/bouton-action";
import { Icone } from "@/components/icone";
import { SymboleKarria } from "@/components/marque";
import { MessageErreur } from "@/components/message-erreur";
import { OrbeVivante } from "@/components/orbe-vivante";
import { Texte } from "@/components/texte";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { useCouleurs } from "@/theme/use-couleurs";

import type { Document } from "../services/documents";
import { GAINS } from "../services/porte";
import { LogoApple, LogoGoogle } from "./logos-fournisseurs";
import type { ConnexionSociale } from "../hooks/use-connexion-sociale";

interface Props extends ConnexionSociale {
  titre: string;
  /** La phrase sous le titre : neutre à l'accueil, le gain pour un invité. */
  phrase: string;
  /** Vrai pour un invité : l'orbe et la liste de ce qu'un compte apporte. */
  invitation?: boolean;
  continuerParEmail: () => void;
  lire: (document: Document) => void;
  onFermer: () => void;
  /** Le second bouton d'un invité : « Pas maintenant ». */
  onPlusTard?: () => void;
}

export function FeuilleConnexion({
  titre,
  phrase,
  invitation = false,
  enCours,
  erreur,
  connecter,
  appleDisponible,
  effacerErreur,
  continuerParEmail,
  lire,
  onFermer,
  onPlusTard,
}: Props) {
  const couleurs = useCouleurs();

  return (
    <View className="rounded-t-[32px] border-t border-border-subtle bg-card p-6 pb-8">
      <SafeAreaView edges={["bottom"]}>
        <VStack space="md">
          <HStack className="items-center justify-between pb-1">
            <Box className="w-8" />
            {invitation ? (
              <OrbeVivante taille={56}>
                <SymboleKarria taille={22} teinte="reflet" />
              </OrbeVivante>
            ) : (
              <Texte className="text-center font-display text-title-sm text-foreground">
                {titre}
              </Texte>
            )}
            <Pressable
              onPress={onFermer}
              className="h-8 w-8 items-center justify-center rounded-full bg-remplissage active:opacity-70"
              accessibilityLabel="Fermer"
              accessibilityRole="button"
            >
              <Icone nom="fermer" couleur={couleurs.estompe} taille={14} graisse="bold" />
            </Pressable>
          </HStack>

          {invitation ? (
            <Texte
              accessibilityRole="header"
              className="text-center font-display text-title-sm text-foreground"
            >
              {titre}
            </Texte>
          ) : null}

          <Texte className="px-4 text-center text-footnote text-muted-foreground">
            {phrase}
          </Texte>

          {invitation ? (
            <VStack className="gap-2.5 rounded-lg border border-border-subtle bg-background px-4 py-3">
              {GAINS.map((gain, i) => (
                <Texte
                  key={gain}
                  className={`text-footnote text-foreground ${i > 0 ? "border-t border-border-subtle pt-2.5" : ""}`}
                >
                  {gain}
                </Texte>
              ))}
            </VStack>
          ) : null}

          {erreur !== null ? (
            <MessageErreur
              message={erreur}
              action={effacerErreur}
              libelleAction="Compris"
            />
          ) : null}

          <VStack space="sm" className="pt-1">
            <BoutonAction
              libelle="Continuer avec un e-mail"
              ton="principal"
              desactive={enCours !== null}
              onPress={continuerParEmail}
            />
            <BoutonAction
              libelle="Continuer avec Google"
              ton="secondaire"
              icone={<LogoGoogle />}
              enCours={enCours === "google"}
              libelleEnCours="Connexion…"
              desactive={enCours !== null}
              onPress={() => void connecter("google")}
            />
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
            {onPlusTard !== undefined ? (
              <BoutonAction
                libelle="Pas maintenant"
                ton="discret"
                desactive={enCours !== null}
                onPress={onPlusTard}
              />
            ) : null}
          </VStack>

          <VStack space="xs" className="items-center pt-1">
            <Texte className="px-2 text-center text-caption text-muted-foreground">
              En continuant, tu acceptes nos{" "}
              <Texte
                className="font-bold text-caption text-foreground underline"
                accessibilityRole="link"
                onPress={() => lire("conditions")}
              >
                Conditions Générales
              </Texte>{" "}
              et notre{" "}
              <Texte
                className="font-bold text-caption text-foreground underline"
                accessibilityRole="link"
                onPress={() => lire("confidentialite")}
              >
                Politique de Confidentialité
              </Texte>
              .
            </Texte>
          </VStack>
        </VStack>
      </SafeAreaView>
    </View>
  );
}
