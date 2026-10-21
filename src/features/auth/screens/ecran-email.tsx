/**
 * La saisie de l'adresse e-mail.
 *
 * ═══ Ce que cet écran ne fait pas ═══
 *
 * Il ne valide pas, n'appelle pas le réseau, ne décide pas de la suite.
 * Tout cela vit dans `useParcours()`. Ici : de la vue, et un seul hook.
 *
 * ═══ Le retour est celui du système ═══
 *
 * Aucun bouton dessiné. Le geste de retour d'iOS, la touche retour
 * d'Android et la flèche de la barre de navigation fonctionnent déjà —
 * `Stack` les fournit. Les redessiner, c'est se condamner à les
 * ré-adapter à chaque version des deux systèmes, pour un résultat qui
 * détonnera toujours un peu.
 *
 * ═══ Pourquoi le clavier remonte l'écran ═══
 *
 * Sans `KeyboardAvoidingView`, le clavier recouvre le bouton sur les petits
 * écrans : on tape son adresse et il n'y a plus rien à toucher.
 *
 * ═══ « Continuer », et non « Recevoir mon code » ═══
 *
 * Le second décrivait le mécanisme ; il annonçait un envoi avant qu'on
 * sache s'il y en aurait un. Le premier décrit ce que fait le geste — et
 * ce qui va arriver est déjà écrit deux lignes plus haut, sous le titre.
 */

import { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Svg, { Path } from "react-native-svg";

import { Aura } from "@/components/aura";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { BoutonAction } from "@/components/bouton-action";
import { ChampTexte } from "@/components/champ-texte";
import { MessageErreur } from "@/components/message-erreur";
import { PiedAction } from "@/components/pied-action";
import { Texte } from "@/components/texte";
import { TitreAccentue } from "@/components/titre-accentue";
import { useCouleurs } from "@/theme/use-couleurs";

import { useParcours } from "../hooks/parcours-connexion";
import { useNavigationUnique } from "@/lib/navigation";

function Enveloppe({ couleur }: { couleur: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.4 6.2h17.2v11.6H3.4V6.2Z"
        stroke={couleur}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="m4.1 6.9 7.9 5.7 7.9-5.7"
        stroke={couleur}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Cadenas({ couleur }: { couleur: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6.4 10.4h11.2v9.2H6.4v-9.2ZM8.6 10.4V7.6a3.4 3.4 0 0 1 6.8 0v2.8"
        stroke={couleur}
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EcranEmail() {
  const { pousser } = useNavigationUnique();
  const couleurs = useCouleurs();
  const { demanderCode, enCours, erreur, effacerErreur } = useParcours();
  const [email, setEmail] = useState("");

  async function envoyer() {
    if (await demanderCode(email)) {
      pousser("/code");
    }
  }

  return (
    <Box style={{ flex: 1 }} className="bg-background">
      <Aura />
      {/* `top` aussi : l'en-tête est transparent pour laisser voir l'aura,
          il ne réserve donc plus sa hauteur. */}
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <VStack className="flex-1 px-5">
            <VStack space="xl" className="pt-14">
              <VStack space="sm">
                <TitreAccentue
                  avant={"Ton adresse\n"}
                  accent="e-mail"
                  apres=", et c'est parti."
                  taille="hero"
                />
                <Texte className="text-body text-muted-foreground">
                  Je t&apos;envoie un code pour entrer. Pas de mot de passe à retenir.
                </Texte>
              </VStack>

              <ChampTexte
                libelle="Adresse e-mail"
                icone={Enveloppe}
                value={email}
                onChangeText={(saisie) => {
                  setEmail(saisie);
                  // L'erreur disparaît dès la première correction : la
                  // laisser afficher pendant qu'on corrige donne
                  // l'impression que la correction ne sert à rien.
                  if (erreur !== null) effacerErreur();
                }}
                erreur={erreur?.champ === "email" ? erreur.message : undefined}
                placeholder="toi@exemple.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                // Le clavier affiche « Suivant » et déclenche l'envoi :
                // un pouce n'a pas à redescendre chercher le bouton.
                returnKeyType="go"
                onSubmitEditing={() => void envoyer()}
                editable={!enCours}
                autoFocus
              />

              {erreur !== null && erreur.champ !== "email" ? (
                <MessageErreur
                  message={erreur.message}
                  action={erreur.retentable ? () => void envoyer() : undefined}
                  libelleAction={erreur.retentable ? "Réessayer" : undefined}
                />
              ) : null}
            </VStack>
          </VStack>

          <PiedAction>
            <BoutonAction
              libelle="Continuer"
              libelleEnCours="Envoi…"
              enCours={enCours}
              desactive={email.length === 0}
              onPress={() => void envoyer()}
            />
            {/* La mention de sécurité n'est qu'ici : c'est la seule donnée
                qu'on confie à Karria pour entrer. Répétée ailleurs, elle
                cesserait d'être lue. */}
            <HStack space="xs" className="items-center justify-center">
              <Cadenas couleur={couleurs.estompe} />
              <Texte className="text-caption text-muted-foreground">
                Ton adresse sert seulement à te connecter.
              </Texte>
            </HStack>
          </PiedAction>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Box>
  );
}
